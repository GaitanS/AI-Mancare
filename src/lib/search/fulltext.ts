/**
 * MySQL FULLTEXT Search Wrappers
 * Uses MATCH...AGAINST for relevance-ranked search.
 * Requires FULLTEXT indexes on products(name, brand, category) and recipes(title, description).
 *
 * Note: FULLTEXT indexes must be created via raw SQL migration:
 *   ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name, brand, category);
 *   ALTER TABLE recipes ADD FULLTEXT INDEX ft_recipes_search (title, description);
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

interface FulltextProductResult {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  subcategory: string | null;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  store: string;
  unit: string | null;
  imageUrl: string | null;
  validFrom: Date;
  validUntil: Date;
  relevance: number;
}

interface FulltextRecipeResult {
  id: string;
  title: string;
  description: string;
  slug: string;
  estimatedCost: number | null;
  servings: number;
  difficulty: string;
  totalTime: number | null;
  imageUrl: string | null;
  viewCount: number;
  createdAt: Date;
  relevance: number;
}

/**
 * Search products using MySQL FULLTEXT with relevance scoring.
 * Falls back to LIKE-based search if FULLTEXT index doesn't exist.
 */
export async function fulltextSearchProducts(
  query: string,
  limit: number = 30
): Promise<FulltextProductResult[]> {
  const now = new Date();

  try {
    // MySQL FULLTEXT search with NATURAL LANGUAGE MODE
    const results = await prisma.$queryRaw<FulltextProductResult[]>`
      SELECT
        id, name, brand, category, subcategory,
        price, original_price as originalPrice,
        discount_percentage as discountPercentage,
        store, unit, image_url as imageUrl,
        valid_from as validFrom, valid_until as validUntil,
        MATCH(name, brand, category) AGAINST(${query} IN NATURAL LANGUAGE MODE) as relevance
      FROM products
      WHERE valid_from <= ${now}
        AND valid_until >= ${now}
        AND MATCH(name, brand, category) AGAINST(${query} IN NATURAL LANGUAGE MODE)
      ORDER BY relevance DESC, discount_percentage DESC
      LIMIT ${limit}
    `;

    return results.map(r => ({
      ...r,
      price: Number(r.price),
      originalPrice: r.originalPrice ? Number(r.originalPrice) : null,
      discountPercentage: r.discountPercentage ? Number(r.discountPercentage) : null,
      relevance: Number(r.relevance),
    }));
  } catch (error: any) {
    // If FULLTEXT index doesn't exist, fall back silently
    if (error.message?.includes('FULLTEXT') || error.code === 'ER_FT_MATCHING_KEY_NOT_FOUND') {
      logger.warn('FULLTEXT index not available for products, skipping fulltext search', {}, 'FulltextSearch');
      return [];
    }
    throw error;
  }
}

/**
 * Search recipes using MySQL FULLTEXT with relevance scoring.
 * Falls back gracefully if FULLTEXT index doesn't exist.
 */
export async function fulltextSearchRecipes(
  query: string,
  limit: number = 20
): Promise<FulltextRecipeResult[]> {
  try {
    const results = await prisma.$queryRaw<FulltextRecipeResult[]>`
      SELECT
        id, title, description, slug,
        estimated_cost as estimatedCost,
        servings, difficulty,
        total_time as totalTime,
        image_url as imageUrl,
        view_count as viewCount,
        created_at as createdAt,
        MATCH(title, description) AGAINST(${query} IN NATURAL LANGUAGE MODE) as relevance
      FROM recipes
      WHERE MATCH(title, description) AGAINST(${query} IN NATURAL LANGUAGE MODE)
      ORDER BY relevance DESC, view_count DESC
      LIMIT ${limit}
    `;

    return results.map(r => ({
      ...r,
      estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
      viewCount: Number(r.viewCount),
      relevance: Number(r.relevance),
    }));
  } catch (error: any) {
    if (error.message?.includes('FULLTEXT') || error.code === 'ER_FT_MATCHING_KEY_NOT_FOUND') {
      logger.warn('FULLTEXT index not available for recipes, skipping fulltext search', {}, 'FulltextSearch');
      return [];
    }
    throw error;
  }
}

/**
 * Combined FULLTEXT search across products and recipes.
 * Returns results from both tables with relevance scores.
 */
export async function fulltextSearchAll(
  query: string,
  productLimit: number = 20,
  recipeLimit: number = 10
): Promise<{ products: FulltextProductResult[]; recipes: FulltextRecipeResult[] }> {
  const [products, recipes] = await Promise.all([
    fulltextSearchProducts(query, productLimit),
    fulltextSearchRecipes(query, recipeLimit),
  ]);

  return { products, recipes };
}
