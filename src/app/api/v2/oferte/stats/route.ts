/**
 * Offer Statistics API
 * Cached aggregate statistics for dashboard
 */

import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'
import { productRepository } from '@/lib/repositories'

export async function GET(request: NextRequest) {
    const start = Date.now()

    try {
        // Try cache first (stats are expensive to compute)
        const cacheKey = CacheKeys.offersStats()
        const cached = await cache.get(cacheKey)

        if (cached) {
            logger.apiRequest(request, Date.now() - start, 200)
            return Response.json(cached, {
                headers: { 'X-Cache': 'HIT' }
            })
        }

        // Fetch from repository
        const stats = await productRepository.getStats()

        // Cache for 1 hour (stats don't need real-time updates)
        await cache.set(cacheKey, stats, CacheTTL.HOUR)

        logger.apiRequest(request, Date.now() - start, 200)
        return Response.json(stats, {
            headers: { 'X-Cache': 'MISS' }
        })
    } catch (error) {
        logger.apiRequest(request, Date.now() - start, 500)
        return handleApiError(error)
    }
}
