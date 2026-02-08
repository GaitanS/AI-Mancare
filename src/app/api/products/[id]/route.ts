
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const product = await prisma.product.findUnique({
            where: { id }
        });

        if (!product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        // Fetch catalog + navigation in parallel (fixes N+1)
        const [catalog, prevNext] = await Promise.all([
            product.catalogId
                ? prisma.catalog.findUnique({ where: { id: product.catalogId } })
                : null,
            product.catalogId
                ? prisma.product.findMany({
                    where: { catalogId: product.catalogId, id: { not: product.id } },
                    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                    select: { id: true, name: true, catalogPage: true, createdAt: true }
                })
                : null,
        ]);

        // Build navigation from the single sorted query
        let navigation: {
            prev: { id: string; name: string; catalogPage: number | null } | null;
            next: { id: string; name: string; catalogPage: number | null } | null;
        } = { prev: null, next: null };

        if (prevNext && prevNext.length > 0) {
            // Find insertion point of current product in the sorted list
            let prevItem: typeof prevNext[0] | null = null;
            let nextItem: typeof prevNext[0] | null = null;

            for (const item of prevNext) {
                if (
                    item.createdAt < product.createdAt ||
                    (item.createdAt.getTime() === product.createdAt.getTime() && item.id < product.id)
                ) {
                    prevItem = item; // Keep updating - last one before current = direct prev
                } else if (!nextItem) {
                    nextItem = item; // First one after current = direct next
                }
            }

            // Circular navigation: wrap around
            navigation = {
                prev: prevItem
                    ? { id: prevItem.id, name: prevItem.name, catalogPage: prevItem.catalogPage }
                    : { id: prevNext[prevNext.length - 1].id, name: prevNext[prevNext.length - 1].name, catalogPage: prevNext[prevNext.length - 1].catalogPage },
                next: nextItem
                    ? { id: nextItem.id, name: nextItem.name, catalogPage: nextItem.catalogPage }
                    : { id: prevNext[0].id, name: prevNext[0].name, catalogPage: prevNext[0].catalogPage },
            };
        }

        // Parse localImages from catalog
        let catalogImages: string[] = [];
        if (catalog && catalog.localImages) {
            try {
                const images = JSON.parse(catalog.localImages);
                if (Array.isArray(images) && catalog.imageBasePath) {
                    catalogImages = images.map(img => `${catalog.imageBasePath}/${img}`);
                }
            } catch {
                // Silently ignore malformed JSON
            }
        }

        return NextResponse.json({
            product,
            catalog: catalog ? {
                id: catalog.id,
                title: catalog.title,
                store: catalog.store,
                validFrom: catalog.validFrom,
                validUntil: catalog.validUntil,
                images: catalogImages,
                imageBasePath: catalog.imageBasePath
            } : null,
            navigation
        });

    } catch (error) {
        logger.error('Error fetching product', { error }, 'ProductsAPI');
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
