/**
 * CatalogSmart Price Index
 *
 * Calculeaza zilnic costul unui "cos standard" de 10 produse esentiale
 * in fiecare magazin si returneaza cel mai ieftin supermarket.
 *
 * Raspunde direct query-urilor:
 * - "cel mai ieftin supermarket din romania"
 * - "care este cel mai ieftin supermarket"
 * - "comparatie preturi supermarketuri"
 */

import prisma from '@/lib/db';
import { cache } from '@/lib/cache';
import { logger } from '@/lib/logger';

/**
 * Cosul standard CatalogSmart.
 * 10 produse esentiale dintr-o gospodarie romaneasca,
 * alese pentru a fi disponibile in majoritatea magazinelor.
 */
export const STANDARD_BASKET: readonly string[] = [
  'paine',
  'lapte',
  'oua',
  'ulei',
  'zahar',
  'faina',
  'piept de pui',
  'rosii',
  'cartofi',
  'branza',
] as const;

export interface BasketMatch {
  /** Ingredient from STANDARD_BASKET that this product was matched to */
  ingredient: string;
  /** Actual product name from the catalog */
  productName: string;
  /** Price in lei */
  price: number;
  /** Unit as stored in the catalog (e.g. "kg", "L", "buc", "500g") */
  unit: string;
  /** Discount percentage, if any */
  discount: number | null;
}

export interface StorePriceIndex {
  store: string;
  slug: string;
  total: number;
  itemsFound: number;
  missingItems: string[];
  /** The actual products that were summed to reach `total` — one per ingredient found */
  matches: BasketMatch[];
}

export interface PriceIndexResult {
  generatedAt: string;
  basket: readonly string[];
  stores: StorePriceIndex[];
  cheapest: StorePriceIndex | null;
  mostExpensive: StorePriceIndex | null;
  /** Diferenta in lei intre cel mai ieftin si cel mai scump magazin */
  maxSavings: number;
}

interface CachedProduct {
  name: string;
  nameLower: string;
  category: string | null;
  categoryLower: string | null;
  price: number;
  unit: string;
  discountPercentage: number | null;
  store: string;
}

interface CachedMapping {
  ingredientNameLower: string;
  keywords: string[];
  keywordsRawLower: string;
}

function slugifyStore(store: string): string {
  return store.toLowerCase().replace(/\s+/g, '-');
}

async function fetchActiveProducts(now: Date): Promise<CachedProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    select: {
      name: true,
      category: true,
      price: true,
      unit: true,
      discountPercentage: true,
      store: true,
    },
    orderBy: [{ price: 'asc' }],
  });

  return products.map(p => ({
    name: p.name,
    nameLower: p.name.toLowerCase(),
    category: p.category,
    categoryLower: p.category ? p.category.toLowerCase() : null,
    price: Number(p.price),
    unit: p.unit,
    discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
    store: p.store,
  }));
}

async function fetchMappings(): Promise<CachedMapping[]> {
  try {
    const mappings = await prisma.ingredientMapping.findMany({
      select: { ingredientName: true, keywords: true },
    });

    return mappings.map(m => {
      let keywords: string[] = [];
      try { keywords = JSON.parse(m.keywords); } catch { /* ignore */ }
      return {
        ingredientNameLower: m.ingredientName.toLowerCase(),
        keywords,
        keywordsRawLower: m.keywords.toLowerCase(),
      };
    });
  } catch {
    return [];
  }
}

function findCheapestForIngredient(
  products: CachedProduct[],
  mappings: CachedMapping[],
  ingredientName: string,
  store: string
): CachedProduct | null {
  const nameLower = ingredientName.toLowerCase();

  // Build search terms: use mapping keywords if available, else the ingredient name itself
  let searchTerms: string[] = [nameLower];
  const mapping = mappings.find(
    m => m.ingredientNameLower.includes(nameLower) || m.keywordsRawLower.includes(nameLower)
  );
  if (mapping && mapping.keywords.length > 0) {
    searchTerms = mapping.keywords.map(k => k.toLowerCase());
  }

  let best: CachedProduct | null = null;

  for (const product of products) {
    if (product.store !== store) continue;

    const matches = searchTerms.some(
      term => product.nameLower.includes(term) ||
              (product.categoryLower && product.categoryLower.includes(term))
    );

    if (matches && (best === null || product.price < best.price)) {
      best = product;
    }
  }

  return best;
}

async function computePriceIndex(): Promise<PriceIndexResult> {
  const now = new Date();

  const [stores, products, mappings] = await Promise.all([
    prisma.product.groupBy({
      by: ['store'],
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    }),
    fetchActiveProducts(now),
    fetchMappings(),
  ]);

  const storeResults: StorePriceIndex[] = [];

  for (const { store } of stores) {
    let total = 0;
    let itemsFound = 0;
    const missingItems: string[] = [];
    const matches: BasketMatch[] = [];

    for (const ingredient of STANDARD_BASKET) {
      const product = findCheapestForIngredient(products, mappings, ingredient, store);
      if (product) {
        total += product.price;
        itemsFound++;
        matches.push({
          ingredient,
          productName: product.name,
          price: Math.round(product.price * 100) / 100,
          unit: product.unit,
          discount: product.discountPercentage,
        });
      } else {
        missingItems.push(ingredient);
      }
    }

    // Skip stores that can't cover at least half the basket — not comparable
    if (itemsFound < STANDARD_BASKET.length / 2) continue;

    storeResults.push({
      store,
      slug: slugifyStore(store),
      total: Math.round(total * 100) / 100,
      itemsFound,
      missingItems,
      matches,
    });
  }

  // Sort ascending by total price
  storeResults.sort((a, b) => a.total - b.total);

  const cheapest = storeResults[0] || null;
  const mostExpensive = storeResults[storeResults.length - 1] || null;
  const maxSavings =
    cheapest && mostExpensive
      ? Math.round((mostExpensive.total - cheapest.total) * 100) / 100
      : 0;

  return {
    generatedAt: now.toISOString(),
    basket: STANDARD_BASKET,
    stores: storeResults,
    cheapest,
    mostExpensive,
    maxSavings,
  };
}

/**
 * Returneaza indexul de preturi, cu cache de 1 ora.
 */
export async function getPriceIndex(): Promise<PriceIndexResult> {
  return cache.getOrSet(
    'price-index:standard-basket',
    async () => {
      try {
        return await computePriceIndex();
      } catch (error) {
        logger.error('Failed to compute price index', { error }, 'PriceIndex');
        return {
          generatedAt: new Date().toISOString(),
          basket: STANDARD_BASKET,
          stores: [],
          cheapest: null,
          mostExpensive: null,
          maxSavings: 0,
        };
      }
    },
    3600
  );
}
