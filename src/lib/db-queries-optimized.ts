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
 * Full-text search products (PostgreSQL)
 */
export async function searchProducts(query: string, limit = 30) {
  return trackQuery('searchProducts', async () => {
    const now = new Date();

    return prisma.product.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query } },
              { brand: { contains: query } },
              { category: { contains: query } },
            ],
          },
          { validFrom: { lte: now } },
          { validUntil: { gte: now } },
        ],
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
 * Get popular recipes (folosește idx_popular)
 */
export async function getPopularRecipes(limit = 20) {
  return trackQuery('getPopularRecipes', async () => {
    return prisma.recipe.findMany({
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        estimatedCost: true,
        servings: true,
        difficulty: true,
        totalTime: true,
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
 * Search recipes (PostgreSQL)
 */
export async function searchRecipes(query: string, limit = 20) {
  return trackQuery('searchRecipes', async () => {
    return prisma.recipe.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
        name: true,
        budget: true,
        totalCost: true,
        servings: true,
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
export async function batchInsertProducts(products: any[]) {
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

    return prisma.$queryRaw<any[]>`
      SELECT
        category,
        CAST(COUNT(*) AS INTEGER) as productCount,
        AVG(price) as avgPrice,
        MIN(price) as minPrice,
        MAX(price) as maxPrice,
        AVG(discount_percentage) as avgDiscount
      FROM products
      WHERE valid_from <= ${now}
      AND valid_until >= ${now}
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
        CAST(COUNT(*) AS INTEGER) as activeOffers,
        AVG(discount_percentage) as avgDiscount,
        CAST(COUNT(CASE WHEN discount_percentage >= 30 THEN 1 END) AS INTEGER) as hotDeals
      FROM products
      WHERE valid_from <= ${now}
      AND valid_until >= ${now}
      GROUP BY store
      ORDER BY activeOffers DESC
    `;
  });
}
