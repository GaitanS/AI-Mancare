import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyTokenFromRequest, unauthorizedResponse } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function getPeriodFilter(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

function getDailyDays(period: string): number {
  switch (period) {
    case 'today':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
    case 'all':
    default:
      return 30;
  }
}

export async function GET(request: NextRequest) {
  try {
    const isAuthed = await verifyTokenFromRequest(request);
    if (!isAuthed) {
      return unauthorizedResponse();
    }

    const log = logger.child('AnalyticsAPI');
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const dateFilter = getPeriodFilter(period);
    const dailyDays = getDailyDays(period);

    log.info('Analytics requested', { period });

    const whereClause = dateFilter
      ? { createdAt: { gte: dateFilter } }
      : {};

    // Run all queries in parallel
    const [
      totalInteractions,
      sessionCount,
      interactionsByType,
      topRecipesRaw,
      topProductsRaw,
      topSearchesRaw,
      dailyActivityRaw,
    ] = await Promise.all([
      // Total interactions
      prisma.userInteraction.count({ where: whereClause }),

      // Unique sessions
      prisma.userInteraction.groupBy({
        by: ['sessionId'],
        where: whereClause,
      }),

      // Interactions grouped by type
      prisma.userInteraction.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { id: true },
      }),

      // Top 10 most viewed recipes
      prisma.userInteraction.groupBy({
        by: ['recipeId'],
        where: {
          ...whereClause,
          type: 'view',
          recipeId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Top 10 most cart-added products
      prisma.userInteraction.groupBy({
        by: ['productId'],
        where: {
          ...whereClause,
          type: 'cart_add',
          productId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Search interactions (we'll parse metadata for queries)
      prisma.userInteraction.findMany({
        where: {
          ...whereClause,
          type: 'search',
        },
        select: { metadata: true },
      }),

      // Daily activity for the chart
      prisma.$queryRawUnsafe<Array<{ day: string; count: bigint }>>(
        `SELECT DATE(created_at) as day, COUNT(*) as count
         FROM user_interactions
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        dailyDays
      ),
    ]);

    const totalSessions = sessionCount.length;

    // Build interactionsByType map
    const typeMap: Record<string, number> = {
      view: 0,
      cart_add: 0,
      cook: 0,
      search: 0,
    };
    for (const row of interactionsByType) {
      typeMap[row.type] = row._count.id;
    }

    // Resolve recipe details for top recipes
    const recipeIds = topRecipesRaw
      .map((r) => r.recipeId)
      .filter((id): id is string => id !== null);

    const recipes =
      recipeIds.length > 0
        ? await prisma.recipe.findMany({
            where: { id: { in: recipeIds } },
            select: { id: true, title: true, slug: true },
          })
        : [];

    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const topRecipes = topRecipesRaw.map((row, i) => {
      const recipe = row.recipeId ? recipeMap.get(row.recipeId) : null;
      return {
        rank: i + 1,
        recipeId: row.recipeId,
        title: recipe?.title || 'Unknown Recipe',
        slug: recipe?.slug || '',
        count: row._count.id,
      };
    });

    // Resolve product details for top products
    const productIds = topProductsRaw
      .map((p) => p.productId)
      .filter((id): id is string => id !== null);

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, store: true },
          })
        : [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProducts = topProductsRaw.map((row, i) => {
      const product = row.productId ? productMap.get(row.productId) : null;
      return {
        rank: i + 1,
        productId: row.productId,
        name: product?.name || 'Unknown Product',
        store: product?.store || '',
        count: row._count.id,
      };
    });

    // Parse search metadata to extract query terms and aggregate
    const searchTermCounts = new Map<string, number>();
    for (const row of topSearchesRaw) {
      if (!row.metadata) continue;
      try {
        const meta = JSON.parse(row.metadata);
        const query = (meta.query || meta.q || meta.term || '').trim().toLowerCase();
        if (query) {
          searchTermCounts.set(query, (searchTermCounts.get(query) || 0) + 1);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    const topSearches = Array.from(searchTermCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count], i) => ({
        rank: i + 1,
        term,
        count,
      }));

    // Format daily activity
    const dailyActivity = dailyActivityRaw.map((row) => ({
      date: String(row.day),
      count: Number(row.count),
    }));

    return NextResponse.json({
      period,
      totalSessions,
      totalInteractions,
      interactionsByType: typeMap,
      topRecipes,
      topProducts,
      topSearches,
      dailyActivity,
    });
  } catch (error) {
    logger.error('Analytics API error', { error }, 'AnalyticsAPI');
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
