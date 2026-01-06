/**
 * Admin Trigger Processing API
 * Manual trigger for catalog processing (with safety checks)
 */

import { NextRequest, NextResponse } from 'next/server';
import { CatalogTracker } from '@/lib/catalog-tracker';
import { CatalogExtractor } from '@/lib/ai/catalog-extractor';
import { logger } from '@/lib/logger';

// Processing limits
const LIMITS = {
    maxCatalogsPerRun: 5,
    maxProductsPerCatalog: 100,
    maxRecipesPerRun: 10,
};

/**
 * POST /api/admin/trigger-processing
 * Manually trigger catalog processing
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        logger.info('[TRIGGER] Manual processing triggered');

        // 1. Check if AI is paused
        if (CatalogExtractor.isPaused()) {
            return NextResponse.json({
                success: false,
                error: 'AI operations are currently paused',
                action: 'POST /api/admin/ai-budget with {"action": "resume"} to continue'
            }, { status: 400 });
        }

        // 2. Check budget
        const budget = CatalogExtractor.getBudgetStatus();

        if (budget.daily.percentUsed >= 90) {
            return NextResponse.json({
                success: false,
                error: 'Daily budget at 90%+ - processing blocked',
                budget: {
                    dailySpent: `$${budget.daily.spent.toFixed(2)}`,
                    dailyLimit: `$${budget.daily.limit}`
                }
            }, { status: 400 });
        }

        // 3. Get catalog stats
        const catalogStats = await CatalogTracker.getStats();

        // 4. Return status (actual processing would happen here)
        const duration = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            message: 'Processing check complete',
            limits: LIMITS,
            budget: {
                daily: {
                    spent: `$${budget.daily.spent.toFixed(4)}`,
                    limit: `$${budget.daily.limit}`,
                    percentUsed: `${budget.daily.percentUsed.toFixed(1)}%`
                },
                monthly: {
                    spent: `$${budget.monthly.spent.toFixed(4)}`,
                    limit: `$${budget.monthly.limit}`,
                    percentUsed: `${budget.monthly.percentUsed.toFixed(1)}%`
                }
            },
            catalogs: catalogStats,
            duration: `${duration}ms`,
            note: 'Full processing requires catalomat scraper implementation'
        });

    } catch (error) {
        logger.error('[TRIGGER] Processing failed:', error);

        return NextResponse.json({
            success: false,
            error: 'Processing failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/trigger-processing
 * Get processing status and limits
 */
export async function GET() {
    try {
        const isPaused = CatalogExtractor.isPaused();
        const budget = CatalogExtractor.getBudgetStatus();
        const catalogStats = await CatalogTracker.getStats();

        return NextResponse.json({
            status: isPaused ? '🛑 PAUSED' : '🟢 READY',
            canProcess: !isPaused && budget.daily.percentUsed < 90,
            limits: LIMITS,
            budget: {
                daily: {
                    spent: `$${budget.daily.spent.toFixed(4)}`,
                    limit: `$${budget.daily.limit}`,
                    remaining: `$${budget.daily.remaining.toFixed(4)}`,
                    status: budget.daily.percentUsed >= 90 ? '🔴 LIMIT' :
                        budget.daily.percentUsed >= 80 ? '🟡 WARNING' : '🟢 OK'
                },
                monthly: {
                    spent: `$${budget.monthly.spent.toFixed(4)}`,
                    limit: `$${budget.monthly.limit}`,
                    remaining: `$${budget.monthly.remaining.toFixed(4)}`,
                    status: budget.monthly.percentUsed >= 90 ? '🔴 LIMIT' :
                        budget.monthly.percentUsed >= 80 ? '🟡 WARNING' : '🟢 OK'
                }
            },
            catalogs: catalogStats
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to get status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
