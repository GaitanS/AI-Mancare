import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface CartItem {
    ingredientName: string;
    productId?: string;
    quantity: number;
}

interface StoreTotal {
    store: string;
    total: number;
    savings: number;
    availableItems: number;
    missingItems: string[];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items, ingredients } = body;

        // Get ingredient names from items or directly provided
        let ingredientNames: string[] = [];

        if (items && items.length > 0) {
            ingredientNames = items.map((item: CartItem) => item.ingredientName.toLowerCase());
        } else if (ingredients && ingredients.length > 0) {
            ingredientNames = ingredients.map((i: string) => i.toLowerCase());
        }

        if (ingredientNames.length === 0) {
            return NextResponse.json(
                { error: 'No items provided for optimization' },
                { status: 400 }
            );
        }

        const now = new Date();

        // Get all unique stores
        const stores = await prisma.product.groupBy({
            by: ['store'],
            where: {
                validFrom: { lte: now },
                validUntil: { gte: now },
            },
        });

        const storeNames = stores.map(s => s.store);
        const storeResults: StoreTotal[] = [];

        for (const storeName of storeNames) {
            let storeTotal = 0;
            let storeSavings = 0;
            let availableItems = 0;
            const missingItems: string[] = [];

            for (const ingredientName of ingredientNames) {
                // Find ingredient mapping for keywords
                const mapping = await prisma.ingredientMapping.findFirst({
                    where: {
                        OR: [
                            { ingredientName: { contains: ingredientName } },
                            { keywords: { contains: ingredientName } },
                        ],
                    },
                });

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

                // Find best product at this store
                const product = await prisma.product.findFirst({
                    where: {
                        AND: [
                            { store: storeName },
                            { OR: orConditions },
                            { validFrom: { lte: now } },
                            { validUntil: { gte: now } },
                        ],
                    },
                    orderBy: [
                        { discountPercentage: 'desc' },
                        { price: 'asc' },
                    ],
                });

                if (product) {
                    availableItems++;
                    storeTotal += Number(product.price);
                    const originalPrice = product.originalPrice ? Number(product.originalPrice) : Number(product.price);
                    storeSavings += originalPrice - Number(product.price);
                } else {
                    missingItems.push(ingredientName);
                    // Add estimated fallback price for missing items
                    storeTotal += 10; // Default fallback price
                }
            }

            storeResults.push({
                store: storeName,
                total: Math.round(storeTotal * 100) / 100,
                savings: Math.round(storeSavings * 100) / 100,
                availableItems,
                missingItems,
            });
        }

        // Sort by total price ascending
        storeResults.sort((a, b) => a.total - b.total);

        // Determine best store
        const recommended = storeResults.length > 0 ? storeResults[0].store : null;

        return NextResponse.json({
            comparison: storeResults,
            recommended,
            ingredientCount: ingredientNames.length,
        });
    } catch (error) {
        console.error('Optimize error:', error);
        return NextResponse.json(
            { error: 'Failed to optimize cart' },
            { status: 500 }
        );
    }
}
