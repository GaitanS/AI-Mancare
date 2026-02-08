import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getCrossStoreComparison } from '@/lib/smart-recipes';

export const dynamic = 'force-dynamic';

// GET /api/recipes/compare - Compare ingredient prices across stores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ingredientsParam = searchParams.get('ingredients');

    if (!ingredientsParam) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: ingredients' },
        { status: 400 }
      );
    }

    const ingredientNames = ingredientsParam
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (ingredientNames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one ingredient name is required' },
        { status: 400 }
      );
    }

    const comparison = await getCrossStoreComparison(ingredientNames);

    return NextResponse.json(
      {
        success: true,
        data: {
          ingredients: comparison.ingredients,
          storeTotal: comparison.storeTotal,
          cheapestStore: comparison.cheapestStore,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to compare ingredient prices', error as Error, 'CompareAPI');
    return NextResponse.json(
      { success: false, error: 'Failed to compare ingredient prices' },
      { status: 500 }
    );
  }
}
