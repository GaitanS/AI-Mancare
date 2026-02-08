/**
 * Personalized Recommendations API
 * GET /api/recommendations?sessionId=xxx&limit=5
 *
 * Session-based collaborative filtering:
 * 1. Find what current session viewed
 * 2. Find other sessions that viewed the same recipes
 * 3. Get what those sessions viewed that current session hasn't
 * 4. Rank by frequency across sessions
 *
 * Cold start: return popular recipes by viewCount.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { normalizeDifficulty } from '@/lib/utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '6', 10) || 6), 20);
    const type = searchParams.get('type') || 'recipes'; // 'recipes' or 'products'

    if (!sessionId) {
      // No session = cold start
      return coldStartRecommendations(limit, type);
    }

    if (type === 'recipes') {
      return recipeRecommendations(sessionId, limit);
    } else {
      return productRecommendations(sessionId, limit);
    }
  } catch (error) {
    logger.error('Recommendations error', { error }, 'RecommendationsAPI');
    return NextResponse.json(
      { success: false, error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

/**
 * Collaborative filtering for recipe recommendations.
 */
async function recipeRecommendations(sessionId: string, limit: number) {
  // Step 1: Get recipes this session has viewed
  const myViews = await prisma.userInteraction.findMany({
    where: {
      sessionId,
      type: 'view',
      recipeId: { not: null },
    },
    select: { recipeId: true },
    distinct: ['recipeId'],
  });

  const myRecipeIds = myViews
    .map(v => v.recipeId)
    .filter((id): id is string => id !== null);

  if (myRecipeIds.length === 0) {
    // No history = cold start
    return coldStartRecommendations(limit, 'recipes');
  }

  // Step 2: Find other sessions that viewed the same recipes (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const similarSessions = await prisma.userInteraction.findMany({
    where: {
      type: 'view',
      recipeId: { in: myRecipeIds },
      sessionId: { not: sessionId },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { sessionId: true },
    distinct: ['sessionId'],
    take: 50, // Cap to avoid huge queries
  });

  const similarSessionIds = similarSessions.map(s => s.sessionId);

  if (similarSessionIds.length === 0) {
    return coldStartRecommendations(limit, 'recipes');
  }

  // Step 3: Get what those sessions viewed that we haven't
  const candidateViews = await prisma.userInteraction.findMany({
    where: {
      sessionId: { in: similarSessionIds },
      type: 'view',
      recipeId: { not: null, notIn: myRecipeIds },
    },
    select: { recipeId: true },
  });

  // Step 4: Count frequency across sessions
  const recipeFrequency = new Map<string, number>();
  for (const view of candidateViews) {
    if (view.recipeId) {
      recipeFrequency.set(view.recipeId, (recipeFrequency.get(view.recipeId) || 0) + 1);
    }
  }

  // Sort by frequency
  const topRecipeIds = Array.from(recipeFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topRecipeIds.length === 0) {
    return coldStartRecommendations(limit, 'recipes');
  }

  // Fetch full recipe data
  const recipes = await prisma.recipe.findMany({
    where: {
      id: { in: topRecipeIds },
      isPublished: true,
    },
  });

  // Maintain frequency order
  const recipeMap = new Map(recipes.map(r => [r.id, r]));
  const ordered = topRecipeIds
    .map(id => recipeMap.get(id))
    .filter(Boolean)
    .map(r => mapRecipe(r!));

  return NextResponse.json({
    success: true,
    data: {
      recommendations: ordered,
      source: 'collaborative',
      basedOn: myRecipeIds.length,
    },
  });
}

/**
 * Collaborative filtering for product recommendations.
 */
async function productRecommendations(sessionId: string, limit: number) {
  const now = new Date();

  // Get products this session has interacted with
  const myViews = await prisma.userInteraction.findMany({
    where: {
      sessionId,
      productId: { not: null },
    },
    select: { productId: true },
    distinct: ['productId'],
  });

  const myProductIds = myViews
    .map(v => v.productId)
    .filter((id): id is string => id !== null);

  if (myProductIds.length === 0) {
    // Cold start: popular products with discounts
    const popular = await prisma.product.findMany({
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
        discountPercentage: { gte: 10 },
      },
      orderBy: { discountPercentage: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: popular.map(mapProduct),
        source: 'popular',
      },
    });
  }

  // Find similar sessions
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const similarSessions = await prisma.userInteraction.findMany({
    where: {
      productId: { in: myProductIds },
      sessionId: { not: sessionId },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { sessionId: true },
    distinct: ['sessionId'],
    take: 50,
  });

  const similarSessionIds = similarSessions.map(s => s.sessionId);

  if (similarSessionIds.length === 0) {
    const popular = await prisma.product.findMany({
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
        discountPercentage: { gte: 10 },
      },
      orderBy: { discountPercentage: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: popular.map(mapProduct),
        source: 'popular',
      },
    });
  }

  const candidateViews = await prisma.userInteraction.findMany({
    where: {
      sessionId: { in: similarSessionIds },
      productId: { not: null, notIn: myProductIds },
    },
    select: { productId: true },
  });

  const productFrequency = new Map<string, number>();
  for (const view of candidateViews) {
    if (view.productId) {
      productFrequency.set(view.productId, (productFrequency.get(view.productId) || 0) + 1);
    }
  }

  const topProductIds = Array.from(productFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const products = await prisma.product.findMany({
    where: {
      id: { in: topProductIds },
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
  });

  const productMap = new Map(products.map(p => [p.id, p]));
  const ordered = topProductIds
    .map(id => productMap.get(id))
    .filter(Boolean)
    .map(p => mapProduct(p!));

  return NextResponse.json({
    success: true,
    data: {
      recommendations: ordered,
      source: 'collaborative',
      basedOn: myProductIds.length,
    },
  });
}

/**
 * Cold start: return popular items when no session history.
 */
async function coldStartRecommendations(limit: number, type: string) {
  if (type === 'recipes') {
    const popular = await prisma.recipe.findMany({
      where: { isPublished: true },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: popular.map(mapRecipe),
        source: 'popular',
      },
    });
  } else {
    const now = new Date();
    const popular = await prisma.product.findMany({
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: [{ discountPercentage: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: popular.map(mapProduct),
        source: 'popular',
      },
    });
  }
}

function mapRecipe(r: any) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    imageUrl: r.imageUrl,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    totalTime: r.totalTime,
    difficulty: normalizeDifficulty(r.difficulty),
    servings: r.servings,
    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
    cuisine: r.cuisine,
    viewCount: r.viewCount,
    isVegan: r.isVegan,
    isVegetarian: r.isVegetarian,
    isGlutenFree: r.isGlutenFree,
    isDairyFree: r.isDairyFree,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

function mapProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    discountPercentage: p.discountPercentage,
    unit: p.unit,
    store: p.store,
    validFrom: p.validFrom instanceof Date ? p.validFrom.toISOString() : p.validFrom,
    validUntil: p.validUntil instanceof Date ? p.validUntil.toISOString() : p.validUntil,
  };
}
