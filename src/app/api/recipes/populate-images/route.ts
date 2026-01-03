import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateRecipeImage, getFallbackImageUrl } from '@/lib/recipe-images';
import { hashIngredients } from '@/lib/recipe-matcher';

export const dynamic = 'force-dynamic';

/**
 * POST /api/recipes/populate-images
 * Generates AI images for all recipes that don't have images yet
 * Also populates ingredient hashes for recipe matching
 */
export async function POST() {
    try {
        // Get all recipes
        const recipes = await prisma.recipe.findMany({
            select: {
                id: true,
                title: true,
                imageUrl: true,
                ingredientIds: true,
                ingredientHash: true,
            },
        });

        if (recipes.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No recipes found',
                updated: 0,
            });
        }

        let imagesUpdated = 0;
        let hashesUpdated = 0;
        const errors: string[] = [];

        for (const recipe of recipes) {
            try {
                const updates: any = {};

                // Generate ingredient hash if missing
                if (!recipe.ingredientHash && recipe.ingredientIds) {
                    try {
                        const ingredients = JSON.parse(recipe.ingredientIds);
                        if (Array.isArray(ingredients)) {
                            updates.ingredientHash = hashIngredients(ingredients);
                            hashesUpdated++;
                        }
                    } catch (e) {
                        // ingredientIds might not be valid JSON
                    }
                }

                // Generate image if missing or is an external URL
                const needsImage = !recipe.imageUrl ||
                    recipe.imageUrl.startsWith('https://picsum') ||
                    recipe.imageUrl.startsWith('https://source.unsplash');

                if (needsImage) {
                    console.log(`[PopulateImages] Generating image for: ${recipe.title}`);

                    // Try AI generation first
                    const imageUrl = await generateRecipeImage(recipe.title, recipe.id);

                    if (imageUrl) {
                        updates.imageUrl = imageUrl;
                        imagesUpdated++;
                    }
                }

                // Update recipe if there are changes
                if (Object.keys(updates).length > 0) {
                    await prisma.recipe.update({
                        where: { id: recipe.id },
                        data: updates,
                    });
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                errors.push(`Failed for "${recipe.title}": ${error}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${imagesUpdated} images, ${hashesUpdated} hashes for ${recipes.length} recipes`,
            imagesUpdated,
            hashesUpdated,
            total: recipes.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error('Error populating recipe images:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to populate recipe images' },
            { status: 500 }
        );
    }
}
