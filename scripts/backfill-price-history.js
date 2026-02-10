#!/usr/bin/env node

/**
 * Backfill Price History
 * One-time script that reads all current products and inserts them into
 * the price_history table. Run after initial schema creation.
 *
 * Usage: node scripts/backfill-price-history.js
 */

require('dotenv').config({ path: '.env.production', override: false });
require('dotenv').config({ path: '.env', override: false });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Port of normalizeProductName from src/lib/search/dedup.ts
function normalizeProductName(name, brand) {
    let normalized = name.toLowerCase().trim();

    if (brand) {
        const brandLower = brand.toLowerCase();
        const escaped = brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
    }

    normalized = normalized.replace(
        /\b(mega\s*image|lidl|kaufland|carrefour|penny|profi|auchan|cora|metro|selgros)\b/gi,
        ''
    );

    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const unitMap = {
        kilogram: 'kg', grame: 'g', gram: 'g', litru: 'l', litri: 'l',
        mililitri: 'ml', mililitru: 'ml', bucata: 'buc', bucati: 'buc',
    };
    for (const [from, to] of Object.entries(unitMap)) {
        normalized = normalized.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
    }

    normalized = normalized.replace(/\s+/g, ' ').trim();
    normalized = normalized.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

    return normalized;
}

async function main() {
    console.log('='.repeat(60));
    console.log('Backfill Price History');
    console.log('='.repeat(60));

    // Count existing history entries
    const existingCount = await prisma.priceHistory.count();
    console.log(`Existing price history entries: ${existingCount}`);

    // Fetch all current products
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            price: true,
            originalPrice: true,
            discountPercentage: true,
            unit: true,
            store: true,
            validFrom: true,
            validUntil: true,
            catalogId: true,
        },
    });

    console.log(`Found ${products.length} products to backfill`);

    if (products.length === 0) {
        console.log('No products found. Nothing to backfill.');
        await prisma.$disconnect();
        return;
    }

    // Process in batches of 100
    const BATCH_SIZE = 100;
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);

        const data = batch
            .map((p) => {
                const normalizedName = normalizeProductName(p.name, p.brand);
                if (!normalizedName) return null;
                return {
                    normalizedName,
                    store: p.store,
                    brand: p.brand || null,
                    category: p.category || null,
                    originalName: p.name,
                    price: Number(p.price),
                    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                    discountPct: p.discountPercentage ? Math.round(Number(p.discountPercentage)) : null,
                    unit: p.unit || 'buc',
                    validFrom: p.validFrom,
                    validUntil: p.validUntil,
                    catalogId: p.catalogId || null,
                    sourceProductId: p.id,
                };
            })
            .filter(Boolean);

        if (data.length === 0) {
            skipped += batch.length;
            continue;
        }

        try {
            const result = await prisma.priceHistory.createMany({
                data,
                skipDuplicates: true,
            });
            inserted += result.count;
            skipped += data.length - result.count;
        } catch (err) {
            console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${err.message}`);
            errors += batch.length;
        }

        const progress = Math.min(i + BATCH_SIZE, products.length);
        process.stdout.write(`\rProgress: ${progress}/${products.length} (inserted: ${inserted}, skipped: ${skipped}, errors: ${errors})`);
    }

    console.log('\n');
    console.log('='.repeat(60));
    console.log('Backfill complete!');
    console.log(`  Total products: ${products.length}`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Skipped (duplicates or empty): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log('='.repeat(60));

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('Fatal error:', err.message);
    prisma.$disconnect();
    process.exit(1);
});
