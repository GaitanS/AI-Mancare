import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

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

        // Fetch ingredients if available
        if (ingredientIds.length > 0) {
            const products = await prisma.product.findMany({
                where: { id: { in: ingredientIds } },
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
                quantity: 1, // Default quantity per recipe
            }));
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
                instructions: safeParseArray(recipe.instructions),
                tips: safeParseArray(recipe.tips),
                tags: safeParseArray(recipe.tags),
                nutritionPerServing: safeParseJSON(recipe.nutritionPerServing),
                slug: recipe.slug,
                ingredients,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch recipe' },
            { status: 500 }
        );
    }
}
