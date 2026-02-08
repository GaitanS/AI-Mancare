import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/logs/[runId] - Get logs for a process run
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const run = await prisma.processRun.findUnique({
      where: { id: runId },
      include: {
        process: {
          select: { name: true, icon: true, type: true },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Safe JSON parsing to avoid crashing on malformed data
    let progress = null;
    let result = null;
    try { if (run.progress) progress = JSON.parse(run.progress); } catch {}
    try { if (run.result) result = JSON.parse(run.result); } catch {}

    return NextResponse.json({
      run: {
        id: run.id,
        status: run.status,
        queuedAt: run.queuedAt,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        progress,
        result,
        error: run.error,
        triggeredBy: run.triggeredBy,
        process: run.process,
      },
      logs: run.logs || '',
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
