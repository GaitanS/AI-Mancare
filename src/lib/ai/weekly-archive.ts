/**
 * Weekly Archive System
 * Handles archiving of recipes and matching for reactivation
 */

import prisma from '@/lib/db';
import type { RecipeArchive } from '@prisma/client';

/**
 * Archive recipes older than 7 days
 * Run this on Monday to prepare for the new week
 */
export async function archiveOldRecipes(): Promise<{ archived: number; errors: string[] }> {
    const errors: string[] = [];
    let archived = 0;

    try {
        // Get the cutoff date (7 days ago)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        // Find recipes to archive (older than cutoff)
        const recipesToArchive = await prisma.recipe.findMany({
            where: {
                createdAt: { lt: cutoffDate },
                isPublished: true
            }
        });

        console.log(`[ARCHIVE] Found ${recipesToArchive.length} recipes to archive`);

        for (const recipe of recipesToArchive) {
            try {
                // Extract ingredient names from the recipe
                let ingredientNames: string[] = [];
                try {
                    const ingredientIds = typeof recipe.ingredientIds === 'string'
                        ? JSON.parse(recipe.ingredientIds)
                        : recipe.ingredientIds;

                    if (Array.isArray(ingredientIds) && ingredientIds.length > 0) {
                        const products = await prisma.product.findMany({
                            where: { id: { in: ingredientIds } },
                            select: { name: true }
                        });
                        ingredientNames = products.map(p => p.name.toLowerCase().trim());
                    }
                } catch (e) {
                    console.error(`[ARCHIVE] Failed to extract ingredients for ${recipe.id}:`, e);
                }

                // Check if already archived
                const existing = await prisma.recipeArchive.findFirst({
                    where: { originalRecipeId: recipe.id }
                });

                if (!existing) {
                    // Create archive entry
                    await prisma.recipeArchive.create({
                        data: {
                            originalRecipeId: recipe.id,
                            title: recipe.title,
                            slug: recipe.slug,
                            description: recipe.description,
                            imageUrl: recipe.imageUrl,
                            instructions: recipe.instructions,
                            tips: recipe.tips,
                            servings: recipe.servings,
                            difficulty: recipe.difficulty,
                            ingredientNames: JSON.stringify(ingredientNames)
                        }
                    });
                    archived++;
                    console.log(`[ARCHIVE] Archived: ${recipe.title}`);
                }

            } catch (recipeError) {
                const msg = `Failed to archive recipe ${recipe.id}: ${recipeError instanceof Error ? recipeError.message : 'Unknown'}`;
                errors.push(msg);
                console.error(`[ARCHIVE] ${msg}`);
            }
        }

        console.log(`[ARCHIVE] Completed. Archived ${archived} recipes.`);
        return { archived, errors };

    } catch (error) {
        const msg = `Archive process failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(msg);
        console.error(`[ARCHIVE] ${msg}`);
        return { archived, errors };
    }
}

/**
 * Find matching archived recipes based on available ingredients
 * @param availableIngredients - List of ingredient names currently on offer
 * @param minMatchScore - Minimum percentage of ingredients that must match (0-1)
 */
export async function findMatchingArchivedRecipes(
    availableIngredients: string[],
    minMatchScore: number = 0.7
): Promise<Array<{ archive: RecipeArchive; matchScore: number }>> {
    const matches: Array<{ archive: RecipeArchive; matchScore: number }> = [];

    try {
        // Normalize available ingredients
        const normalizedAvailable = availableIngredients.map(i =>
            i.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        );

        // Get all archived recipes
        const archives = await prisma.recipeArchive.findMany({
            orderBy: { timesReactivated: 'desc' } // Prefer popular recipes
        });

        for (const archive of archives) {
            try {
                const recipeIngredients: string[] = JSON.parse(archive.ingredientNames);

                if (recipeIngredients.length === 0) continue;

                // Count matching ingredients
                let matchCount = 0;
                for (const ingredient of recipeIngredients) {
                    const normalizedIngredient = ingredient
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .trim();

                    // Check if any available ingredient contains this recipe ingredient
                    const found = normalizedAvailable.some(avail =>
                        avail.includes(normalizedIngredient) || normalizedIngredient.includes(avail)
                    );

                    if (found) matchCount++;
                }

                const matchScore = matchCount / recipeIngredients.length;

                if (matchScore >= minMatchScore) {
                    matches.push({ archive, matchScore });
                }

            } catch (e) {
                console.error(`[MATCH] Failed to process archive ${archive.id}:`, e);
            }
        }

        // Sort by match score (highest first)
        matches.sort((a, b) => b.matchScore - a.matchScore);

        console.log(`[MATCH] Found ${matches.length} matching archived recipes`);
        return matches;

    } catch (error) {
        console.error('[MATCH] Matching process failed:', error);
        return [];
    }
}

/**
 * Reactivate an archived recipe with updated product prices
 * @param archiveId - ID of the archived recipe
 * @param newIngredientIds - IDs of the new products to use
 */
export async function reactivateRecipe(
    archiveId: string,
    newIngredientIds: string[]
): Promise<string | null> {
    try {
        const archive = await prisma.recipeArchive.findUnique({
            where: { id: archiveId }
        });

        if (!archive) {
            console.error(`[REACTIVATE] Archive ${archiveId} not found`);
            return null;
        }

        // Calculate new estimated cost
        const products = await prisma.product.findMany({
            where: { id: { in: newIngredientIds } }
        });

        const totalCost = products.reduce((sum, p) => sum + Number(p.price), 0);

        // Create new recipe from archive
        const newRecipe = await prisma.recipe.create({
            data: {
                title: archive.title,
                slug: `${archive.slug}-${Date.now()}`, // Unique slug
                description: archive.description,
                imageUrl: archive.imageUrl,
                instructions: archive.instructions,
                tips: archive.tips,
                servings: archive.servings,
                difficulty: archive.difficulty,
                ingredientIds: JSON.stringify(newIngredientIds),
                estimatedCost: totalCost,
                isPublished: true
            }
        });

        // Update archive reactivation stats
        await prisma.recipeArchive.update({
            where: { id: archiveId },
            data: {
                reactivatedAt: new Date(),
                timesReactivated: { increment: 1 }
            }
        });

        console.log(`[REACTIVATE] Reactivated: ${archive.title} as ${newRecipe.id}`);
        return newRecipe.id;

    } catch (error) {
        console.error(`[REACTIVATE] Failed to reactivate ${archiveId}:`, error);
        return null;
    }
}

/**
 * Clear expired products (older than 7 days past validUntil)
 */
export async function clearExpiredProducts(): Promise<number> {
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);

        const result = await prisma.product.deleteMany({
            where: {
                validUntil: { lt: cutoff }
            }
        });

        console.log(`[CLEANUP] Deleted ${result.count} expired products`);
        return result.count;

    } catch (error) {
        console.error('[CLEANUP] Failed to clear expired products:', error);
        return 0;
    }
}

/**
 * Run full Monday reset workflow
 */
export async function runMondayReset(): Promise<{
    archivedRecipes: number;
    deletedProducts: number;
    errors: string[];
}> {
    console.log('[MONDAY RESET] Starting weekly reset...');

    // 1. Archive old recipes
    const archiveResult = await archiveOldRecipes();

    // 2. Clear expired products
    const deletedProducts = await clearExpiredProducts();

    console.log('[MONDAY RESET] Complete!');

    return {
        archivedRecipes: archiveResult.archived,
        deletedProducts,
        errors: archiveResult.errors
    };
}
