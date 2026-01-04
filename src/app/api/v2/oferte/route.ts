/**
 * Optimized Offers API Route
 * Uses: Repository pattern, Caching, Validation, Error handling, Logging
 */

import { NextRequest } from 'next/server'
import { OfferQuerySchema } from '@/lib/validators/offer'
import { handleApiError, NotFoundError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'
import { productRepository } from '@/lib/repositories'

/**
 * GET /api/v2/oferte
 * Fetch offers with filtering, pagination, caching
 */
export async function GET(request: NextRequest) {
    const start = Date.now()

    try {
        const { searchParams } = new URL(request.url)

        // Validate query parameters
        const query = OfferQuerySchema.parse({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
            store: searchParams.get('store'),
            category: searchParams.get('category'),
            minPrice: searchParams.get('minPrice'),
            maxPrice: searchParams.get('maxPrice'),
            minDiscount: searchParams.get('minDiscount'),
            validOnly: searchParams.get('validOnly'),
            sortBy: searchParams.get('sortBy'),
            sortOrder: searchParams.get('sortOrder')
        })

        // Build cache key
        const cacheKey = CacheKeys.offers(query)

        // Try cache first
        const cached = await cache.get(cacheKey)
        if (cached) {
            const duration = Date.now() - start
            logger.apiRequest(request, duration, 200)

            return Response.json(cached, {
                headers: {
                    'X-Cache': 'HIT',
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
                }
            })
        }

        // Fetch from repository
        const result = await productRepository.findMany(
            {
                store: query.store,
                category: query.category,
                minPrice: query.minPrice,
                maxPrice: query.maxPrice,
                minDiscount: query.minDiscount,
                validOnly: query.validOnly
            },
            { page: query.page, limit: query.limit },
            { sortBy: query.sortBy, sortOrder: query.sortOrder }
        )

        // Cache result
        await cache.set(cacheKey, result, CacheTTL.MEDIUM)

        const duration = Date.now() - start
        logger.apiRequest(request, duration, 200)

        return Response.json(result, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        })
    } catch (error) {
        const duration = Date.now() - start
        logger.apiRequest(request, duration, 500)
        return handleApiError(error)
    }
}

/**
 * POST /api/v2/oferte/invalidate
 * Invalidate offer cache (for admin/cron jobs)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { pattern } = body

        if (pattern) {
            const count = await cache.invalidatePattern(pattern)
            return Response.json({ invalidated: count })
        }

        // Invalidate all offer caches
        const count = await cache.invalidatePrefix('offers:')
        return Response.json({ invalidated: count })
    } catch (error) {
        return handleApiError(error)
    }
}
