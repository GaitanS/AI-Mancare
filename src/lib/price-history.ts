/**
 * Price History Service
 * Records product prices over time and computes trend badges.
 */

import prisma from '@/lib/db';
import { normalizeProductName } from '@/lib/search/dedup';
import { logger } from '@/lib/logger';
import type { PriceTrend, PriceTrendBadge } from '@/types';

interface ProductForHistory {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  price: number;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  unit: string;
  store: string;
  validFrom: Date | string;
  validUntil: Date | string;
  catalogId?: string | null;
}

/**
 * Record a single product's price snapshot (idempotent via unique constraint).
 */
export async function recordPriceSnapshot(product: ProductForHistory): Promise<void> {
  try {
    const normalizedName = normalizeProductName(product.name, product.brand);
    if (!normalizedName) return;

    await prisma.priceHistory.create({
      data: {
        normalizedName,
        store: product.store,
        brand: product.brand || null,
        category: product.category || null,
        originalName: product.name,
        price: product.price,
        originalPrice: product.originalPrice ?? null,
        discountPct: product.discountPercentage ? Math.round(product.discountPercentage) : null,
        unit: product.unit,
        validFrom: new Date(product.validFrom),
        validUntil: new Date(product.validUntil),
        catalogId: product.catalogId || null,
        sourceProductId: product.id,
      },
    });
  } catch (error: any) {
    // P2002 = unique constraint violation — already recorded, that's fine
    if (error?.code === 'P2002') return;
    logger.warn('[PriceHistory] Failed to record snapshot', { product: product.name, error: error.message });
  }
}

/**
 * Record price snapshots for a batch of products.
 * Uses createMany with skipDuplicates for efficiency.
 */
export async function recordPriceSnapshotBatch(products: ProductForHistory[]): Promise<number> {
  if (products.length === 0) return 0;

  try {
    const data = products
      .map((product) => {
        const normalizedName = normalizeProductName(product.name, product.brand);
        if (!normalizedName) return null;
        return {
          normalizedName,
          store: product.store,
          brand: product.brand || null,
          category: product.category || null,
          originalName: product.name,
          price: product.price,
          originalPrice: product.originalPrice ?? null,
          discountPct: product.discountPercentage ? Math.round(product.discountPercentage) : null,
          unit: product.unit,
          validFrom: new Date(product.validFrom),
          validUntil: new Date(product.validUntil),
          catalogId: product.catalogId || null,
          sourceProductId: product.id,
        };
      })
      .filter(Boolean) as any[];

    if (data.length === 0) return 0;

    const result = await prisma.priceHistory.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  } catch (error: any) {
    logger.warn('[PriceHistory] Batch record failed', { count: products.length, error: error.message });
    return 0;
  }
}

/**
 * Get chronological price history for a product.
 */
export async function getPriceHistory(
  normalizedName: string,
  store: string,
  months: number = 6
): Promise<{ price: number; validFrom: Date; validUntil: Date; recordedAt: Date }[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  return prisma.priceHistory.findMany({
    where: {
      normalizedName,
      store,
      recordedAt: { gte: cutoff },
    },
    select: {
      price: true,
      validFrom: true,
      validUntil: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: 'asc' },
  }) as any;
}

/**
 * Compute a price trend for a single product.
 */
export async function getPriceTrend(
  normalizedName: string,
  store: string,
  currentPrice: number
): Promise<PriceTrend> {
  const history = await getPriceHistory(normalizedName, store);
  return computeTrend(history.map((h) => Number(h.price)), currentPrice);
}

/**
 * Batch-compute price trends for a list of products.
 * Single DB query, computed in memory — avoids N+1.
 */
export async function getPriceTrendsBatch(
  products: { id: string; name: string; brand?: string | null; price: number; store: string }[]
): Promise<Record<string, PriceTrend>> {
  if (products.length === 0) return {};

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);

  // Build lookup keys
  const lookups = products.map((p) => ({
    id: p.id,
    normalizedName: normalizeProductName(p.name, p.brand),
    store: p.store,
    price: p.price,
  }));

  // Get unique (normalizedName, store) pairs
  const uniqueKeys = new Map<string, { normalizedName: string; store: string }>();
  for (const l of lookups) {
    if (!l.normalizedName) continue;
    const key = `${l.normalizedName}||${l.store}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.set(key, { normalizedName: l.normalizedName, store: l.store });
    }
  }

  if (uniqueKeys.size === 0) return {};

  // Fetch all relevant history in one query
  const allHistory = await prisma.priceHistory.findMany({
    where: {
      recordedAt: { gte: cutoff },
      OR: Array.from(uniqueKeys.values()).map(({ normalizedName, store }) => ({
        normalizedName,
        store,
      })),
    },
    select: {
      normalizedName: true,
      store: true,
      price: true,
    },
    orderBy: { recordedAt: 'asc' },
  });

  // Group history by normalizedName+store
  const historyMap = new Map<string, number[]>();
  for (const h of allHistory) {
    const key = `${h.normalizedName}||${h.store}`;
    if (!historyMap.has(key)) historyMap.set(key, []);
    historyMap.get(key)!.push(Number(h.price));
  }

  // Compute trends
  const result: Record<string, PriceTrend> = {};
  for (const l of lookups) {
    if (!l.normalizedName) continue;
    const key = `${l.normalizedName}||${l.store}`;
    const prices = historyMap.get(key) || [];
    result[l.id] = computeTrend(prices, l.price);
  }

  return result;
}

/**
 * Pure function to compute a trend from a price array + current price.
 */
function computeTrend(historicalPrices: number[], currentPrice: number): PriceTrend {
  const empty: PriceTrend = {
    badge: null,
    label: null,
    avgPrice: currentPrice,
    minPrice: currentPrice,
    maxPrice: currentPrice,
    previousPrice: null,
    dataPoints: 0,
  };

  if (historicalPrices.length < 2) return empty;

  const avg = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
  const min = Math.min(...historicalPrices);
  const max = Math.max(...historicalPrices);
  const previous = historicalPrices[historicalPrices.length - 1];

  let badge: PriceTrendBadge | null = null;
  let label: string | null = null;

  if (currentPrice <= min) {
    badge = 'best_price';
    label = 'Cel mai mic pret!';
  } else if (currentPrice < avg * 0.95) {
    badge = 'below_avg';
    label = 'Sub media';
  } else if (previous != null && currentPrice > previous * 1.05) {
    badge = 'price_increased';
    label = 'Pret crescut';
  } else if (currentPrice > avg * 1.10) {
    badge = 'above_avg';
    label = 'Peste media';
  }

  return {
    badge,
    label,
    avgPrice: Math.round(avg * 100) / 100,
    minPrice: Math.round(min * 100) / 100,
    maxPrice: Math.round(max * 100) / 100,
    previousPrice: previous != null ? Math.round(previous * 100) / 100 : null,
    dataPoints: historicalPrices.length,
  };
}

/**
 * Cleanup old price history entries.
 */
export async function cleanupOldHistory(months: number = 12): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const result = await prisma.priceHistory.deleteMany({
    where: {
      recordedAt: { lt: cutoff },
    },
  });

  return result.count;
}
