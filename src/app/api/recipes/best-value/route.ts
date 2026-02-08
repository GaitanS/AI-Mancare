import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getBestValueRecipes } from '@/lib/smart-recipes';

export const dynamic = 'force-dynamic';

// GET /api/recipes/best-value - Get recipes sorted by best value (lowest cost per serving)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '10', 10), 1),
      50
    );

    const recipes = await getBestValueRecipes(limit);

    return NextResponse.json(
      { success: true, data: recipes },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to fetch best-value recipes', error as Error, 'BestValueAPI');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch best-value recipes' },
      { status: 500 }
    );
  }
}
