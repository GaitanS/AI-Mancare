import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

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

interface MultiStoreAssignment {
    ingredientName: string;
    store: string;
    productId: string;
    productName: string;
    price: number;
    originalPrice: number | null;
    discount: number | null;
}

interface MultiStoreResult {
    assignments: MultiStoreAssignment[];
    storeBreakdown: Record<string, { items: number; subtotal: number }>;
    totalCost: number;
    totalSavings: number;
    storeCount: number;
    /** Savings compared to cheapest single-store option */
    savingsVsSingleStore: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items, ingredients, mode = 'single' } = body;

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

        const storeNames = stores.map((s: { store: string }) => s.store);

        if (mode === 'multi') {
            const result = await multiStoreOptimize(ingredientNames, storeNames, now);
            return NextResponse.json(result);
        }

        // ========================================
        // Single-store comparison (original behavior)
        // ========================================
        const storeResults: StoreTotal[] = [];

        for (const storeName of storeNames) {
            let storeTotal = 0;
            let storeSavings = 0;
            let availableItems = 0;
            const missingItems: string[] = [];

            for (const ingredientName of ingredientNames) {
                const product = await findBestProduct(ingredientName, storeName, now);

                if (product) {
                    availableItems++;
                    storeTotal += Number(product.price);
                    const originalPrice = product.originalPrice ? Number(product.originalPrice) : Number(product.price);
                    storeSavings += originalPrice - Number(product.price);
                } else {
                    missingItems.push(ingredientName);
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

        const recommended = storeResults.length > 0 ? storeResults[0].store : null;

        return NextResponse.json({
            comparison: storeResults,
            recommended,
            ingredientCount: ingredientNames.length,
        });
    } catch (error) {
        logger.error('Optimize error', { error }, 'CartOptimizeAPI');
        return NextResponse.json(
            { error: 'Failed to optimize cart' },
            { status: 500 }
        );
    }
}

// ========================================
// Multi-Store Optimization Algorithm
// ========================================
async function multiStoreOptimize(
    ingredientNames: string[],
    storeNames: string[],
    now: Date
): Promise<MultiStoreResult> {
    // Step 1: Build price matrix - ingredients x stores
    const priceMatrix: Map<string, Map<string, {
        productId: string;
        productName: string;
        price: number;
        originalPrice: number | null;
        discount: number | null;
    }>> = new Map();

    for (const ingredientName of ingredientNames) {
        const storeOptions = new Map<string, any>();

        for (const storeName of storeNames) {
            const product = await findBestProduct(ingredientName, storeName, now);
            if (product) {
                storeOptions.set(storeName, {
                    productId: product.id,
                    productName: product.name,
                    price: Number(product.price),
                    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
                    discount: product.discountPercentage ? Number(product.discountPercentage) : null,
                });
            }
        }

        priceMatrix.set(ingredientName, storeOptions);
    }

    // Step 2: For each ingredient, pick the absolute cheapest (any store)
    const assignments: MultiStoreAssignment[] = [];
    const storeUsage = new Map<string, number>(); // store -> count of assigned items

    for (const [ingredientName, storeOptions] of priceMatrix.entries()) {
        if (storeOptions.size === 0) {
            // No product found in any store
            continue;
        }

        // Find cheapest across all stores
        let cheapestStore = '';
        let cheapestPrice = Infinity;
        let cheapestData: any = null;

        for (const [store, data] of storeOptions.entries()) {
            if (data.price < cheapestPrice) {
                cheapestPrice = data.price;
                cheapestStore = store;
                cheapestData = data;
            }
        }

        if (cheapestData) {
            assignments.push({
                ingredientName,
                store: cheapestStore,
                productId: cheapestData.productId,
                productName: cheapestData.productName,
                price: cheapestData.price,
                originalPrice: cheapestData.originalPrice,
                discount: cheapestData.discount,
            });
            storeUsage.set(cheapestStore, (storeUsage.get(cheapestStore) || 0) + 1);
        }
    }

    // Step 3: Consolidate if too many stores (> 3)
    // Reassign items from least-used stores IF price increase < 15% of total savings
    const uniqueStores = new Set(assignments.map(a => a.store));

    if (uniqueStores.size > 3) {
        const totalCostBefore = assignments.reduce((sum, a) => sum + a.price, 0);
        const maxAcceptableIncrease = totalCostBefore * 0.15;

        // Sort stores by usage count ascending (least used first)
        const storesByUsage = Array.from(storeUsage.entries())
            .sort((a, b) => a[1] - b[1]);

        // Try to eliminate stores with fewest items
        for (const [storeToRemove] of storesByUsage) {
            if (uniqueStores.size <= 3) break;

            let totalReassignCost = 0;
            let canReassignAll = true;

            // Check cost of reassigning all items from this store
            const itemsInStore = assignments.filter(a => a.store === storeToRemove);

            for (const item of itemsInStore) {
                const options = priceMatrix.get(item.ingredientName);
                if (!options) { canReassignAll = false; break; }

                // Find next cheapest store (not the one we're removing)
                let nextCheapest = Infinity;
                for (const [store, data] of options.entries()) {
                    if (store !== storeToRemove && data.price < nextCheapest) {
                        nextCheapest = data.price;
                    }
                }

                if (nextCheapest === Infinity) {
                    // No alternative store has this product
                    canReassignAll = false;
                    break;
                }

                totalReassignCost += nextCheapest - item.price;
            }

            // Only consolidate if the extra cost is acceptable
            if (canReassignAll && totalReassignCost < maxAcceptableIncrease) {
                for (const item of itemsInStore) {
                    const options = priceMatrix.get(item.ingredientName)!;
                    let bestAltStore = '';
                    let bestAltPrice = Infinity;
                    let bestAltData: any = null;

                    for (const [store, data] of options.entries()) {
                        if (store !== storeToRemove && data.price < bestAltPrice) {
                            bestAltPrice = data.price;
                            bestAltStore = store;
                            bestAltData = data;
                        }
                    }

                    if (bestAltData) {
                        item.store = bestAltStore;
                        item.productId = bestAltData.productId;
                        item.productName = bestAltData.productName;
                        item.price = bestAltData.price;
                        item.originalPrice = bestAltData.originalPrice;
                        item.discount = bestAltData.discount;
                    }
                }
                uniqueStores.delete(storeToRemove);
            }
        }
    }

    // Calculate totals
    const totalCost = Math.round(assignments.reduce((sum, a) => sum + a.price, 0) * 100) / 100;
    const totalSavings = Math.round(
        assignments.reduce((sum, a) => {
            const orig = a.originalPrice || a.price;
            return sum + (orig - a.price);
        }, 0) * 100
    ) / 100;

    // Build store breakdown
    const storeBreakdown: Record<string, { items: number; subtotal: number }> = {};
    for (const a of assignments) {
        if (!storeBreakdown[a.store]) {
            storeBreakdown[a.store] = { items: 0, subtotal: 0 };
        }
        storeBreakdown[a.store].items++;
        storeBreakdown[a.store].subtotal = Math.round((storeBreakdown[a.store].subtotal + a.price) * 100) / 100;
    }

    // Calculate savings vs single store (cheapest single-store total)
    let cheapestSingleStore = Infinity;
    for (const storeName of storeNames) {
        let storeTotal = 0;
        let foundAll = true;
        for (const ingredientName of ingredientNames) {
            const options = priceMatrix.get(ingredientName);
            const storeOption = options?.get(storeName);
            if (storeOption) {
                storeTotal += storeOption.price;
            } else {
                storeTotal += 10; // fallback price
                foundAll = false;
            }
        }
        if (storeTotal < cheapestSingleStore) {
            cheapestSingleStore = storeTotal;
        }
    }

    return {
        assignments,
        storeBreakdown,
        totalCost,
        totalSavings,
        storeCount: Object.keys(storeBreakdown).length,
        savingsVsSingleStore: Math.round((cheapestSingleStore - totalCost) * 100) / 100,
    };
}

// ========================================
// Shared: Find best product for ingredient at a store
// ========================================
async function findBestProduct(ingredientName: string, storeName: string, now: Date) {
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

    const orConditions = searchTerms.map((term: string) => ({
        OR: [
            { name: { contains: term } },
            { category: { contains: term } },
        ],
    }));

    return prisma.product.findFirst({
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
}
