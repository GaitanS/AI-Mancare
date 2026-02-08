import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/admin/stores - List all stores
export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Get product counts per store
    const productCounts = await prisma.product.groupBy({
      by: ['store'],
      _count: { id: true },
    });

    // Map product counts by display name (product.store stores the display name, not slug)
    const countsMap = new Map(
      productCounts.map((p) => [p.store, p._count.id])
    );

    const storesWithCounts = stores.map((store) => ({
      ...store,
      productCount: countsMap.get(store.name) || 0,
    }));

    return NextResponse.json({ stores: storesWithCounts });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

// POST /api/admin/stores - Create new store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, scraperUrl, logoUrl, config, enabled } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.store.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A store with this slug already exists' },
        { status: 400 }
      );
    }

    // Get max sort order
    const maxOrder = await prisma.store.aggregate({
      _max: { sortOrder: true },
    });

    const store = await prisma.store.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        scraperUrl,
        logoUrl,
        config: config ? JSON.stringify(config) : null,
        enabled: enabled ?? true,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Store created successfully',
      store,
    });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}
