import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Mapping of recipe titles to local image paths
const RECIPE_IMAGE_MAPPING: Record<string, string> = {
    'Omletă cu legume': '/images/recipes/omelette.png',
    'Tocăniță de pui': '/images/recipes/tocanita.png',
    'Salată Caesar': '/images/recipes/caesar.png',
    'Paste cu sos de roșii': '/images/recipes/paste.png',
    'Ciorbă de legume': '/images/recipes/ciorba.png',
    'Piept de pui la grătar': '/images/recipes/gratar.png',
};

/**
 * POST /api/recipes/sync-images
 * Updates recipe image URLs to use local generated images
 */
export async function POST() {
    try {
        const recipes = await prisma.recipe.findMany({
            select: {
                id: true,
                title: true,
                imageUrl: true,
            },
        });

        let updated = 0;

        for (const recipe of recipes) {
            const localImagePath = RECIPE_IMAGE_MAPPING[recipe.title];

            if (localImagePath && recipe.imageUrl !== localImagePath) {
                await prisma.recipe.update({
                    where: { id: recipe.id },
                    data: { imageUrl: localImagePath },
                });
                updated++;
                console.log(`[SyncImages] Updated ${recipe.title} -> ${localImagePath}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updated} of ${recipes.length} recipes with local images`,
            updated,
            total: recipes.length,
        });
    } catch (error) {
        console.error('Error syncing recipe images:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync recipe images' },
            { status: 500 }
        );
    }
}
