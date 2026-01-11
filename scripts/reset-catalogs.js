#!/usr/bin/env node
require('dotenv').config({ path: '.env.production', override: false });
require('dotenv').config({ path: '.env', override: false });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetCatalogs() {
    console.log('🔄 Resetting all catalogs for reprocessing...');

    const result = await prisma.catalog.updateMany({
        data: { productsExtractedAt: null }
    });

    console.log(`✅ Reset ${result.count} catalogs!`);
    console.log('You can now run product-extractor.js again.');

    await prisma.$disconnect();
}

resetCatalogs().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
