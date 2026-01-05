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
        // Simple counts without date filtering to avoid issues
        const [productCount, recipeCount] = await Promise.all([
            prisma.product.count(),
            prisma.recipe.count(),
        ])

        // Get unique stores and categories
        let storeCount = 0
        let categoryCount = 0

        try {
            const stores = await prisma.product.groupBy({ by: ['store'] })
            storeCount = stores.length
        } catch {
            // Ignore groupBy errors
        }

        try {
            const categories = await prisma.product.groupBy({ by: ['category'] })
            categoryCount = categories.length
        } catch {
            // Ignore groupBy errors
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
        }, { status: 200 }) // Return 200 even on error to not break frontend
    }
}
