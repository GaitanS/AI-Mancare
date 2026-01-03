/**
 * Trending Offers API
 * Highly cached endpoint for homepage
 */

import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'
import { offerRepository } from '@/lib/repositories'

export async function GET(request: NextRequest) {
    const start = Date.now()

    try {
        const { searchParams } = new URL(request.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

        // Try cache first (trending offers change infrequently)
        const cacheKey = CacheKeys.offersTrending()
        const cached = await cache.get(cacheKey)

        if (cached) {
            logger.apiRequest(request, Date.now() - start, 200)
            return Response.json(cached, {
                headers: { 'X-Cache': 'HIT' }
            })
        }

        // Fetch from repository
        const offers = await offerRepository.findTrending(limit)

        // Cache for 15 minutes (trending offers don't change often)
        await cache.set(cacheKey, { data: offers }, CacheTTL.LONG)

        logger.apiRequest(request, Date.now() - start, 200)
        return Response.json({ data: offers }, {
            headers: { 'X-Cache': 'MISS' }
        })
    } catch (error) {
        logger.apiRequest(request, Date.now() - start, 500)
        return handleApiError(error)
    }
}
