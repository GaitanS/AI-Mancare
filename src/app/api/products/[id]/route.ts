
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        // Get catalog details if exists
        let catalog = null;
        if (product.catalogId) {
            catalog = await prisma.catalog.findUnique({
                where: { id: product.catalogId }
            });
        }

        // Get Previous and Next products from the same catalog (for navigation)
        let navigation: {
            prev: { id: string; name: string; catalogPage: number | null } | null;
            next: { id: string; name: string; catalogPage: number | null } | null;
        } = { prev: null, next: null };

        if (product.catalogId) {
            // Find previous product (robust logic: older created OR same created but smaller ID)
            let prev = await prisma.product.findFirst({
                where: {
                    catalogId: product.catalogId,
                    OR: [
                        { createdAt: { lt: product.createdAt } },
                        {
                            createdAt: product.createdAt,
                            id: { lt: product.id }
                        }
                    ]
                },
                orderBy: [
                    { createdAt: 'desc' },
                    { id: 'desc' }
                ],
                select: { id: true, name: true, catalogPage: true }
            });

            // Circular Navigation: If no previous, wrap to the last product
            if (!prev) {
                prev = await prisma.product.findFirst({
                    where: { catalogId: product.catalogId, id: { not: product.id } },
                    orderBy: [
                        { createdAt: 'desc' },
                        { id: 'desc' }
                    ],
                    select: { id: true, name: true, catalogPage: true }
                });
            }

            // Find next product (robust logic: newer created OR same created but larger ID)
            let next = await prisma.product.findFirst({
                where: {
                    catalogId: product.catalogId,
                    OR: [
                        { createdAt: { gt: product.createdAt } },
                        {
                            createdAt: product.createdAt,
                            id: { gt: product.id }
                        }
                    ]
                },
                orderBy: [
                    { createdAt: 'asc' },
                    { id: 'asc' }
                ],
                select: { id: true, name: true, catalogPage: true }
            });

            // Circular Navigation: If no next, wrap to the first product
            if (!next) {
                next = await prisma.product.findFirst({
                    where: { catalogId: product.catalogId, id: { not: product.id } },
                    orderBy: [
                        { createdAt: 'asc' },
                        { id: 'asc' }
                    ],
                    select: { id: true, name: true, catalogPage: true }
                });
            }

            navigation = { prev, next };
        }

        // Parse localImages from catalog to get the full list of pages
        let catalogImages: string[] = [];
        if (catalog && catalog.localImages) {
            try {
                // localImages is stored as a JSON string of filenames
                const images = JSON.parse(catalog.localImages);
                // Create full paths based on imageBasePath
                // The images are typically just filenames like "page-001.jpg"
                // imageBasePath is like "/catalogs/store/id-"
                if (Array.isArray(images) && catalog.imageBasePath) {
                    catalogImages = images.map(img => `${catalog.imageBasePath}/${img}`);
                }
            } catch (e) {
                console.error('Failed to parse localImages', e);
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
        console.error('Error fetching product:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
