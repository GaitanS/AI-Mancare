import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
    try {
        // Middleware handles auth check via cookie.

        // Delete all data
        // Order matters if there are foreign keys, but Prisma deleteMany without args deletes all.
        // We start with dependent tables if any (e.g. Recipe ingredients if separate).
        // Based on schema, strict relation might require cascade or cleaning specific tables.
        // Assuming simple schema:

        // 1. Clean User Session Data (dependent on partials)
        await prisma.weeklyMenu.deleteMany();
        await prisma.shoppingCart.deleteMany();
        await prisma.userPantry.deleteMany();

        // 2. Delete Content
        const deletedRecipes = await prisma.recipe.deleteMany();
        const deletedProducts = await prisma.product.deleteMany();

        // 3. Delete Catalog History (so scraper can run again)
        const deletedCatalogs = await prisma.catalog.deleteMany();

        return NextResponse.json({
            success: true,
            message: `Cleaned: ${deletedRecipes.count} recipes, ${deletedProducts.count} products, ${deletedCatalogs.count} catalogs.`
        });

    } catch (error) {
        logger.error('Failed to clear database', { error }, 'AdminDB');
        return NextResponse.json({
            error: 'Internal Database Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
