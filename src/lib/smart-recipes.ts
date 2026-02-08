/**
 * Smart Recipe Cost Engine
 *
 * Provides recipe cost recalculation based on current product prices,
 * best-value recipe discovery, and cross-store price comparison.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child('SmartRecipes');

// ─── Types ───

interface RecipeIngredient {
  id?: string;
  name: string;
  quantity: number | string;
  unit: string;
}

interface StorePrice {
  store: string;
  productName: string;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
}

interface IngredientComparison {
  name: string;
  stores: StorePrice[];
  cheapestStore: string;
}

interface CrossStoreResult {
  ingredients: IngredientComparison[];
  storeTotal: Record<string, number>;
  cheapestStore: string;
}

interface ValueRecipe {
  id: string;
  title: string;
  slug: string;
  servings: number;
  estimatedCost: number;
  costPerServing: number;
  matchedIngredients: number;
  totalIngredients: number;
  matchPercentage: number;
  imageUrl: string | null;
  totalTime: number | null;
  difficulty: string;
}

// ─── Helpers ───

/**
 * Parse the ingredientIds JSON field from a recipe.
 * Handles both JSON array of objects and comma-separated strings.
 */
function parseIngredients(raw: string): RecipeIngredient[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        id: item.id || undefined,
        name: typeof item === 'string' ? item : (item.name || ''),
        quantity: item.quantity || 1,
        unit: item.unit || 'buc',
      }));
    }
  } catch {
    // Comma-separated fallback
    return raw.split(',').map(s => ({
      name: s.trim(),
      quantity: 1,
      unit: 'buc',
    }));
  }
  return [];
}

// ─── Batch Product Cache ───

interface CachedProduct {
  id: string;
  name: string;
  nameLower: string;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  store: string;
}

/**
 * Fetch ALL active products once, sorted by price ascending.
 * Returns a lightweight array for in-memory matching.
 */
async function fetchAllActiveProducts(now: Date): Promise<CachedProduct[]> {
  const products = await prisma.product.findMany({
    where: { validUntil: { gte: now } },
    select: {
      id: true,
      name: true,
      price: true,
      originalPrice: true,
      discountPercentage: true,
      store: true,
    },
    orderBy: { price: 'asc' },
  });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    nameLower: p.name.toLowerCase(),
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    discountPercentage: p.discountPercentage,
    store: p.store,
  }));
}

/**
 * Find the cheapest product matching an ingredient name from a pre-fetched list.
 * Uses case-insensitive includes matching. Products are already sorted by price asc,
 * so the first match is the cheapest.
 */
function findCheapestProductLocal(
  allProducts: CachedProduct[],
  ingredientName: string,
  storeFilter?: string
): CachedProduct | null {
  const nameLower = ingredientName.toLowerCase();

  for (const product of allProducts) {
    if (!product.nameLower.includes(nameLower)) continue;
    if (storeFilter && product.store !== storeFilter) continue;
    return product;
  }

  return null;
}

// ─── Core Functions ───

/**
 * Recalculate a single recipe's estimatedCost based on current product prices.
 *
 * For each ingredient, finds the cheapest active product matching that name.
 * Sums up costs and updates the recipe's estimatedCost field.
 * Returns the new cost or null if not enough ingredients could be matched.
 */
export async function recalculateRecipeCost(recipeId: string): Promise<number | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { id: true, title: true, ingredientIds: true },
  });

  if (!recipe) {
    log.warn(`Recipe not found: ${recipeId}`);
    return null;
  }

  const ingredients = parseIngredients(recipe.ingredientIds);
  if (ingredients.length === 0) {
    log.warn(`No ingredients found for recipe: ${recipe.title}`, { recipeId });
    return null;
  }

  const now = new Date();
  const allProducts = await fetchAllActiveProducts(now);
  let totalCost = 0;
  let matchedCount = 0;

  for (const ingredient of ingredients) {
    const product = findCheapestProductLocal(allProducts, ingredient.name);
    if (product) {
      totalCost += product.price;
      matchedCount++;
    }
  }

  // Only update if we matched at least 40% of ingredients
  if (matchedCount < ingredients.length * 0.4) {
    log.info(`Not enough ingredient matches for "${recipe.title}": ${matchedCount}/${ingredients.length}`, { recipeId });
    return null;
  }

  const roundedCost = Math.round(totalCost * 100) / 100;

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { estimatedCost: roundedCost },
  });

  log.info(`Updated cost for "${recipe.title}": ${roundedCost} lei (${matchedCount}/${ingredients.length} matched)`, { recipeId });
  return roundedCost;
}

/**
 * Batch recalculate costs for all published recipes.
 * Returns a summary of how many were updated vs skipped.
 */
export async function recalculateAllRecipeCosts(): Promise<{
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}> {
  const recipes = await prisma.recipe.findMany({
    where: { isPublished: true },
    select: { id: true, title: true },
  });

  log.info(`Starting batch cost recalculation for ${recipes.length} published recipes`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipe of recipes) {
    try {
      const newCost = await recalculateRecipeCost(recipe.id);
      if (newCost !== null) {
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      log.error(`Error recalculating cost for "${recipe.title}"`, error as Error);
    }
  }

  const summary = { total: recipes.length, updated, skipped, errors };
  log.info('Batch cost recalculation complete', summary);
  return summary;
}

/**
 * Get recipes sorted by best value (lowest cost per serving).
 *
 * Only includes recipes where at least 60% of ingredients have active products.
 */
export async function getBestValueRecipes(limit: number = 10): Promise<ValueRecipe[]> {
  // Fetch published recipes that have an estimated cost
  const recipes = await prisma.recipe.findMany({
    where: {
      isPublished: true,
      estimatedCost: { not: null, gt: 0 },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      servings: true,
      estimatedCost: true,
      ingredientIds: true,
      imageUrl: true,
      totalTime: true,
      difficulty: true,
    },
    orderBy: { estimatedCost: 'asc' },
    // Fetch more than needed since we filter below
    take: limit * 3,
  });

  const now = new Date();
  const allProducts = await fetchAllActiveProducts(now);
  const scored: ValueRecipe[] = [];

  for (const recipe of recipes) {
    const ingredients = parseIngredients(recipe.ingredientIds);
    if (ingredients.length === 0) continue;

    let matchedCount = 0;
    for (const ingredient of ingredients) {
      const product = findCheapestProductLocal(allProducts, ingredient.name);
      if (product) matchedCount++;
    }

    const matchPercentage = matchedCount / ingredients.length;

    // Only include recipes with at least 60% ingredient availability
    if (matchPercentage < 0.6) continue;

    const cost = Number(recipe.estimatedCost);
    const servings = recipe.servings || 4;
    const costPerServing = Math.round((cost / servings) * 100) / 100;

    scored.push({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      servings,
      estimatedCost: cost,
      costPerServing,
      matchedIngredients: matchedCount,
      totalIngredients: ingredients.length,
      matchPercentage: Math.round(matchPercentage * 100),
      imageUrl: recipe.imageUrl,
      totalTime: recipe.totalTime,
      difficulty: recipe.difficulty,
    });
  }

  // Sort by cost per serving (ascending = best value first)
  scored.sort((a, b) => a.costPerServing - b.costPerServing);

  return scored.slice(0, limit);
}

/**
 * Compare prices for a list of ingredients across stores.
 *
 * For each ingredient, finds the cheapest product at each store.
 * Returns per-ingredient breakdowns and store totals.
 */
export async function getCrossStoreComparison(ingredientNames: string[]): Promise<CrossStoreResult> {
  const now = new Date();

  // Dynamically fetch active stores instead of hardcoding
  const storeResults = await prisma.product.groupBy({
    by: ['store'],
    where: { validUntil: { gte: now } },
    _count: true,
  });
  const stores = storeResults.map(s => s.store);

  // Batch-fetch all active products once
  const allProducts = await fetchAllActiveProducts(now);

  const ingredientResults: IngredientComparison[] = [];
  const storeTotals: Record<string, number> = {};

  // Initialize store totals
  for (const store of stores) {
    storeTotals[store] = 0;
  }

  for (const ingredientName of ingredientNames) {
    const storeResults: StorePrice[] = [];
    let cheapestPrice = Infinity;
    let cheapestStore = '';

    for (const store of stores) {
      const product = findCheapestProductLocal(allProducts, ingredientName, store);

      if (product) {
        storeResults.push({
          store: product.store,
          productName: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          discountPercentage: product.discountPercentage,
        });

        storeTotals[store] += product.price;

        if (product.price < cheapestPrice) {
          cheapestPrice = product.price;
          cheapestStore = store;
        }
      }
    }

    ingredientResults.push({
      name: ingredientName,
      stores: storeResults,
      cheapestStore: cheapestStore || 'N/A',
    });
  }

  // Round store totals
  for (const store of stores) {
    storeTotals[store] = Math.round(storeTotals[store] * 100) / 100;
  }

  // Determine the overall cheapest store
  let overallCheapest = '';
  let lowestTotal = Infinity;
  for (const [store, total] of Object.entries(storeTotals)) {
    if (total > 0 && total < lowestTotal) {
      lowestTotal = total;
      overallCheapest = store;
    }
  }

  return {
    ingredients: ingredientResults,
    storeTotal: storeTotals,
    cheapestStore: overallCheapest || 'N/A',
  };
}
