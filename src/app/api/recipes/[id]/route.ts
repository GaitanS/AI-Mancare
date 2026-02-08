import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/recipes/[id] - Get single recipe with full details and ingredients
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const recipe = await prisma.recipe.findUnique({
            where: { id },
        });

        if (!recipe) {
            return NextResponse.json(
                { success: false, error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Fire-and-forget: increment view count
        prisma.recipe.update({
            where: { id },
            data: { viewCount: { increment: 1 } }
        }).catch((err) => { logger.warn('Failed to increment viewCount', { recipeId: id, error: err?.message }, 'RecipesAPI'); });

        // Fire-and-forget: track interaction
        prisma.userInteraction.create({
            data: {
                sessionId: request.headers.get('x-session-id') || 'anonymous',
                recipeId: id,
                type: 'view',
            }
        }).catch((err) => { logger.warn('Failed to track recipe view interaction', { recipeId: id, error: err?.message }, 'RecipesAPI'); });

        // Parse JSON fields safely
        const safeParseArray = (val: any) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) ? parsed : [val];
                } catch {
                    return [val];
                }
            }
            return [];
        };

        const safeParseJSON = (val: any) => {
            if (!val) return null;
            if (typeof val === 'object') return val;
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return null;
                }
            }
            return null;
        };

        // Get ingredient IDs
        const ingredientIds = safeParseArray(recipe.ingredientIds);
        let ingredients: any[] = [];

        // Filter ingredient IDs to avoid crashing prisma with objects
        const validIngredientIds: string[] = [];
        if (Array.isArray(ingredientIds)) {
            ingredientIds.forEach((id: any) => {
                if (typeof id === 'string') {
                    validIngredientIds.push(id);
                } else if (typeof id === 'object' && id !== null && typeof id.id === 'string') {
                    validIngredientIds.push(id.id);
                }
            });
        }

        // Fetch ingredients if available
        if (validIngredientIds.length > 0) {
            const products = await prisma.product.findMany({
                where: { id: { in: validIngredientIds } },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    originalPrice: true,
                    store: true,
                    unit: true,
                },
            });

            ingredients = products.map(p => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                store: p.store,
                unit: p.unit,
                quantity: 1,
            }));
        } else if (Array.isArray(ingredientIds) && ingredientIds.length > 0) {
            // Fallback: Try to match ingredients by name if they are objects
            const potentialIngredients = ingredientIds.filter((i: any) => typeof i === 'object' && i.name);
            const potentialNames = potentialIngredients.map((i: any) => i.name);

            let matchedProducts: any[] = [];

            if (potentialNames.length > 0) {
                matchedProducts = await prisma.product.findMany({
                    where: { name: { in: potentialNames } },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        originalPrice: true,
                        store: true,
                        unit: true,
                    }
                });
            }

            ingredients = potentialIngredients.map((i: any, index: number) => {
                // Try to find exact match
                const match = matchedProducts.find(p => p.name === i.name);

                if (match) {
                    return {
                        id: match.id,
                        name: match.name,
                        price: Number(match.price),
                        originalPrice: match.originalPrice ? Number(match.originalPrice) : null,
                        store: match.store,
                        unit: match.unit,
                        quantity: Number(i.quantity) || 1
                    };
                }

                // Return raw ingredient with generated ID and 0 price
                return {
                    id: `gen-${index}-${Date.now()}`,
                    name: i.name,
                    price: 0,
                    originalPrice: null,
                    store: 'Generic',
                    unit: i.unit || 'buc',
                    quantity: Number(i.quantity) || 1
                };
            });
        }

        const response = {
            success: true,
            data: {
                id: recipe.id,
                title: recipe.title,
                description: recipe.description,
                imageUrl: recipe.imageUrl,
                servings: recipe.servings,
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime,
                totalTime: recipe.totalTime,
                difficulty: recipe.difficulty,
                estimatedCost: recipe.estimatedCost ? Number(recipe.estimatedCost) : null,
                instructions: safeParseArray(recipe.instructions).map((step: any, index: number) => {
                    if (typeof step === 'object' && step !== null && step.text) {
                        return { step: step.step || index + 1, text: step.text };
                    }
                    return { step: index + 1, text: String(step) };
                }),
                tips: safeParseArray(recipe.tips),
                tags: safeParseArray(recipe.tags),
                nutritionPerServing: safeParseJSON(recipe.nutritionPerServing),
                slug: recipe.slug,
                ingredients,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        logger.error('Error fetching recipe', { error }, 'RecipesAPI');
        return NextResponse.json(
            { success: false, error: 'Failed to fetch recipe' },
            { status: 500 }
        );
    }
}
