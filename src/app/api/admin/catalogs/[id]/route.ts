import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit-logger';
import { verifyRequestOrigin } from '@/lib/admin-auth';

// GET /api/admin/catalogs/[id] - Catalog with page URLs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const catalog = await prisma.catalog.findUnique({ where: { id } });

    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }

    // Build page URLs
    const pages: string[] = [];
    if (catalog.imageBasePath && catalog.totalPages) {
      for (let i = 1; i <= catalog.totalPages; i++) {
        pages.push(`${catalog.imageBasePath}/page-${String(i).padStart(2, '0')}.webp`);
      }
    }

    const productCount = await prisma.product.count({
      where: { catalogId: id },
    });

    return NextResponse.json({
      catalog: {
        ...catalog,
        pages,
        productCount,
      },
    });
  } catch (error) {
    console.error('Error fetching catalog:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }
}

// POST /api/admin/catalogs/[id] - Reprocess catalog (queue extraction)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const catalog = await prisma.catalog.findUnique({ where: { id } });
    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }

    // Find the product extraction process
    const extractProcess = await prisma.scrapingProcess.findFirst({
      where: { type: 'product' },
    });

    if (!extractProcess) {
      return NextResponse.json({ error: 'No product extraction process configured' }, { status: 400 });
    }

    // Create a process run to re-extract
    const run = await prisma.processRun.create({
      data: {
        processId: extractProcess.id,
        status: 'queued',
        triggeredBy: 'manual',
        progress: JSON.stringify({ message: `Re-processing catalog: ${catalog.title}`, catalogId: id }),
      },
    });

    // Reset catalog status
    await prisma.catalog.update({
      where: { id },
      data: {
        status: 'PENDING',
        processingErrors: null,
        productsExtractedAt: null,
      },
    });

    await logAudit({
      action: 'UPDATE',
      entity: 'catalog',
      entityId: id,
      details: `Queued reprocessing for catalog: ${catalog.title}`,
      request,
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      message: 'Catalog queued for reprocessing',
    });
  } catch (error) {
    console.error('Error reprocessing catalog:', error);
    return NextResponse.json({ error: 'Failed to reprocess catalog' }, { status: 500 });
  }
}

// DELETE /api/admin/catalogs/[id] - Delete with cascade
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.catalog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }

    // Delete associated products first
    const productsDeleted = await prisma.product.deleteMany({
      where: { catalogId: id },
    });

    await prisma.catalog.delete({ where: { id } });

    await logAudit({
      action: 'DELETE',
      entity: 'catalog',
      entityId: id,
      details: `Deleted catalog: ${existing.title} (${productsDeleted.count} products cascaded)`,
      request,
    });

    return NextResponse.json({
      success: true,
      message: `Catalog deleted with ${productsDeleted.count} products`,
    });
  } catch (error) {
    console.error('Error deleting catalog:', error);
    return NextResponse.json({ error: 'Failed to delete catalog' }, { status: 500 });
  }
}
