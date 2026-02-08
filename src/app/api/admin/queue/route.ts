import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyRequestOrigin } from '@/lib/admin-auth';

// GET /api/admin/queue - Get queue status and history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const summary = searchParams.get('summary') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get currently running process
    const running = await prisma.processRun.findFirst({
      where: { status: 'running' },
      include: {
        process: {
          select: { name: true, icon: true, type: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Get queued count
    const queuedCount = await prisma.processRun.count({
      where: { status: 'queued' },
    });

    if (summary) {
      return NextResponse.json({
        running: running ? 1 : 0,
        queued: queuedCount,
      });
    }

    // Get queued processes
    const queued = await prisma.processRun.findMany({
      where: { status: 'queued' },
      include: {
        process: {
          select: { name: true, icon: true, type: true },
        },
      },
      orderBy: { queuedAt: 'asc' },
    });

    // Get recent completed/failed processes
    const recentCompleted = await prisma.processRun.findMany({
      where: {
        status: { in: ['completed', 'failed', 'cancelled'] },
      },
      include: {
        process: {
          select: { name: true, icon: true, type: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      running,
      queued: queuedCount,
      queuedItems: queued,
      recentCompleted,
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/queue - Add process to queue
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { processId } = body;

    if (!processId) {
      return NextResponse.json(
        { error: 'processId is required' },
        { status: 400 }
      );
    }

    // Verify process exists
    const process = await prisma.scrapingProcess.findUnique({
      where: { id: processId },
    });

    if (!process) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    if (!process.enabled) {
      return NextResponse.json(
        { error: 'Process is disabled' },
        { status: 400 }
      );
    }

    // Create new run
    const run = await prisma.processRun.create({
      data: {
        processId,
        status: 'queued',
        triggeredBy: 'manual',
      },
      include: {
        process: {
          select: { name: true, icon: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${process.name} added to queue`,
      run,
    });
  } catch (error) {
    console.error('Error adding to queue:', error);
    return NextResponse.json(
      { error: 'Failed to add to queue' },
      { status: 500 }
    );
  }
}
