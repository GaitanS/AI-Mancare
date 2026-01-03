/**
 * Metrics API Endpoint
 * Exposes Prometheus-compatible metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { metrics, Metrics } from '@/lib/metrics'
import { cache } from '@/lib/cache'

/**
 * GET /api/metrics
 * Returns metrics in Prometheus format or JSON
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'prometheus'

    // Update system metrics
    Metrics.updateSystemMetrics(process.memoryUsage())

    // Add cache stats to metrics
    const cacheStats = cache.getStats()
    metrics.setGauge('cache_keys_count', cacheStats.keys)
    metrics.setGauge('cache_hit_rate', cacheStats.hitRate * 100)

    if (format === 'json') {
        return NextResponse.json(metrics.toJSON())
    }

    // Prometheus format
    return new NextResponse(metrics.toPrometheusFormat(), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    })
}
