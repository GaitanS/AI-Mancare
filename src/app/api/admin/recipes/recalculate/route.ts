import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { verifyTokenFromRequest, unauthorizedResponse } from '@/lib/admin-auth';
import { recalculateAllRecipeCosts } from '@/lib/smart-recipes';

export const dynamic = 'force-dynamic';

// POST /api/admin/recipes/recalculate - Batch recalculate all recipe costs
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await verifyTokenFromRequest(request);
    if (!isAuthed) {
      return unauthorizedResponse();
    }

    logger.info('Admin triggered batch recipe cost recalculation', undefined, 'RecalculateAPI');

    const summary = await recalculateAllRecipeCosts();

    logger.info('Batch recipe cost recalculation complete', summary, 'RecalculateAPI');

    return NextResponse.json({
      success: true,
      data: {
        total: summary.total,
        updated: summary.updated,
        skipped: summary.skipped,
        errors: summary.errors,
      },
    });
  } catch (error) {
    logger.error('Failed to recalculate recipe costs', error as Error, 'RecalculateAPI');
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate recipe costs' },
      { status: 500 }
    );
  }
}
