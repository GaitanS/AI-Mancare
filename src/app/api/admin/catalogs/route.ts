import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit-logger';

// GET /api/admin/catalogs - Paginated catalog list with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const store = searchParams.get('store') || '';
    const status = searchParams.get('status') || '';
    const expired = searchParams.get('expired');

    const where: Record<string, unknown> = {};

    if (store) where.store = store;
    if (status) where.status = status;
    if (expired === 'true') {
      where.validUntil = { lt: new Date() };
    } else if (expired === 'false') {
      where.validUntil = { gte: new Date() };
    }

    const [catalogs, total, stores] = await Promise.all([
      prisma.catalog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.catalog.count({ where }),
      prisma.catalog.findMany({
        select: { store: true },
        distinct: ['store'],
      }),
    ]);

    // Get product counts per catalog
    const catalogIds = catalogs.map(c => c.id);
    const productCounts = await prisma.product.groupBy({
      by: ['catalogId'],
      where: { catalogId: { in: catalogIds } },
      _count: true,
    });
    const countMap = new Map(productCounts.map(pc => [pc.catalogId, pc._count]));

    return NextResponse.json({
      catalogs: catalogs.map(c => ({
        ...c,
        productCount: countMap.get(c.id) || 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: {
        stores: stores.map(s => s.store),
        statuses: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      },
    });
  } catch (error) {
    console.error('Error fetching catalogs:', error);
    return NextResponse.json({ error: 'Failed to fetch catalogs' }, { status: 500 });
  }
}

// DELETE /api/admin/catalogs - Bulk delete expired
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'expired') {
      // First delete products from expired catalogs
      const expiredCatalogs = await prisma.catalog.findMany({
        where: { validUntil: { lt: new Date() } },
        select: { id: true },
      });
      const ids = expiredCatalogs.map(c => c.id);

      const productsDeleted = await prisma.product.deleteMany({
        where: { catalogId: { in: ids } },
      });

      const result = await prisma.catalog.deleteMany({
        where: { id: { in: ids } },
      });

      await logAudit({
        action: 'BULK_DELETE',
        entity: 'catalog',
        entityId: 'bulk',
        details: `Deleted ${result.count} expired catalogs and ${productsDeleted.count} associated products`,
        request,
      });

      return NextResponse.json({
        success: true,
        deletedCatalogs: result.count,
        deletedProducts: productsDeleted.count,
      });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('Error bulk deleting catalogs:', error);
    return NextResponse.json({ error: 'Failed to delete catalogs' }, { status: 500 });
  }
}
