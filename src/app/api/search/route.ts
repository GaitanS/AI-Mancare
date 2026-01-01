import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cached, cache } from '@/lib/cache';
import type { Product, Recipe, ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface SearchResult {
  products: Product[];
  recipes: Recipe[];
}

// GET /api/search - Unified search across products and recipes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const type = searchParams.get('type'); // 'products', 'recipes', or undefined for both

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    const cacheKey = `search:${query}:${limit}:${type || 'all'}`;

    const result = await cached(
      cacheKey,
      300, // 5 minutes cache
      async () => {
        const now = new Date();
        const searchResult: SearchResult = {
          products: [],
          recipes: [],
        };

        // Search products
        if (!type || type === 'products') {
          const products = await prisma.product.findMany({
            where: {
              validFrom: { lte: now },
              validUntil: { gte: now },
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { brand: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } },
              ],
            },
            orderBy: [
              { discountPercentage: 'desc' },
              { createdAt: 'desc' },
            ],
            take: limit,
          });

          searchResult.products = products.map((p) => ({
            ...p,
            price: Number(p.price),
            originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
            extractionConfidence: p.extractionConfidence ? Number(p.extractionConfidence) : null,
            validFrom: p.validFrom.toISOString(),
            validUntil: p.validUntil.toISOString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
            nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
            allergens: p.allergens as string[] | null,
          }));
        }

        // Search recipes
        if (!type || type === 'recipes') {
          const recipes = await prisma.recipe.findMany({
            where: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { tags: { hasSome: [query.toLowerCase()] } },
              ],
            },
            orderBy: [
              { viewCount: 'desc' },
              { createdAt: 'desc' },
            ],
            take: limit,
          });

          searchResult.recipes = recipes.map((r) => ({
            ...r,
            estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
            costPerServing: r.costPerServing ? Number(r.costPerServing) : null,
            instructions: r.instructions as Recipe['instructions'],
            tips: r.tips as string[] | null,
            tags: r.tags as string[] | null,
            nutritionPerServing: r.nutritionPerServing as Recipe['nutritionPerServing'],
          }));
        }

        return searchResult;
      },
      cache
    );

    const response: ApiResponse<SearchResult> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error searching:', error);

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
    const body = await request.json();
    const query = body.query;

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [] },
      });
    }

    const cacheKey = `suggestions:${query}`;

    const suggestions = await cached(
      cacheKey,
      600, // 10 minutes cache
      async () => {
        const now = new Date();

        // Get product name suggestions
        const productNames = await prisma.product.findMany({
          where: {
            validFrom: { lte: now },
            validUntil: { gte: now },
            name: { contains: query, mode: 'insensitive' },
          },
          select: { name: true },
          distinct: ['name'],
          take: 5,
        });

        // Get recipe title suggestions
        const recipeTitles = await prisma.recipe.findMany({
          where: {
            title: { contains: query, mode: 'insensitive' },
          },
          select: { title: true },
          take: 5,
        });

        // Get category suggestions
        const categories = await prisma.product.findMany({
          where: {
            validFrom: { lte: now },
            validUntil: { gte: now },
            category: { contains: query, mode: 'insensitive' },
          },
          select: { category: true },
          distinct: ['category'],
          take: 3,
        });

        return [
          ...productNames.map((p) => ({ type: 'product', text: p.name })),
          ...recipeTitles.map((r) => ({ type: 'recipe', text: r.title })),
          ...categories.map((c) => ({ type: 'category', text: c.category })),
        ].slice(0, 10);
      },
      cache
    );

    return NextResponse.json({
      success: true,
      data: { suggestions },
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
