/**
 * Main Offers/Products API
 * Full-featured endpoint with repository pattern, caching, and validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { OfferQuerySchema } from '@/lib/validators/offer'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'
import { productRepository } from '@/lib/repositories'
import { Metrics } from '@/lib/metrics'

/**
 * GET /api/oferte
 * Main endpoint for fetching product offers
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
            Metrics.httpRequest('GET', '/api/oferte', 200, duration)

            return NextResponse.json(cached, {
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

        // Transform for API response
        const response = {
            success: true,
            data: result.data.map(p => ({
                ...p,
                price: Number(p.price),
                originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                extractionConfidence: p.extractionConfidence ? Number(p.extractionConfidence) : null
            })),
            meta: result.meta
        }

        // Cache result
        await cache.set(cacheKey, response, CacheTTL.MEDIUM)

        const duration = Date.now() - start
        logger.apiRequest(request, duration, 200)
        Metrics.httpRequest('GET', '/api/oferte', 200, duration)

        return NextResponse.json(response, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        })
    } catch (error) {
        const duration = Date.now() - start
        logger.apiRequest(request, duration, 500)
        Metrics.httpRequest('GET', '/api/oferte', 500, duration)
        return handleApiError(error)
    }
}
