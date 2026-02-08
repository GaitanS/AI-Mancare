import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { spawn } from 'child_process';
import path from 'path';

// Track running processes globally
const runningProcesses = new Map<string, number>(); // runId -> pid

// POST /api/admin/queue/process - Process next item in queue
export async function POST(request: NextRequest) {
  try {
    // Check if any process is currently running
    const running = await prisma.processRun.findFirst({
      where: { status: 'running' },
    });

    if (running) {
      return NextResponse.json({
        success: false,
        message: 'A process is already running',
        runId: running.id,
      });
    }

    // Get next queued process
    const nextRun = await prisma.processRun.findFirst({
      where: { status: 'queued' },
      include: {
        process: true,
      },
      orderBy: { queuedAt: 'asc' },
    });

    if (!nextRun) {
      return NextResponse.json({
        success: false,
        message: 'No processes in queue',
      });
    }

    // Start the process asynchronously
    startProcess(nextRun);

    return NextResponse.json({
      success: true,
      message: `Started: ${nextRun.process.name}`,
      runId: nextRun.id,
    });
  } catch (error) {
    console.error('Error processing queue:', error);
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}

async function startProcess(run: {
  id: string;
  processId: string;
  process: {
    id: string;
    name: string;
    script: string;
    config: string | null;
  };
}) {
  const { id: runId, process: processConfig } = run;

  console.log(`[Queue] Starting process: ${processConfig.name}`);

  try {
    // Update status to running
    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Determine script path
    const scriptPath = path.resolve(process.cwd(), processConfig.script);

    // Determine command based on file extension
    let command: string;
    let args: string[];

    // Quote the script path for Windows shell execution (handles paths with spaces)
    const quotedScriptPath = process.platform === 'win32' ? `"${scriptPath}"` : scriptPath;

    if (scriptPath.endsWith('.js')) {
      command = 'node';
      args = [quotedScriptPath];
    } else if (scriptPath.endsWith('.ts')) {
      command = 'npx';
      args = ['tsx', quotedScriptPath];
    } else {
      throw new Error(`Unsupported script type: ${scriptPath}`);
    }

    // Environment variables for the script
    const env = {
      ...process.env,
      PROCESS_RUN_ID: runId,
      PROCESS_CONFIG: processConfig.config || '{}',
    };

    // Spawn the process
    const childProcess = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      detached: false,
    });

    // Save PID
    if (childProcess.pid) {
      runningProcesses.set(runId, childProcess.pid);
      await prisma.processRun.update({
        where: { id: runId },
        data: { pid: childProcess.pid },
      });
    }

    // Collect output
    let logs = '';
    let lastLogUpdate = Date.now();

    const appendLog = async (data: Buffer) => {
      const text = data.toString();
      logs += text;
      console.log(`[${processConfig.name}]`, text.trim());

      // Throttle database updates (every 2 seconds)
      const now = Date.now();
      if (now - lastLogUpdate > 2000) {
        lastLogUpdate = now;
        await prisma.processRun.update({
          where: { id: runId },
          data: { logs: logs.slice(-500000) }, // Keep last 500KB
        }).catch((err) => { logger.warn('Failed to update process run logs', { runId, error: err?.message }, 'QueueProcess'); });
      }

      // Check for progress updates in output
      const progressMatch = text.match(/\[PROGRESS\]\s*({.*})/);
      if (progressMatch) {
        try {
          await prisma.processRun.update({
            where: { id: runId },
            data: { progress: progressMatch[1] },
          });
        } catch {}
      }

      // Check for result updates in output
      const resultMatch = text.match(/\[RESULT\]\s*({.*})/);
      if (resultMatch) {
        try {
          await prisma.processRun.update({
            where: { id: runId },
            data: { result: resultMatch[1] },
          });
        } catch {}
      }
    };

    childProcess.stdout?.on('data', appendLog);
    childProcess.stderr?.on('data', appendLog);

    // Handle process completion
    childProcess.on('close', async (code) => {
      runningProcesses.delete(runId);

      // Check if cancelled during execution
      const currentRun = await prisma.processRun.findUnique({
        where: { id: runId },
        select: { status: true },
      });

      if (currentRun?.status === 'cancelled') {
        console.log(`[Queue] Process was cancelled: ${processConfig.name}`);
        return;
      }

      // Update final status
      const success = code === 0;
      await prisma.processRun.update({
        where: { id: runId },
        data: {
          status: success ? 'completed' : 'failed',
          completedAt: new Date(),
          logs: logs.slice(-500000),
          error: success ? null : `Process exited with code ${code}`,
        },
      });

      console.log(`[Queue] Process ${success ? 'completed' : 'failed'}: ${processConfig.name}`);
    });

    childProcess.on('error', async (error) => {
      runningProcesses.delete(runId);
      console.error(`[Queue] Process error:`, error);

      await prisma.processRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          logs,
          error: error.message,
        },
      });
    });
  } catch (error) {
    console.error(`[Queue] Error starting process:`, error);

    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
