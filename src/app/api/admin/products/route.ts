import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit-logger';
import { verifyRequestOrigin } from '@/lib/admin-auth';

// GET /api/admin/products - Paginated product list with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 200);
    const search = searchParams.get('search') || '';
    const store = searchParams.get('store') || '';
    const category = searchParams.get('category') || '';
    const expired = searchParams.get('expired'); // 'true' to show only expired

    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search };
    }
    if (store) {
      where.store = store;
    }
    if (category) {
      where.category = category;
    }
    if (expired === 'true') {
      where.validUntil = { lt: new Date() };
    } else if (expired === 'false') {
      where.validUntil = { gte: new Date() };
    }

    const [products, total, stores, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        select: { store: true },
        distinct: ['store'],
      }),
      prisma.product.findMany({
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    return NextResponse.json({
      products: products.map(p => ({
        ...p,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: {
        stores: stores.map(s => s.store),
        categories: categories.map(c => c.category),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// DELETE /api/admin/products - Bulk delete expired products
export async function DELETE(request: NextRequest) {
  // CSRF protection
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'expired'

    if (mode === 'expired') {
      const result = await prisma.product.deleteMany({
        where: { validUntil: { lt: new Date() } },
      });

      await logAudit({
        action: 'BULK_DELETE',
        entity: 'product',
        entityId: 'bulk',
        details: `Deleted ${result.count} expired products`,
        request,
      });

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `Deleted ${result.count} expired products`,
      });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('Error bulk deleting products:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}
