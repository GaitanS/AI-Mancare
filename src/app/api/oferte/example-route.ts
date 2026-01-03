/**
 * Example API Route - Offers Endpoint
 * Demonstrates usage of all P0 security improvements:
 * - Environment validation
 * - Error handling
 * - Request logging
 * - Input validation
 */

import { NextRequest } from 'next/server'
import { OfferQuerySchema } from '@/lib/validators/offer'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
    const start = Date.now()

    try {
        const { searchParams } = new URL(request.url)

        // ✅ P0.5: Input validation with Zod
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

        const skip = (query.page - 1) * query.limit

        // Build where clause
        const where = {
            ...(query.store && { storeId: query.store }),
            ...(query.category && { category: query.category }),
            ...(query.minPrice && { price: { gte: query.minPrice } }),
            ...(query.maxPrice && { price: { lte: query.maxPrice } }),
            ...(query.minDiscount && { discount: { gte: query.minDiscount } }),
            ...(query.validOnly && { validUntil: { gte: new Date() } })
        }

        // Fetch data
        const [offers, total] = await Promise.all([
            prisma.offer.findMany({
                where,
                skip,
                take: query.limit,
                orderBy: { [query.sortBy]: query.sortOrder },
                include: {
                    store: { select: { id: true, name: true, logo: true } }
                }
            }),
            prisma.offer.count({ where })
        ])

        const duration = Date.now() - start

        // ✅ P0.3: Request logging
        logger.apiRequest(request, duration, 200)

        return Response.json({
            data: offers,
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit)
            }
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        })
    } catch (error) {
        const duration = Date.now() - start

        // ✅ P0.3: Error logging
        logger.apiRequest(request, duration, error instanceof Error ? 422 : 500)

        // ✅ P0.2: Consistent error handling
        return handleApiError(error)
    }
}
