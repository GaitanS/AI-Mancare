import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/processes/[id] - Get single process
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const process = await prisma.scrapingProcess.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { queuedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!process) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ process });
  } catch (error) {
    console.error('Error fetching process:', error);
    return NextResponse.json(
      { error: 'Failed to fetch process' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/processes/[id] - Update process
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, description, type, script, config, icon, color, enabled, cronSchedule, sortOrder } = body;

    // Check if process exists
    const existing = await prisma.scrapingProcess.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (script !== undefined) updateData.script = script;
    if (config !== undefined) updateData.config = typeof config === 'string' ? config : JSON.stringify(config);
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (cronSchedule !== undefined) updateData.cronSchedule = cronSchedule;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const process = await prisma.scrapingProcess.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Process updated successfully',
      process,
    });
  } catch (error) {
    console.error('Error updating process:', error);
    return NextResponse.json(
      { error: 'Failed to update process' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/processes/[id] - Delete process
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if process exists
    const existing = await prisma.scrapingProcess.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    // Check if process has running or queued runs
    const activeRuns = await prisma.processRun.count({
      where: {
        processId: id,
        status: { in: ['running', 'queued'] },
      },
    });

    if (activeRuns > 0) {
      return NextResponse.json(
        { error: 'Cannot delete process with active runs. Cancel them first.' },
        { status: 400 }
      );
    }

    // Delete process (cascade will delete runs)
    await prisma.scrapingProcess.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Process deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting process:', error);
    return NextResponse.json(
      { error: 'Failed to delete process' },
      { status: 500 }
    );
  }
}
