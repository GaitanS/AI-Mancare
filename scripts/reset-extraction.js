const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Resetting catalog extraction status...');

    // Option 1: Reset ALL catalogs
    // const result = await prisma.catalog.updateMany({
    //     data: { productsExtractedAt: null }
    // });

    // Option 2: Reset only catalogs that have 0 products extracted (safer)
    // First, find catalogs that have been marked as processed
    const catalogs = await prisma.catalog.findMany({
        where: {
            productsExtractedAt: { not: null }
        },
        include: {
            _count: {
                select: { products: true }
            }
        }
    });

    let resetCount = 0;
    for (const catalog of catalogs) {
        // If a catalog has 0 products or very few (failed run), reset it
        if (catalog._count.products === 0) {
            await prisma.catalog.update({
                where: { id: catalog.id },
                data: { productsExtractedAt: null }
            });
            console.log(`  ✅ Reset catalog: ${catalog.store} - ${catalog.title} (had 0 products)`);
            resetCount++;
        }
    }

    console.log(`\n✨ Reset complete! ${resetCount} catalogs are ready to be re-processed.`);
    console.log(`Now run: node scripts/product-extractor.js`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
