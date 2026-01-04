/**
 * Optimized Database Queries
 * Folosește indexuri compuși și full-text search
 */

import { prisma } from './db-config';
import { trackQuery } from './db-performance';
import { Prisma } from '@prisma/client';

/**
 * Get active offers by store (folosește idx_store_validity)
 */
export async function getActiveOffersByStore(store: string, limit = 50) {
  return trackQuery('getActiveOffersByStore', async () => {
    const now = new Date();

    return prisma.product.findMany({
      where: {
        store,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: [
        { discountPercentage: 'desc' },
        { price: 'asc' },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        price: true,
        originalPrice: true,
        discountPercentage: true,
        category: true,
        subcategory: true,
        brand: true,
        unit: true,
        validUntil: true,
      },
    });
  });
}

/**
 * Get best offers by category (folosește idx_category_price)
 */
export async function getBestOffersByCategory(category: string, limit = 20) {
  return trackQuery('getBestOffersByCategory', async () => {
    const now = new Date();

    return prisma.product.findMany({
      where: {
        category,
        validFrom: { lte: now },
        validUntil: { gte: now },
        discountPercentage: { gte: 20 }, // Minimum 20% discount
      },
      orderBy: [
        { discountPercentage: 'desc' },
        { price: 'asc' },
      ],
      take: limit,
    });
  });
}

/**
 * Full-text search products (folosește idx_name_fulltext)
 */
export async function searchProducts(query: string, limit = 30) {
  return trackQuery('searchProducts', async () => {
    const now = new Date();

    // Full-text search cu MySQL
    return prisma.product.findRaw({
      filter: {
        $and: [
          {
            $text: {
              $search: query
            }
          },
          {
            validFrom: { $lte: now },
            validUntil: { $gte: now },
          },
        ],
      },
      options: {
        limit,
        sort: {
          score: { $meta: 'textScore' },
          discountPercentage: -1,
        },
      },
    });
  });
}

/**
 * Get popular recipes (folosește idx_popular)
 */
export async function getPopularRecipes(limit = 20) {
  return trackQuery('getPopularRecipes', async () => {
    return prisma.recipe.findMany({
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        estimatedCost: true,
        costPerServing: true,
        servings: true,
        difficulty: true,
        totalTime: true,
        viewCount: true,
        favoriteCount: true,
        createdAt: true,
      },
    });
  });
}

/**
 * Get budget recipes (folosește idx_cost_created)
 */
export async function getBudgetRecipes(maxCost: number, limit = 20) {
  return trackQuery('getBudgetRecipes', async () => {
    return prisma.recipe.findMany({
      where: {
        estimatedCost: {
          lte: maxCost,
        },
      },
      orderBy: [
        { estimatedCost: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  });
}

/**
 * Search recipes (folosește idx_recipe_fulltext)
 */
export async function searchRecipes(query: string, limit = 20) {
  return trackQuery('searchRecipes', async () => {
    return prisma.recipe.findRaw({
      filter: {
        $text: {
          $search: query
        },
      },
      options: {
        limit,
        sort: {
          score: { $meta: 'textScore' },
        },
      },
    });
  });
}

/**
 * Get user's recent menus (folosește idx_user_created)
 */
export async function getUserRecentMenus(userId: string, limit = 10) {
  return trackQuery('getUserRecentMenus', async () => {
    return prisma.weeklyMenu.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        budgetLimit: true,
        totalCost: true,
        peopleCount: true,
        createdAt: true,
      },
    });
  });
}

/**
 * Get processing catalogs (folosește idx_store_status)
 */
export async function getProcessingCatalogsByStore(store: string) {
  return trackQuery('getProcessingCatalogsByStore', async () => {
    return prisma.catalog.findMany({
      where: {
        store,
        status: 'PROCESSING',
      },
      orderBy: {
        processingStartedAt: 'desc',
      },
    });
  });
}

/**
 * Batch insert products (optimizat pentru performance)
 */
export async function batchInsertProducts(products: Prisma.ProductCreateInput[]) {
  return trackQuery('batchInsertProducts', async () => {
    // Split în batch-uri de 100 pentru a evita timeout
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      const result = await prisma.product.createMany({
        data: batch,
        skipDuplicates: true, // Skip products cu același id
      });

      results.push(result);
    }

    return {
      totalBatches: results.length,
      totalInserted: results.reduce((sum, r) => sum + r.count, 0),
    };
  });
}

/**
 * Clean expired offers (cu index pe validUntil)
 */
export async function cleanExpiredOffers() {
  return trackQuery('cleanExpiredOffers', async () => {
    const now = new Date();

    return prisma.product.deleteMany({
      where: {
        validUntil: {
          lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Older than 7 days
        },
      },
    });
  });
}

/**
 * Get product price history (agregat)
 */
export async function getProductPriceHistory(productName: string) {
  return trackQuery('getProductPriceHistory', async () => {
    return prisma.product.findMany({
      where: {
        name: {
          contains: productName,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
      select: {
        price: true,
        originalPrice: true,
        discountPercentage: true,
        store: true,
        validFrom: true,
        validUntil: true,
        createdAt: true,
      },
    });
  });
}

/**
 * Get category statistics (agregat optimizat)
 */
export async function getCategoryStats() {
  return trackQuery('getCategoryStats', async () => {
    const now = new Date();

    // Folosește raw query pentru agregări complexe
    return prisma.$queryRaw<any[]>`
      SELECT
        category,
        COUNT(*) as productCount,
        AVG(price) as avgPrice,
        MIN(price) as minPrice,
        MAX(price) as maxPrice,
        AVG(discountPercentage) as avgDiscount
      FROM products
      WHERE validFrom <= ${now}
      AND validUntil >= ${now}
      GROUP BY category
      ORDER BY productCount DESC
    `;
  });
}

/**
 * Get store comparison (pentru homepage)
 */
export async function getStoreComparison() {
  return trackQuery('getStoreComparison', async () => {
    const now = new Date();

    return prisma.$queryRaw<any[]>`
      SELECT
        store,
        COUNT(*) as activeOffers,
        AVG(discountPercentage) as avgDiscount,
        COUNT(CASE WHEN discountPercentage >= 30 THEN 1 END) as hotDeals
      FROM products
      WHERE validFrom <= ${now}
      AND validUntil >= ${now}
      GROUP BY store
      ORDER BY activeOffers DESC
    `;
  });
}
