/**
 * Database Stats API
 * Shows content statistics for admin dashboard
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/admin/db-stats
 * Returns content statistics for admin dashboard
 */
export async function GET() {
    try {
        const now = new Date()

        // Get counts in parallel
        const [productCount, recipeCount, storeGroups, categoryGroups] = await Promise.all([
            prisma.product.count({
                where: {
                    validFrom: { lte: now },
                    validUntil: { gte: now },
                },
            }),
            prisma.recipe.count(),
            prisma.product.groupBy({
                by: ['store'],
                where: {
                    validFrom: { lte: now },
                    validUntil: { gte: now },
                },
            }),
            prisma.product.groupBy({
                by: ['category'],
                where: {
                    validFrom: { lte: now },
                    validUntil: { gte: now },
                },
            }),
        ])

        return NextResponse.json({
            products: productCount,
            recipes: recipeCount,
            stores: storeGroups.length,
            categories: categoryGroups.length,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('Failed to get database stats:', error)
        return NextResponse.json({
            products: 0,
            recipes: 0,
            stores: 0,
            categories: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
