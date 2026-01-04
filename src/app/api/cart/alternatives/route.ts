import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Product } from '@/types';

interface AlternativeProduct {
    id: string;
    name: string;
    price: number;
    originalPrice: number | null;
    discount: number | null;
    store: string;
    savings: number;
    unit: string;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ingredientName = searchParams.get('ingredientName');
        const currentProductId = searchParams.get('currentProductId');
        const currentPrice = searchParams.get('currentPrice');

        if (!ingredientName) {
            return NextResponse.json(
                { error: 'ingredientName is required' },
                { status: 400 }
            );
        }

        const now = new Date();
        const basePrice = currentPrice ? parseFloat(currentPrice) : 0;

        // Find ingredient mapping for keywords
        const mapping = await prisma.ingredientMapping.findFirst({
            where: {
                OR: [
                    { ingredientName: { contains: ingredientName.toLowerCase() } },
                    { keywords: { contains: ingredientName.toLowerCase() } },
                ],
            },
        });

        const searchTerms = mapping
            ? JSON.parse(mapping.keywords)
            : [ingredientName.toLowerCase()];

        // Build search conditions
        const orConditions = searchTerms.map((term: string) => ({
            OR: [
                { name: { contains: term } },
                { category: { contains: term } },
            ],
        }));

        // Find alternative products (exclude current if provided)
        const whereClause: Record<string, unknown> = {
            AND: [
                { OR: orConditions },
                { validFrom: { lte: now } },
                { validUntil: { gte: now } },
            ],
        };

        if (currentProductId) {
            (whereClause.AND as Array<Record<string, unknown>>).push({
                NOT: { id: currentProductId },
            });
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            orderBy: [
                { price: 'asc' },
                { discountPercentage: 'desc' },
            ],
            take: 10,
        });

        const alternatives: AlternativeProduct[] = products.map((product: Product) => ({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
            discount: product.discountPercentage,
            store: product.store,
            savings: basePrice > 0 ? Math.round((basePrice - Number(product.price)) * 100) / 100 : 0,
            unit: product.unit,
        }));

        // Find the cheapest option
        const cheapest = alternatives.length > 0 ? alternatives[0] : null;
        const maxSavings = cheapest && basePrice > 0
            ? Math.round((basePrice - cheapest.price) * 100) / 100
            : 0;

        return NextResponse.json({
            ingredientName,
            currentPrice: basePrice,
            alternatives,
            cheapest,
            maxSavings,
            suggestion: maxSavings > 0
                ? `Economisești ${maxSavings.toFixed(2)} lei dacă alegi ${cheapest?.name} de la ${cheapest?.store}`
                : null,
        });
    } catch (error) {
        console.error('Alternatives error:', error);
        return NextResponse.json(
            { error: 'Failed to find alternatives' },
            { status: 500 }
        );
    }
}
