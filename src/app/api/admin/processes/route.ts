import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit-logger';
import { verifyRequestOrigin } from '@/lib/admin-auth';

// GET /api/admin/processes - List all processes
export async function GET() {
  try {
    // Fetch processes with active runs in a single query
    const processes = await prisma.scrapingProcess.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        runs: {
          where: {
            status: { in: ['running', 'queued'] },
          },
          select: {
            id: true,
            status: true,
            queuedAt: true,
            startedAt: true,
          },
        },
        _count: {
          select: {
            runs: true,
          },
        },
      },
    });

    // Batch fetch all last completed/failed runs in a single query
    // Using raw query with window function for efficiency
    const lastRuns = await prisma.$queryRaw<
      Array<{
        process_id: string;
        id: string;
        status: string;
        completed_at: Date | null;
        result: string | null;
      }>
    >`
      SELECT pr.process_id, pr.id, pr.status, pr.completed_at, pr.result
      FROM process_runs pr
      INNER JOIN (
        SELECT process_id, MAX(completed_at) as max_completed
        FROM process_runs
        WHERE status IN ('completed', 'failed')
        GROUP BY process_id
      ) latest ON pr.process_id = latest.process_id
        AND pr.completed_at = latest.max_completed
      WHERE pr.status IN ('completed', 'failed')
    `;

    // Create a map for O(1) lookup
    const lastRunMap = new Map(
      lastRuns.map((run) => [
        run.process_id,
        {
          id: run.id,
          status: run.status,
          completedAt: run.completed_at,
          result: run.result,
        },
      ])
    );

    // Combine results
    const processesWithLastRun = processes.map((process) => ({
      ...process,
      lastRun: lastRunMap.get(process.id) || null,
      isRunning: process.runs.some((r) => r.status === 'running'),
      isQueued: process.runs.some((r) => r.status === 'queued'),
    }));

    return NextResponse.json({ processes: processesWithLastRun });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processes' },
      { status: 500 }
    );
  }
}

// POST /api/admin/processes - Create new process
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, type, script, config, icon, color, cronSchedule } = body;

    if (!name || !type || !script) {
      return NextResponse.json(
        { error: 'name, type, and script are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['catalog', 'product', 'recipe', 'image', 'custom'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get max sort order
    const maxOrder = await prisma.scrapingProcess.aggregate({
      _max: { sortOrder: true },
    });

    const process = await prisma.scrapingProcess.create({
      data: {
        name,
        description,
        type,
        script,
        config: config ? JSON.stringify(config) : null,
        icon: icon || '📦',
        color: color || 'blue',
        cronSchedule,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    await logAudit({
      action: 'CREATE',
      entity: 'process',
      entityId: process.id,
      details: `Created process: ${process.name} (${process.type})`,
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Process created successfully',
      process,
    });
  } catch (error) {
    console.error('Error creating process:', error);
    return NextResponse.json(
      { error: 'Failed to create process' },
      { status: 500 }
    );
  }
}
