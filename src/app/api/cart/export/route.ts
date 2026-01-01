import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ExportItem {
    ingredientName: string;
    productName: string;
    price: number;
    store: string;
    quantity: number;
    unit: string;
    aisleOrder: number;
    aisleName: string;
}

interface AisleGroup {
    aisleName: string;
    aisleOrder: number;
    items: ExportItem[];
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'json';
        const store = searchParams.get('store');
        const cartId = searchParams.get('cartId');
        const ingredientsParam = searchParams.get('ingredients');

        // Get cart items from cartId, or from ingredients param
        let ingredientNames: string[] = [];

        if (cartId) {
            const cart = await prisma.shoppingCart.findUnique({
                where: { id: cartId },
            });
            if (cart) {
                try {
                    const items = JSON.parse(cart.items);
                    ingredientNames = items.map((item: { ingredientName: string }) => item.ingredientName);
                } catch {
                    // Empty cart
                }
            }
        } else if (ingredientsParam) {
            ingredientNames = ingredientsParam.split(',').map(s => s.trim().toLowerCase());
        }

        if (ingredientNames.length === 0) {
            return NextResponse.json(
                { error: 'No items to export' },
                { status: 400 }
            );
        }

        const now = new Date();
        const exportItems: ExportItem[] = [];

        for (const ingredientName of ingredientNames) {
            // Find ingredient mapping for aisle info
            const mapping = await prisma.ingredientMapping.findFirst({
                where: {
                    OR: [
                        { ingredientName: { contains: ingredientName } },
                        { keywords: { contains: ingredientName } },
                    ],
                },
            });

            const aisleOrder = mapping?.aisleOrder || 99;
            const aisleName = mapping?.aisleName || 'Altele';
            const searchTerms = mapping ? JSON.parse(mapping.keywords) : [ingredientName];

            // Build search conditions
            const orConditions = searchTerms.map((term: string) => ({
                OR: [
                    { name: { contains: term } },
                    { category: { contains: term } },
                ],
            }));

            // Find product (optionally filtered by store)
            const whereClause: Record<string, unknown> = {
                AND: [
                    { OR: orConditions },
                    { validFrom: { lte: now } },
                    { validUntil: { gte: now } },
                ],
            };

            if (store) {
                (whereClause.AND as Array<Record<string, unknown>>).push({ store });
            }

            const product = await prisma.product.findFirst({
                where: whereClause,
                orderBy: [
                    { discountPercentage: 'desc' },
                    { price: 'asc' },
                ],
            });

            exportItems.push({
                ingredientName,
                productName: product?.name || ingredientName,
                price: product ? Number(product.price) : 0,
                store: product?.store || store || 'N/A',
                quantity: 1,
                unit: mapping?.defaultUnit || 'buc',
                aisleOrder,
                aisleName,
            });
        }

        // Sort by aisle order
        exportItems.sort((a, b) => a.aisleOrder - b.aisleOrder);

        // Group by aisle
        const aisleGroups: AisleGroup[] = [];
        let currentAisle: AisleGroup | null = null;

        for (const item of exportItems) {
            if (!currentAisle || currentAisle.aisleName !== item.aisleName) {
                currentAisle = {
                    aisleName: item.aisleName,
                    aisleOrder: item.aisleOrder,
                    items: [],
                };
                aisleGroups.push(currentAisle);
            }
            currentAisle.items.push(item);
        }

        // Calculate totals
        const total = exportItems.reduce((sum, item) => sum + item.price, 0);

        // Format response
        if (format === 'text') {
            let text = `LISTA DE CUMPĂRĂTURI\n`;
            text += `${store ? `Magazin: ${store}` : 'Toate magazinele'}\n`;
            text += `${'='.repeat(40)}\n\n`;

            for (const group of aisleGroups) {
                text += `📍 ${group.aisleName.toUpperCase()}\n`;
                for (const item of group.items) {
                    const priceStr = item.price > 0 ? `${item.price.toFixed(2)} lei` : 'preț nedisponibil';
                    text += `  □ ${item.productName} - ${priceStr}\n`;
                }
                text += '\n';
            }

            text += `${'='.repeat(40)}\n`;
            text += `TOTAL: ${total.toFixed(2)} lei\n`;

            return new NextResponse(text, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                },
            });
        }

        return NextResponse.json({
            store: store || 'all',
            aisles: aisleGroups,
            items: exportItems,
            total: Math.round(total * 100) / 100,
            itemCount: exportItems.length,
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json(
            { error: 'Failed to export cart' },
            { status: 500 }
        );
    }
}
