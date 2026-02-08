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

// ========================================
// Cached product type for in-memory matching
// ========================================
interface CachedProduct {
    id: string;
    name: string;
    nameLower: string;
    category: string | null;
    categoryLower: string | null;
    price: number;
    originalPrice: number | null;
    discountPercentage: number | null;
    store: string;
}

/**
 * Batch-fetch all active products with fields needed for matching.
 * Sorted by discountPercentage desc, price asc to match original findBestProduct ordering.
 */
async function fetchAllActiveProducts(now: Date): Promise<CachedProduct[]> {
    const products = await prisma.product.findMany({
        where: {
            validFrom: { lte: now },
            validUntil: { gte: now },
        },
        select: {
            id: true,
            name: true,
            category: true,
            price: true,
            originalPrice: true,
            discountPercentage: true,
            store: true,
        },
        orderBy: [
            { discountPercentage: 'desc' },
            { price: 'asc' },
        ],
    });

    return products.map(p => ({
        id: p.id,
        name: p.name,
        nameLower: p.name.toLowerCase(),
        category: p.category,
        categoryLower: p.category ? p.category.toLowerCase() : null,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
        store: p.store,
    }));
}

interface CachedMapping {
    ingredientName: string;
    ingredientNameLower: string;
    keywords: string[];
    keywordsRaw: string;
    keywordsRawLower: string;
}

/**
 * Batch-fetch all ingredient mappings for in-memory lookup.
 */
async function fetchAllMappings(): Promise<CachedMapping[]> {
    const mappings = await prisma.ingredientMapping.findMany({
        select: {
            ingredientName: true,
            keywords: true,
        },
    });

    return mappings.map(m => ({
        ingredientName: m.ingredientName,
        ingredientNameLower: m.ingredientName.toLowerCase(),
        keywords: (() => { try { return JSON.parse(m.keywords); } catch { return []; } })(),
        keywordsRaw: m.keywords,
        keywordsRawLower: m.keywords.toLowerCase(),
    }));
}

/**
 * Find ingredient mapping from pre-fetched list.
 * Uses case-insensitive contains matching (same as the original Prisma query).
 */
function findMappingLocal(
    allMappings: CachedMapping[],
    ingredientName: string
): CachedMapping | null {
    const nameLower = ingredientName.toLowerCase();

    for (const mapping of allMappings) {
        if (mapping.ingredientNameLower.includes(nameLower) ||
            mapping.keywordsRawLower.includes(nameLower)) {
            return mapping;
        }
    }
    return null;
}

/**
 * Find the best product for an ingredient at a specific store from pre-fetched list.
 * Replicates the original findBestProduct() logic using in-memory search.
 * Products are already sorted by discountPercentage desc, price asc.
 */
function findBestProductLocal(
    allProducts: CachedProduct[],
    allMappings: CachedMapping[],
    ingredientName: string,
    storeName: string
): CachedProduct | null {
    const mapping = findMappingLocal(allMappings, ingredientName);
    const searchTerms: string[] = mapping ? mapping.keywords : [ingredientName];
    const searchTermsLower = searchTerms.map(t => t.toLowerCase());

    for (const product of allProducts) {
        if (product.store !== storeName) continue;

        // Check if any search term matches name or category (case-insensitive contains)
        const matches = searchTermsLower.some(term =>
            product.nameLower.includes(term) ||
            (product.categoryLower && product.categoryLower.includes(term))
        );

        if (matches) return product;
    }

    return null;
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

        // Batch-fetch all data upfront: stores, products, and mappings in parallel
        const [stores, allProducts, allMappings] = await Promise.all([
            prisma.product.groupBy({
                by: ['store'],
                where: {
                    validFrom: { lte: now },
                    validUntil: { gte: now },
                },
            }),
            fetchAllActiveProducts(now),
            fetchAllMappings(),
        ]);

        const storeNames = stores.map((s: { store: string }) => s.store);

        if (mode === 'multi') {
            const result = multiStoreOptimize(ingredientNames, storeNames, allProducts, allMappings);
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
                const product = findBestProductLocal(allProducts, allMappings, ingredientName, storeName);

                if (product) {
                    availableItems++;
                    storeTotal += product.price;
                    const originalPrice = product.originalPrice ?? product.price;
                    storeSavings += originalPrice - product.price;
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
function multiStoreOptimize(
    ingredientNames: string[],
    storeNames: string[],
    allProducts: CachedProduct[],
    allMappings: CachedMapping[]
): MultiStoreResult {
    // Step 1: Build price matrix - ingredients x stores (all in-memory now)
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
            const product = findBestProductLocal(allProducts, allMappings, ingredientName, storeName);
            if (product) {
                storeOptions.set(storeName, {
                    productId: product.id,
                    productName: product.name,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    discount: product.discountPercentage,
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
        for (const ingredientName of ingredientNames) {
            const options = priceMatrix.get(ingredientName);
            const storeOption = options?.get(storeName);
            if (storeOption) {
                storeTotal += storeOption.price;
            } else {
                storeTotal += 10; // fallback price
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
