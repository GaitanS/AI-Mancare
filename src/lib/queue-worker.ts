import { spawn, ChildProcess } from 'child_process';
import { prisma } from './db';
import path from 'path';
import { logger } from '@/lib/logger';

let isWorkerRunning = false;
let checkQueueInProgress = false;
let currentProcess: ChildProcess | null = null;
let currentRunId: string | null = null;

// Configuration
const MAX_LOG_SIZE = 500000; // 500KB max log size in memory
const LOG_UPDATE_INTERVAL = 2000; // Throttle DB updates to every 2 seconds
const PROGRESS_UPDATE_INTERVAL = 1000; // Throttle progress updates to every 1 second

/**
 * Start the queue worker
 * This should be called when the server starts
 */
export function startQueueWorker() {
  if (isWorkerRunning) {
    console.log('[QueueWorker] Already running');
    return;
  }

  isWorkerRunning = true;
  console.log('[QueueWorker] Started');

  // Guard against concurrent checkQueue executions
  const checkQueueSafe = async () => {
    if (checkQueueInProgress) return;
    checkQueueInProgress = true;
    try {
      await checkQueue();
    } finally {
      checkQueueInProgress = false;
    }
  };

  // Check queue every 5 seconds
  setInterval(checkQueueSafe, 5000);

  // Initial check
  checkQueueSafe();
}

/**
 * Check the queue and start next process if available
 */
async function checkQueue() {
  try {
    // Check if any process is currently running
    const running = await prisma.processRun.findFirst({
      where: { status: 'running' },
    });

    if (running) {
      // Something is already running, skip
      return;
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
      // Nothing in queue
      return;
    }

    // Start the process
    await runProcess(nextRun);
  } catch (error) {
    console.error('[QueueWorker] Error checking queue:', error);
  }
}

/**
 * Run a queued process
 */
async function runProcess(run: {
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
  currentRunId = runId;

  console.log(`[QueueWorker] Starting process: ${processConfig.name}`);

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
    const isJS = scriptPath.endsWith('.js');
    const isTS = scriptPath.endsWith('.ts');

    let command: string;
    let args: string[];

    if (isJS) {
      command = 'node';
      args = [scriptPath];
    } else if (isTS) {
      command = 'npx';
      args = ['tsx', scriptPath];
    } else {
      throw new Error(`Unsupported script type: ${scriptPath}`);
    }

    // Pass config as environment variable
    const env = {
      ...process.env,
      PROCESS_RUN_ID: runId,
      PROCESS_CONFIG: processConfig.config || '{}',
    };

    // Spawn the process
    currentProcess = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    // Save PID
    if (currentProcess.pid) {
      await prisma.processRun.update({
        where: { id: runId },
        data: { pid: currentProcess.pid },
      });
    }

    // Collect output with memory limit and throttled DB updates
    let logs = '';
    let lastLogUpdate = 0;
    let lastProgressUpdate = 0;

    const appendLog = async (data: Buffer) => {
      const text = data.toString();
      logs += text;

      // Enforce memory limit by keeping only the most recent logs
      if (logs.length > MAX_LOG_SIZE) {
        // Add truncation notice and keep the last portion
        const truncateNotice = '\n[...logs truncated...]\n';
        logs = truncateNotice + logs.slice(-(MAX_LOG_SIZE - truncateNotice.length));
      }

      // Throttle database updates to prevent overload
      const now = Date.now();
      if (now - lastLogUpdate >= LOG_UPDATE_INTERVAL) {
        lastLogUpdate = now;
        await prisma.processRun.update({
          where: { id: runId },
          data: { logs },
        }).catch((err) => { logger.warn('Failed to update process run logs', { runId, error: err?.message }, 'QueueWorker'); });
      }

      // Check for progress updates in output (also throttled)
      const progressMatch = text.match(/\[PROGRESS\]\s*({.*})/);
      if (progressMatch && now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
        lastProgressUpdate = now;
        try {
          await prisma.processRun.update({
            where: { id: runId },
            data: { progress: progressMatch[1] },
          });
        } catch {}
      }
    };

    currentProcess.stdout?.on('data', appendLog);
    currentProcess.stderr?.on('data', appendLog);

    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      currentProcess!.on('close', (code) => {
        resolve(code || 0);
      });

      currentProcess!.on('error', (error) => {
        console.error(`[QueueWorker] Process error:`, error);
        resolve(1);
      });
    });

    // Check if cancelled during execution
    const currentRun = await prisma.processRun.findUnique({
      where: { id: runId },
      select: { status: true },
    });

    if (currentRun?.status === 'cancelled') {
      console.log(`[QueueWorker] Process was cancelled: ${processConfig.name}`);
      return;
    }

    // Update final status
    const success = exitCode === 0;
    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: success ? 'completed' : 'failed',
        completedAt: new Date(),
        logs,
        error: success ? null : `Process exited with code ${exitCode}`,
      },
    });

    console.log(`[QueueWorker] Process ${success ? 'completed' : 'failed'}: ${processConfig.name}`);
  } catch (error) {
    console.error(`[QueueWorker] Error running process:`, error);

    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  } finally {
    currentProcess = null;
    currentRunId = null;
  }
}

/**
 * Kill currently running process
 */
export function killCurrentProcess(): boolean {
  if (currentProcess) {
    try {
      currentProcess.kill('SIGTERM');
      return true;
    } catch (error) {
      console.error('[QueueWorker] Error killing process:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get current worker status
 */
export function getWorkerStatus() {
  return {
    isRunning: isWorkerRunning,
    currentRunId,
    hasActiveProcess: currentProcess !== null,
  };
}

/**
 * Update progress for current run (called from scripts)
 */
export async function updateProgress(
  runId: string,
  progress: { current?: number; total?: number; message?: string }
) {
  try {
    await prisma.processRun.update({
      where: { id: runId },
      data: { progress: JSON.stringify(progress) },
    });
  } catch (error) {
    console.error('[QueueWorker] Error updating progress:', error);
  }
}

/**
 * Update result for current run (called from scripts)
 */
export async function updateResult(
  runId: string,
  result: Record<string, unknown>
) {
  try {
    await prisma.processRun.update({
      where: { id: runId },
      data: { result: JSON.stringify(result) },
    });
  } catch (error) {
    console.error('[QueueWorker] Error updating result:', error);
  }
}
