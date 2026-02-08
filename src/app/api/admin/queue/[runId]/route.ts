import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/admin/queue/[runId] - Get single run details
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
          select: { name: true, icon: true, type: true, script: true },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error('Error fetching run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch run' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/queue/[runId] - Cancel a queued or running process
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const run = await prisma.processRun.findUnique({
      where: { id: runId },
      include: {
        process: {
          select: { name: true },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    if (!['queued', 'running'].includes(run.status)) {
      return NextResponse.json(
        { error: 'Can only cancel queued or running processes' },
        { status: 400 }
      );
    }

    // If running and has PID, try to kill the process
    if (run.status === 'running' && run.pid) {
      try {
        process.kill(run.pid, 'SIGTERM');
      } catch (e) {
        // Process might have already ended
        console.warn(`Failed to kill process ${run.pid}:`, e);
      }
    }

    // Update status to cancelled
    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        error: 'Cancelled by user',
      },
    });

    return NextResponse.json({
      success: true,
      message: `${run.process.name} cancelled`,
    });
  } catch (error) {
    console.error('Error cancelling run:', error);
    return NextResponse.json(
      { error: 'Failed to cancel run' },
      { status: 500 }
    );
  }
}
