/**
 * Database Stats API
 * Shows content statistics for admin dashboard
 */

import { NextResponse } from 'next/server'

/**
 * GET /api/admin/db-stats
 * Returns content statistics for admin dashboard
 */
export async function GET() {
    try {
        // Dynamic import to avoid edge runtime issues
        const { default: prisma } = await import('@/lib/db')

        let productCount = 0
        let recipeCount = 0
        let storeCount = 0
        let categoryCount = 0

        try {
            productCount = await prisma.product.count()
        } catch (e) {
            console.error('Product count error:', e)
        }

        try {
            recipeCount = await prisma.recipe.count()
        } catch (e) {
            console.error('Recipe count error:', e)
        }

        try {
            const stores = await prisma.product.groupBy({ by: ['store'] })
            storeCount = stores.length
        } catch (e) {
            console.error('Store groupBy error:', e)
        }

        try {
            const categories = await prisma.product.groupBy({ by: ['category'] })
            categoryCount = categories.length
        } catch (e) {
            console.error('Category groupBy error:', e)
        }

        return NextResponse.json({
            products: productCount,
            recipes: recipeCount,
            stores: storeCount,
            categories: categoryCount,
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
