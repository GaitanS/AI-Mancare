import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit, computeChanges } from '@/lib/audit-logger';

// GET /api/admin/stores/[id] - Get single store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const store = await prisma.store.findUnique({
      where: { id },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Get product count - product.store stores the display name, not slug
    const productCount = await prisma.product.count({
      where: { store: store.name },
    });

    return NextResponse.json({
      store: {
        ...store,
        productCount,
      },
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/stores/[id] - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, slug, scraperUrl, logoUrl, config, enabled, sortOrder } = body;

    // Check if store exists
    const existing = await prisma.store.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // If changing slug, check for conflicts
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.store.findUnique({
        where: { slug },
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A store with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug.toLowerCase();
    if (scraperUrl !== undefined) updateData.scraperUrl = scraperUrl;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (config !== undefined) updateData.config = typeof config === 'string' ? config : JSON.stringify(config);
    if (enabled !== undefined) updateData.enabled = enabled;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const store = await prisma.store.update({
      where: { id },
      data: updateData,
    });

    const changes = computeChanges(
      existing as unknown as Record<string, unknown>,
      body,
      ['name', 'slug', 'scraperUrl', 'logoUrl', 'config', 'enabled', 'sortOrder']
    );

    await logAudit({
      action: body.enabled !== undefined && Object.keys(updateData).length === 1 ? 'TOGGLE' : 'UPDATE',
      entity: 'store',
      entityId: id,
      changes: changes || undefined,
      details: `Updated store: ${store.name}`,
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Store updated successfully',
      store,
    });
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/stores/[id] - Delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.store.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Check if store has products - product.store stores the display name, not slug
    const productCount = await prisma.product.count({
      where: { store: existing.name },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete store with ${productCount} products. Delete products first.` },
        { status: 400 }
      );
    }

    await prisma.store.delete({
      where: { id },
    });

    await logAudit({
      action: 'DELETE',
      entity: 'store',
      entityId: id,
      details: `Deleted store: ${existing.name}`,
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    );
  }
}
