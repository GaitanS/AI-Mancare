/**
 * Admin Status API
 * Combined dashboard for AI budget and catalog stats
 */

import { NextResponse } from 'next/server';
import { CatalogExtractor } from '@/lib/ai/catalog-extractor';
import { CatalogTracker } from '@/lib/catalog-tracker';

/**
 * GET /api/admin/status
 * Returns combined status of AI budget and catalog processing
 */
export async function GET() {
    try {
        const isPaused = CatalogExtractor.isPaused();
        const budget = CatalogExtractor.getBudgetStatus();
        const catalogStats = await CatalogTracker.getStats();

        // Calculate safety status
        const dailyOK = budget.daily.percentUsed < 80;
        const monthlyOK = budget.monthly.percentUsed < 80;
        const overallStatus = isPaused ? '🛑 PAUSED' :
            (!dailyOK || !monthlyOK) ? '🟡 WARNING' : '🟢 OK';

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),

            // Overall status
            status: overallStatus,
            isPaused,

            // Budget info
            budget: {
                daily: {
                    spent: budget.daily.spent,
                    limit: budget.daily.limit,
                    remaining: budget.daily.remaining,
                    percentUsed: Math.round(budget.daily.percentUsed),
                    status: budget.daily.percentUsed >= 90 ? '🔴 DANGER' :
                        budget.daily.percentUsed >= 80 ? '🟡 WARNING' : '🟢 OK'
                },
                monthly: {
                    spent: budget.monthly.spent,
                    limit: budget.monthly.limit,
                    remaining: budget.monthly.remaining,
                    percentUsed: Math.round(budget.monthly.percentUsed),
                    status: budget.monthly.percentUsed >= 90 ? '🔴 DANGER' :
                        budget.monthly.percentUsed >= 80 ? '🟡 WARNING' : '🟢 OK'
                },
                hardLimit: budget.hardLimit
            },

            // Catalog stats
            catalogs: {
                totalProcessed: catalogStats.total,
                byStore: catalogStats.byStore,
                lastProcessed: catalogStats.lastProcessed,
                totalProducts: catalogStats.totalProducts
            },

            // Safety checks
            safety: {
                dailyLimitOK: dailyOK,
                monthlyLimitOK: monthlyOK,
                canProcess: !isPaused && dailyOK && monthlyOK
            },

            // Actions
            actions: {
                pause: 'POST /api/admin/ai-budget with {"action": "pause"}',
                resume: 'POST /api/admin/ai-budget with {"action": "resume"}',
                trigger: 'POST /api/admin/trigger-processing',
                clearDb: 'POST /api/admin/clear-db'
            }
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to get admin status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
