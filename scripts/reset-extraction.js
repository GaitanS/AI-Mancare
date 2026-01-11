const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Resetting catalog extraction status...');

    // Find catalogs that have been marked as processed
    const catalogs = await prisma.catalog.findMany({
        where: {
            productsExtractedAt: { not: null }
        }
    });

    let resetCount = 0;
    for (const catalog of catalogs) {
        // Count products for this catalog manually since there is no relation defined
        const productCount = await prisma.product.count({
            where: {
                catalogId: catalog.id
            }
        });

        // If a catalog has 0 products (failed run), reset it
        if (productCount === 0) {
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
