/**
 * API Route: Get all catalogs with local images
 * Returns catalogs grouped by store for the catalog listing page
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const catalogs = await prisma.catalog.findMany({
      where: {
        status: 'COMPLETED',
        validUntil: { gte: new Date() },
        localImages: { not: null }
      },
      orderBy: [
        { store: 'asc' },
        { validFrom: 'desc' }
      ],
      select: {
        id: true,
        store: true,
        title: true,
        slug: true,
        validFrom: true,
        validUntil: true,
        totalPages: true,
        imageBasePath: true,
        localImages: true
      }
    });

    // Parse localImages JSON and group by store
    const catalogsByStore: Record<string, any[]> = {};

    for (const catalog of catalogs) {
      const store = catalog.store;
      if (!catalogsByStore[store]) {
        catalogsByStore[store] = [];
      }

      catalogsByStore[store].push({
        ...catalog,
        localImages: catalog.localImages ? JSON.parse(catalog.localImages) : [],
        // First image for thumbnail
        thumbnail: catalog.imageBasePath ? `${catalog.imageBasePath}/page-01.webp` : null
      });
    }

    return NextResponse.json({
      success: true,
      data: catalogsByStore,
      totalCatalogs: catalogs.length
    });

  } catch (error) {
    console.error('Error fetching catalogs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch catalogs' },
      { status: 500 }
    );
  }
}
