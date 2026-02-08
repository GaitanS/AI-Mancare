/**
 * Ingredient Co-Occurrence Analysis
 * Analyzes recipe data to find commonly paired ingredients,
 * then suggests complementary items for a shopping cart.
 */

import prisma from '@/lib/db';
import { stripDiacritics } from '@/lib/utils';

interface CoOccurrenceEntry {
  ingredientA: string;
  ingredientB: string;
  count: number;
}

interface IngredientSuggestion {
  name: string;
  reason: string;
  confidence: number; // 0-1, how strongly this pairs with cart items
  pairedWith: string; // which cart ingredient triggered this
}

// Singleton matrix + timestamp for cache invalidation
let _matrix: Map<string, Map<string, number>> | null = null;
let _matrixBuiltAt = 0;
const MATRIX_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalize ingredient name for comparison.
 * Strips diacritics, lowercases, removes common filler words.
 */
function normalizeIngredient(name: string): string {
  let norm = stripDiacritics(name.toLowerCase().trim());

  // Strip common prefixes/suffixes that don't affect pairing
  norm = norm
    .replace(/\b(de|din|cu|si|sau|pentru|la)\b/g, '')
    .replace(/\b(proaspat|proaspata|proaspete|congelat|conserva|uscat|uscata)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return norm;
}

/**
 * Build co-occurrence matrix from all recipes.
 * For each recipe, every pair of ingredients increments their co-occurrence count.
 */
export async function buildCoOccurrenceMatrix(): Promise<Map<string, Map<string, number>>> {
  const now = Date.now();

  // Return cached if fresh
  if (_matrix && (now - _matrixBuiltAt) < MATRIX_TTL_MS) {
    return _matrix;
  }

  const recipes = await prisma.recipe.findMany({
    select: { ingredientIds: true },
  });

  const matrix = new Map<string, Map<string, number>>();

  for (const recipe of recipes) {
    // Parse ingredientIds (JSON array of {name, quantity, unit} or string IDs)
    let ingredients: string[] = [];
    try {
      const parsed = typeof recipe.ingredientIds === 'string'
        ? JSON.parse(recipe.ingredientIds)
        : recipe.ingredientIds;

      if (Array.isArray(parsed)) {
        ingredients = parsed
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && item.name) return item.name;
            return null;
          })
          .filter(Boolean)
          .map((name: string) => normalizeIngredient(name));
      }
    } catch {
      continue;
    }

    // Remove duplicates within this recipe
    const unique = [...new Set(ingredients)].filter(i => i.length > 1);

    // Generate all pairs
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i];
        const b = unique[j];

        // Increment a -> b
        if (!matrix.has(a)) matrix.set(a, new Map());
        const aMap = matrix.get(a)!;
        aMap.set(b, (aMap.get(b) || 0) + 1);

        // Increment b -> a (symmetric)
        if (!matrix.has(b)) matrix.set(b, new Map());
        const bMap = matrix.get(b)!;
        bMap.set(a, (bMap.get(a) || 0) + 1);
      }
    }
  }

  _matrix = matrix;
  _matrixBuiltAt = now;

  return matrix;
}

/**
 * Suggest complementary ingredients based on what's already in the cart.
 * Returns items commonly paired with cart ingredients that aren't already in the cart.
 */
export async function suggestComplementary(
  cartIngredients: string[],
  topN: number = 5
): Promise<IngredientSuggestion[]> {
  const matrix = await buildCoOccurrenceMatrix();

  // Normalize cart ingredients
  const cartNormalized = new Set(
    cartIngredients.map(i => normalizeIngredient(i))
  );

  // Aggregate scores for potential suggestions
  const scores = new Map<string, { total: number; pairedWith: string; maxSingle: number }>();

  for (const cartItem of cartNormalized) {
    const pairs = matrix.get(cartItem);
    if (!pairs) continue;

    for (const [candidate, count] of pairs.entries()) {
      // Skip if already in cart
      if (cartNormalized.has(candidate)) continue;

      // Skip very generic ingredients (salt, water, oil)
      if (['sare', 'apa', 'ulei', 'piper'].includes(candidate)) continue;

      const existing = scores.get(candidate);
      if (existing) {
        existing.total += count;
        if (count > existing.maxSingle) {
          existing.maxSingle = count;
          existing.pairedWith = cartItem;
        }
      } else {
        scores.set(candidate, { total: count, pairedWith: cartItem, maxSingle: count });
      }
    }
  }

  // Sort by total score descending
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, topN);

  // Find max score for confidence normalization
  const maxScore = sorted.length > 0 ? sorted[0][1].total : 1;

  return sorted.map(([name, data]) => ({
    name,
    reason: `Apare frecvent în rețete cu ${data.pairedWith}`,
    confidence: Math.min(data.total / maxScore, 1),
    pairedWith: data.pairedWith,
  }));
}

/**
 * Force rebuild the co-occurrence matrix.
 * Useful after bulk recipe imports.
 */
export function invalidateMatrix(): void {
  _matrix = null;
  _matrixBuiltAt = 0;
}
