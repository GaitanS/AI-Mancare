/**
 * AI Budget Monitoring & Control API
 * Shows current AI spending and allows pause/resume
 */

import { NextRequest, NextResponse } from 'next/server'
import { CatalogExtractor } from '@/lib/ai/catalog-extractor'

/**
 * GET /api/admin/ai-budget
 * Returns AI budget status and spending
 */
export async function GET() {
    try {
        const status = CatalogExtractor.getBudgetStatus()
        const isPaused = CatalogExtractor.isPaused()

        return NextResponse.json({
            success: true,
            status: isPaused ? '🛑 PAUSED' : '🟢 ACTIVE',
            budget: {
                daily: {
                    spent: `$${status.daily.spent.toFixed(4)}`,
                    limit: `$${status.daily.limit}`,
                    remaining: `$${status.daily.remaining.toFixed(4)}`,
                    percentUsed: `${status.daily.percentUsed.toFixed(1)}%`,
                    status: status.daily.percentUsed >= 100 ? '🔴 EXCEEDED' :
                        status.daily.percentUsed >= 80 ? '🟡 WARNING' : '🟢 OK'
                },
                monthly: {
                    spent: `$${status.monthly.spent.toFixed(4)}`,
                    limit: `$${status.monthly.limit}`,
                    remaining: `$${status.monthly.remaining.toFixed(4)}`,
                    percentUsed: `${status.monthly.percentUsed.toFixed(1)}%`,
                    status: status.monthly.percentUsed >= 100 ? '🔴 EXCEEDED' :
                        status.monthly.percentUsed >= 80 ? '🟡 WARNING' : '🟢 OK'
                },
                hardLimit: {
                    limit: `$${status.hardLimit.limit}`,
                    remaining: `$${status.hardLimit.remaining.toFixed(4)}`
                }
            },
            actions: {
                resume: 'POST /api/admin/ai-budget with {"action": "resume"}',
                pause: 'POST /api/admin/ai-budget with {"action": "pause", "reason": "optional reason"}'
            },
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to get AI budget status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

/**
 * POST /api/admin/ai-budget
 * Resume or pause AI operations
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, reason } = body

        if (action === 'resume') {
            const result = CatalogExtractor.resume()
            return NextResponse.json({
                success: result.success,
                message: result.message,
                status: '🟢 AI OPERATIONS RESUMED'
            })
        }

        if (action === 'pause') {
            CatalogExtractor.pause(reason || 'Manually paused via API')
            return NextResponse.json({
                success: true,
                message: 'AI operations paused',
                status: '🛑 AI OPERATIONS PAUSED',
                reason: reason || 'Manually paused via API'
            })
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action. Use "resume" or "pause"'
        }, { status: 400 })

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to control AI operations',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
