import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store');

    const where = store ? { store: store } : {};

    const catalogs = await prisma.catalog.findMany({
      where,
      select: {
        id: true,
        title: true,
        store: true,
        sourceUrl: true,
        validFrom: true,
        validUntil: true,
        status: true,
      },
      orderBy: {
        validFrom: 'desc',
      },
      take: 50,
    });

    // Group by store
    const groupedByStore: Record<string, typeof catalogs> = {};

    catalogs.forEach((catalog) => {
      const storeLower = catalog.store.toLowerCase();
      if (!groupedByStore[storeLower]) {
        groupedByStore[storeLower] = [];
      }
      groupedByStore[storeLower].push(catalog);
    });

    return NextResponse.json({
      success: true,
      catalogs: groupedByStore,
      total: catalogs.length,
    });
  } catch (error) {
    console.error('Error fetching catalogs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch catalogs' },
      { status: 500 }
    );
  }
}
