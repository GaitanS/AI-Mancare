import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface CartItem {
    ingredientName: string;
    requiredQuantity: number;
    unit: string;
    matchedProduct: {
        id: string;
        name: string;
        price: number;
        originalPrice: number | null;
        discount: number | null;
        store: string;
        unit: string;
        catalogPageImage: string | null;
    } | null;
    alternatives: Array<{
        id: string;
        name: string;
        price: number;
        originalPrice: number | null;
        discount: number | null;
        store: string;
        savings: number;
    }>;
    ownedByUser: boolean;
}

interface AutoFillResponse {
    items: CartItem[];
    totalCost: number;
    totalSavings: number;
    storeBreakdown: Record<string, { count: number; subtotal: number }>;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { recipeIds, ingredients: rawIngredients, store } = body;

        // Get ingredients either from recipes or directly provided
        let ingredientsWithQuantities: Array<{ name: string; quantity: number; unit: string }> = [];

        if (recipeIds && recipeIds.length > 0) {
            // Fetch recipes and extract ingredients
            const recipes = await prisma.recipe.findMany({
                where: { id: { in: recipeIds } },
                select: { ingredientIds: true },
            });

            for (const recipe of recipes) {
                try {
                    const recipeIngredients = JSON.parse(recipe.ingredientIds);
                    ingredientsWithQuantities.push(...recipeIngredients.map((i: any) => ({
                        name: (i.name || i)?.toLowerCase(),
                        quantity: i.quantity || 1,
                        unit: i.unit || 'buc'
                    })));
                } catch {
                    // If not valid JSON, treat as comma-separated
                    ingredientsWithQuantities.push(...recipe.ingredientIds.split(',').map((s: string) => ({
                        name: s.trim().toLowerCase(),
                        quantity: 1,
                        unit: 'buc'
                    })));
                }
            }
        } else if (rawIngredients && rawIngredients.length > 0) {
            // Check if ingredients have quantity info
            if (typeof rawIngredients[0] === 'object' && rawIngredients[0].name) {
                ingredientsWithQuantities = rawIngredients.map((i: any) => ({
                    name: i.name.toLowerCase(),
                    quantity: i.quantity || 1,
                    unit: i.unit || 'buc'
                }));
            } else {
                // Old format: just strings
                ingredientsWithQuantities = rawIngredients.map((i: string) => ({
                    name: i.toLowerCase(),
                    quantity: 1,
                    unit: 'buc'
                }));
            }
        }

        // Merge duplicates
        const ingredientsMap = new Map<string, { quantity: number; unit: string }>();
        for (const ing of ingredientsWithQuantities) {
            if (ingredientsMap.has(ing.name)) {
                const existing = ingredientsMap.get(ing.name)!;
                existing.quantity += ing.quantity;
            } else {
                ingredientsMap.set(ing.name, { quantity: ing.quantity, unit: ing.unit });
            }
        }

        if (ingredientsMap.size === 0) {
            return NextResponse.json(
                { error: 'No ingredients provided' },
                { status: 400 }
            );
        }

        // Current date for validity check
        const now = new Date();

        const items: CartItem[] = [];
        let totalCost = 0;
        let totalSavings = 0;
        const storeBreakdown: Record<string, { count: number; subtotal: number }> = {};

        for (const [ingredientName, { quantity, unit }] of ingredientsMap.entries()) {
            // Find ingredient mapping
            const mapping = await prisma.ingredientMapping.findFirst({
                where: {
                    OR: [
                        { ingredientName: { contains: ingredientName } },
                        { keywords: { contains: ingredientName } },
                    ],
                },
            });

            // Search for products matching this ingredient
            const searchTerms = mapping
                ? JSON.parse(mapping.keywords)
                : [ingredientName];

            // Build OR conditions for search
            const orConditions = searchTerms.map((term: string) => ({
                OR: [
                    { name: { contains: term } },
                    { category: { contains: term } },
                ],
            }));

            // Find products with valid offers
            const products = await prisma.product.findMany({
                where: {
                    AND: [
                        { OR: orConditions },
                        store ? { store: store } : {},
                        { validFrom: { lte: now } },
                        { validUntil: { gte: now } },
                    ],
                },
                orderBy: [
                    { discountPercentage: 'desc' },
                    { price: 'asc' },
                ],
                take: 5,
            });

            const bestMatch = products[0] || null;
            const alternatives = products.slice(1).map((p) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                discount: p.discountPercentage ?? null,
                store: p.store,
                savings: bestMatch ? Number(bestMatch.price) - Number(p.price) : 0,
            }));

            const item: CartItem = {
                ingredientName,
                requiredQuantity: quantity,
                unit: unit || mapping?.defaultUnit || 'buc',
                matchedProduct: bestMatch
                    ? {
                        id: bestMatch.id,
                        name: bestMatch.name,
                        price: Number(bestMatch.price),
                        originalPrice: bestMatch.originalPrice ? Number(bestMatch.originalPrice) : null,
                        discount: bestMatch.discountPercentage ?? null,
                        store: bestMatch.store,
                        unit: bestMatch.unit,
                        catalogPageImage: null,
                    }
                    : null,
                alternatives,
                ownedByUser: false,
            };

            items.push(item);

            if (bestMatch) {
                const price = Number(bestMatch.price);
                const originalPrice = bestMatch.originalPrice ? Number(bestMatch.originalPrice) : price;

                // Multiply price by quantity for correct total
                totalCost += price * quantity;
                totalSavings += (originalPrice - price) * quantity;

                // Track store breakdown
                if (!storeBreakdown[bestMatch.store]) {
                    storeBreakdown[bestMatch.store] = { count: 0, subtotal: 0 };
                }
                storeBreakdown[bestMatch.store].count++;
                storeBreakdown[bestMatch.store].subtotal += price * quantity;
            }
        }

        const response: AutoFillResponse = {
            items,
            totalCost: Math.round(totalCost * 100) / 100,
            totalSavings: Math.round(totalSavings * 100) / 100,
            storeBreakdown,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Auto-fill error:', error);
        return NextResponse.json(
            { error: 'Failed to auto-fill cart' },
            { status: 500 }
        );
    }
}
