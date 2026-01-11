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

                // Smart Quantity Calculation
                // 1. Try to extract package size from product name (e.g. "Faina 1kg", "Lapte 1.5L", "Mix 400g")
                let packageSize = 1;
                let packageUnit = 'buc';

                // Matches "400g", "1.5 kg", "100 ml", etc.
                const sizeMatch = bestMatch.name.match(/(\d+(?:[.,]\d+)?)\s*(g|ml|kg|l|litri|grame|buc)/i);

                if (sizeMatch) {
                    const val = parseFloat(sizeMatch[1].replace(',', '.'));
                    const u = sizeMatch[2].toLowerCase();

                    if (u === 'kg' || u === 'l' || u === 'litri') {
                        packageSize = val * 1000; // Normalized to g/ml
                        packageUnit = u === 'kg' ? 'g' : 'ml';
                    } else if (u === 'g' || u === 'grame') {
                        packageSize = val;
                        packageUnit = 'g';
                    } else if (u === 'ml') {
                        packageSize = val;
                        packageUnit = 'ml';
                    } else {
                        // 'buc' or others
                        packageSize = val;
                        packageUnit = 'buc';
                    }
                }

                // 2. Normalize required quantity
                // If recipe asks for 'g'/'ml' and we found pack size, divide.
                let packsToBuy = 1;

                const isMassOrVolume = ['g', 'ml', 'kg', 'l', 'grame', 'litri'].includes(unit.toLowerCase());

                if (isMassOrVolume) {
                    let requiredAmount = quantity;
                    if (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'l') requiredAmount *= 1000;

                    // If we successfully found a package size in same/compatible unit
                    if (packageSize > 1) { // Assuming meaningful pack size
                        packsToBuy = Math.ceil(requiredAmount / packageSize);
                    } else {
                        // Fallback: If we assume package is ~1 unit of whatever (e.g. 1kg pack for 400g needed -> 1)
                        // But if quantity is large (e.g. 1500g needed), and we don't know pack size... default to 1 is safer than 1500.
                        // However, if unit was 'kg' and quantity was 1.5, we'd have 1.5 packs? No.
                        // Let's stick to: "If it's mass/volume, default to 1 unless explicit math works".
                        packsToBuy = 1;
                    }
                } else {
                    // Unit is 'buc' or similar
                    // If quantity is absurdly high (e.g. > 20), assume parsing error and clamp to 1.
                    if (quantity > 20) {
                        packsToBuy = 1;
                    } else {
                        packsToBuy = Math.ceil(quantity);
                    }
                }

                // Final safety valve: prices over 500 RON for a standard item are suspicious
                if (price * packsToBuy > 500 && price < 100) {
                    packsToBuy = 1; // Auto-correct crazy multiples
                }

                // UPDATE ITEM with calculated purchase quantity
                // This ensures frontend displays "1 buc" - "24 lei" instead of "400 g" - "9600 lei"
                item.requiredQuantity = packsToBuy;
                item.unit = bestMatch.unit || 'buc';

                // Multiply price by CALCULATED packs
                totalCost += price * packsToBuy;
                totalSavings += (originalPrice - price) * packsToBuy;

                // Track store breakdown
                if (!storeBreakdown[bestMatch.store]) {
                    storeBreakdown[bestMatch.store] = { count: 0, subtotal: 0 };
                }
                storeBreakdown[bestMatch.store].count++;
                storeBreakdown[bestMatch.store].subtotal += price * packsToBuy;
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
