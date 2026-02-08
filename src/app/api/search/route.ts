import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { normalizeDifficulty } from '@/lib/utils';
import { expandQuery } from '@/lib/search/fuzzy';
import { fulltextSearchProducts, fulltextSearchRecipes } from '@/lib/search/fulltext';
import { groupSimilarProducts, type DedupGroup } from '@/lib/search/dedup';
import { semanticSearch } from '@/lib/search/semantic';
import { withRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type { Product, Recipe, ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

const searchRateLimit = withRateLimit({ limit: 60, windowMs: 60 * 1000, keyPrefix: 'api-search' });
const suggestRateLimit = withRateLimit({ limit: 120, windowMs: 60 * 1000, keyPrefix: 'api-suggest' });

interface SearchResult {
  products: Product[];
  recipes: Recipe[];
  /** Deduplicated product groups (only when dedup=true) */
  productGroups?: DedupGroup[];
  /** Which search tier produced results */
  searchTier?: 'fulltext' | 'fuzzy' | 'semantic' | 'like';
}

/**
 * Sanitize search input to prevent XSS/injection attacks
 */
function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>'"`;\\]/g, '') // Remove potential XSS/injection chars
    .trim()
    .substring(0, 200); // Max query length
}

// Lightweight select for recipe search results - excludes heavy fields
const recipeSearchSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  imageUrl: true,
  difficulty: true,
  totalTime: true,
  estimatedCost: true,
  servings: true,
  tags: true,
  isVegetarian: true,
  isVegan: true,
  isGlutenFree: true,
  isDairyFree: true,
  calories: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  ingredientIds: true,
} as const;

// GET /api/search - Unified tiered search across products and recipes
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await searchRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(request.url);

    const rawQuery = searchParams.get('q');
    const query = rawQuery ? sanitizeSearchQuery(rawQuery) : null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const type = searchParams.get('type'); // 'products', 'recipes', or undefined for both
    const dedup = searchParams.get('dedup') === 'true';

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const searchResult: SearchResult = {
      products: [],
      recipes: [],
      searchTier: 'like',
    };

    // ========================================
    // TIER 1: MySQL FULLTEXT Search (fastest, relevance-ranked)
    // ========================================
    let productCount = 0;
    let recipeCount = 0;

    {
      const wantProducts = !type || type === 'products';
      const wantRecipes = !type || type === 'recipes';

      const [ftProducts, ftRecipes] = await Promise.all([
        wantProducts ? fulltextSearchProducts(query, limit) : Promise.resolve([]),
        wantRecipes ? fulltextSearchRecipes(query, limit) : Promise.resolve([]),
      ]);

      if (ftProducts.length > 0) {
        searchResult.products = ftProducts.map(mapProductResult);
        productCount = ftProducts.length;
        searchResult.searchTier = 'fulltext';
      }

      if (ftRecipes.length > 0) {
        searchResult.recipes = ftRecipes.map(mapRecipeResult);
        recipeCount = ftRecipes.length;
        searchResult.searchTier = 'fulltext';
      }
    }

    // ========================================
    // TIER 2: Fuzzy expanded LIKE search (if Tier 1 < 3 results)
    // ========================================
    const needsFuzzyProducts = (!type || type === 'products') && productCount < 3;
    const needsFuzzyRecipes = (!type || type === 'recipes') && recipeCount < 3;

    if (needsFuzzyProducts || needsFuzzyRecipes) {
      const queryVariants = expandQuery(query);

      const [fuzzyProducts, fuzzyRecipes] = await Promise.all([
        needsFuzzyProducts ? searchProductsWithVariants(queryVariants, now, limit) : Promise.resolve([]),
        needsFuzzyRecipes ? searchRecipesWithVariants(queryVariants, limit) : Promise.resolve([]),
      ]);

      if (needsFuzzyProducts && fuzzyProducts.length > productCount) {
        // Merge: keep fulltext results first, then add fuzzy results
        const existingIds = new Set(searchResult.products.map(p => p.id));
        const newProducts = fuzzyProducts
          .filter(p => !existingIds.has(p.id))
          .map(mapPrismaProduct);
        searchResult.products = [...searchResult.products, ...newProducts].slice(0, limit);
        if (searchResult.searchTier !== 'fulltext') {
          searchResult.searchTier = 'fuzzy';
        }
      }

      if (needsFuzzyRecipes && fuzzyRecipes.length > recipeCount) {
        const existingIds = new Set(searchResult.recipes.map(r => r.id));
        const newRecipes = fuzzyRecipes
          .filter(r => !existingIds.has(r.id))
          .map(mapPrismaRecipe);
        searchResult.recipes = [...searchResult.recipes, ...newRecipes].slice(0, limit);
        if (searchResult.searchTier !== 'fulltext') {
          searchResult.searchTier = 'fuzzy';
        }
      }
    }

    // ========================================
    // TIER 3: Semantic Search via AI keyword expansion (if still < 2 results)
    // ========================================
    const needsSemanticProducts = (!type || type === 'products') && searchResult.products.length < 2;
    const needsSemanticRecipes = (!type || type === 'recipes') && searchResult.recipes.length < 2;

    if (needsSemanticProducts || needsSemanticRecipes) {
      try {
        const semantic = await semanticSearch(query, limit);

        const fetchProducts = (needsSemanticProducts && semantic.productIds.length > 0)
          ? prisma.product.findMany({ where: { id: { in: semantic.productIds } } })
          : Promise.resolve([]);

        const fetchRecipes = (needsSemanticRecipes && semantic.recipeIds.length > 0)
          ? prisma.recipe.findMany({ where: { id: { in: semantic.recipeIds } }, select: recipeSearchSelect })
          : Promise.resolve([]);

        const [semProducts, semRecipes] = await Promise.all([fetchProducts, fetchRecipes]);

        if (semProducts.length > 0) {
          const existingIds = new Set(searchResult.products.map(p => p.id));
          const newProducts = semProducts
            .filter((p: any) => !existingIds.has(p.id))
            .map(mapPrismaProduct);
          searchResult.products = [...searchResult.products, ...newProducts].slice(0, limit);
          if (newProducts.length > 0) searchResult.searchTier = 'semantic';
        }

        if (semRecipes.length > 0) {
          const existingIds = new Set(searchResult.recipes.map(r => r.id));
          const newRecipes = (semRecipes as any[])
            .filter((r: any) => !existingIds.has(r.id))
            .map(mapPrismaRecipe);
          searchResult.recipes = [...searchResult.recipes, ...newRecipes].slice(0, limit);
          if (newRecipes.length > 0) searchResult.searchTier = 'semantic';
        }
      } catch {
        // Semantic search is non-critical; fall through to LIKE
      }
    }

    // ========================================
    // TIER 4: Basic LIKE fallback (last resort)
    // ========================================
    const needsLikeProducts = (!type || type === 'products') && searchResult.products.length < 2;
    const needsLikeRecipes = (!type || type === 'recipes') && searchResult.recipes.length < 2;

    if (needsLikeProducts || needsLikeRecipes) {
      const [likeProducts, likeRecipes] = await Promise.all([
        needsLikeProducts
          ? prisma.product.findMany({
              where: {
                validFrom: { lte: now },
                validUntil: { gte: now },
                OR: [
                  { name: { contains: query } },
                  { brand: { contains: query } },
                  { category: { contains: query } },
                ],
              },
              orderBy: [
                { discountPercentage: 'desc' },
                { createdAt: 'desc' },
              ],
              take: limit,
            })
          : Promise.resolve([]),
        needsLikeRecipes
          ? prisma.recipe.findMany({
              where: {
                OR: [
                  { title: { contains: query } },
                  { description: { contains: query } },
                ],
              },
              select: recipeSearchSelect,
              orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
              take: limit,
            })
          : Promise.resolve([]),
      ]);

      if (needsLikeProducts && likeProducts.length > 0) {
        const existingIds = new Set(searchResult.products.map(p => p.id));
        const newProducts = likeProducts
          .filter((p: any) => !existingIds.has(p.id))
          .map(mapPrismaProduct);
        searchResult.products = [...searchResult.products, ...newProducts].slice(0, limit);
      }

      if (needsLikeRecipes && likeRecipes.length > 0) {
        const existingIds = new Set(searchResult.recipes.map(r => r.id));
        const newRecipes = (likeRecipes as any[])
          .filter((r: any) => !existingIds.has(r.id))
          .map(mapPrismaRecipe);
        searchResult.recipes = [...searchResult.recipes, ...newRecipes].slice(0, limit);
      }
    }

    // ========================================
    // Optional: Cross-store deduplication
    // ========================================
    if (dedup && searchResult.products.length > 0) {
      searchResult.productGroups = groupSimilarProducts(
        searchResult.products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand || null,
          price: typeof p.price === 'number' ? p.price : Number(p.price),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
          discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
          store: p.store,
          unit: p.unit || null,
          imageUrl: p.sourceUrl || null,
        }))
      );
    }

    // Track search interaction (fire-and-forget)
    prisma.userInteraction.create({
      data: {
        sessionId: request.headers.get('x-session-id') || 'anonymous',
        type: 'search',
        metadata: JSON.stringify({
          query,
          tier: searchResult.searchTier,
          productCount: searchResult.products.length,
          recipeCount: searchResult.recipes.length,
        }),
      }
    }).catch((err) => { logger.warn('Failed to track search interaction', { query, error: err?.message }, 'SearchAPI'); });

    const response: ApiResponse<SearchResult> = {
      success: true,
      data: searchResult,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    logger.error('Error searching', { error }, 'SearchAPI');

    const response: ApiResponse = {
      success: false,
      error: 'Search failed',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/search/suggestions - Get search suggestions (autocomplete)
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await suggestRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    const query = body.query ? sanitizeSearchQuery(String(body.query)) : null;

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [] },
      });
    }

    const now = new Date();

    // Expand query for fuzzy autocomplete
    const variants = expandQuery(query);
    const primaryQuery = variants[0]; // original query

    // Run all three suggestion queries in parallel
    const [productNames, recipeTitles, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          validFrom: { lte: now },
          validUntil: { gte: now },
          OR: variants.slice(0, 3).map(v => ({
            name: { contains: v },
          })),
        },
        select: { name: true },
        distinct: ['name'],
        take: 5,
      }),
      prisma.recipe.findMany({
        where: {
          OR: variants.slice(0, 3).map(v => ({
            title: { contains: v },
          })),
        },
        select: { title: true },
        take: 5,
      }),
      prisma.product.findMany({
        where: {
          validFrom: { lte: now },
          validUntil: { gte: now },
          OR: variants.slice(0, 3).map(v => ({
            category: { contains: v },
          })),
        },
        select: { category: true },
        distinct: ['category'],
        take: 3,
      }),
    ]);

    const suggestions = [
      ...productNames.map((p: { name: string }) => ({ type: 'product', text: p.name })),
      ...recipeTitles.map((r: { title: string }) => ({ type: 'recipe', text: r.title })),
      ...categories.map((c: { category: string }) => ({ type: 'category', text: c.category })),
    ].slice(0, 10);

    return NextResponse.json({
      success: true,
      data: { suggestions },
    });
  } catch (error) {
    logger.error('Error getting suggestions', { error }, 'SearchAPI');

    return NextResponse.json(
      { success: false, error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

// ========================================
// Helper: Search products using multiple query variants
// ========================================
async function searchProductsWithVariants(
  variants: string[],
  now: Date,
  limit: number
): Promise<any[]> {
  // Build OR conditions from all variants (cap at 5 to avoid huge queries)
  const orConditions = variants.slice(0, 5).flatMap(v => [
    { name: { contains: v } },
    { brand: { contains: v } },
  ]);

  return prisma.product.findMany({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now },
      OR: orConditions,
    },
    orderBy: [
      { discountPercentage: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  });
}

// ========================================
// Helper: Search recipes using multiple query variants
// ========================================
async function searchRecipesWithVariants(
  variants: string[],
  limit: number
): Promise<any[]> {
  const orConditions = variants.slice(0, 5).flatMap(v => [
    { title: { contains: v } },
    { description: { contains: v } },
  ]);

  return prisma.recipe.findMany({
    where: { OR: orConditions },
    select: recipeSearchSelect,
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

// ========================================
// Mappers: Convert raw results to API types
// ========================================
function mapProductResult(p: any): Product {
  return {
    ...p,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
    validFrom: p.validFrom instanceof Date ? p.validFrom.toISOString() : p.validFrom,
    validUntil: p.validUntil instanceof Date ? p.validUntil.toISOString() : p.validUntil,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

function mapPrismaProduct(p: any): Product {
  return {
    ...p,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
    validFrom: p.validFrom.toISOString(),
    validUntil: p.validUntil.toISOString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
    allergens: p.allergens as string[] | null,
  };
}

function mapRecipeResult(r: any): Recipe {
  return {
    ...r,
    difficulty: normalizeDifficulty(r.difficulty),
    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt?.toISOString() : r.updatedAt,
  };
}

function mapPrismaRecipe(r: any): Recipe {
  return {
    ...r,
    difficulty: normalizeDifficulty(r.difficulty),
    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
    instructions: r.instructions as Recipe['instructions'],
    tips: r.tips as string[] | null,
    tags: r.tags as string[] | null,
    nutritionPerServing: r.nutritionPerServing as Recipe['nutritionPerServing'],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
