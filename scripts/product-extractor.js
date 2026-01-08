#!/usr/bin/env node

/**
 * Product Extractor - Extracts products from local catalog images using AI (Gemini Vision)
 * Reads catalog images downloaded by catalog-scraper-v2.js
 * Saves extracted products to database
 */

require('dotenv').config({ path: '.env.production', override: false });
require('dotenv').config({ path: '.env', override: false });

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const prisma = new PrismaClient();

// Configuration
const CATALOGS_DIR = path.join(process.cwd(), 'public', 'catalogs');
const LOGS_DIR = path.join(process.cwd(), 'logs');
const STATUS_FILE = path.join(LOGS_DIR, 'product-extractor-status.json');

// OpenRouter Configuration for Gemini Vision
const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Product Extractor CatalogSmart',
    },
});
const VISION_MODEL = 'google/gemini-2.0-flash-001';

// Status tracking
let status = {
    running: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalCatalogs: 0,
    totalPages: 0,
    totalProducts: 0,
    stores: {},
    currentStore: null,
    currentCatalog: null,
    error: null
};

// Logging
let logBuffer = [];
const logTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(LOGS_DIR, `product-extractor-${logTimestamp}.log`);

function log(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;
    console.log(line);
    logBuffer.push(line);
}

function saveLog() {
    ensureDir(LOGS_DIR);
    fs.writeFileSync(LOG_FILE, logBuffer.join('\n'));
}

function saveStatus() {
    ensureDir(LOGS_DIR);
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Convert image to base64
function imageToBase64(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
}

// Extract products from a catalog page using Gemini Vision
async function extractProductsFromImage(imagePath, storeName) {
    try {
        const base64Image = imageToBase64(imagePath);
        const mimeType = imagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

        const response = await openrouter.chat.completions.create({
            model: VISION_MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`
                            }
                        },
                        {
                            type: 'text',
                            text: `Analizează această pagină de catalog de la ${storeName}. 
Extrage TOATE produsele vizibile cu prețurile lor.

Pentru fiecare produs returnează:
- name: numele produsului (în română)
- price: prețul actual (doar numărul, ex: 12.99)
- originalPrice: prețul vechi dacă există (sau null)
- unit: unitatea de măsură (buc, kg, l, etc.) - implicit "buc"
- discount: procentul de reducere dacă e vizibil (sau null)
- category: categoria produsului (Lactate, Mezeluri, Fructe, Legume, Băuturi, Dulciuri, etc.)

IMPORTANT: Returnează DOAR un array JSON valid, fără text explicativ.
Exemplu: [{"name":"Lapte Zuzu 1L","price":5.99,"originalPrice":7.99,"unit":"buc","discount":25,"category":"Lactate"}]

Dacă nu găsești produse cu prețuri clare, returnează: []`
                        }
                    ]
                }
            ],
            max_tokens: 4000,
            temperature: 0.1
        });

        const content = response.choices[0]?.message?.content || '[]';

        // Parse JSON from response
        let products = [];
        try {
            // Find JSON array in response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                products = JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            log(`  ⚠️ Failed to parse AI response: ${parseError.message}`);
        }

        return products;
    } catch (error) {
        log(`  ❌ AI extraction error: ${error.message}`);
        return [];
    }
}

// Save products to database
async function saveProductsToDb(products, storeName, catalogId) {
    let savedCount = 0;

    for (const product of products) {
        if (!product.name || !product.price) continue;

        try {
            // Generate a unique identifier based on store + product name
            const productSlug = `${storeName.toLowerCase()}-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

            await prisma.product.upsert({
                where: { slug: productSlug },
                update: {
                    price: parseFloat(product.price) || 0,
                    originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
                    discount: product.discount ? parseInt(product.discount) : null,
                    unit: product.unit || 'buc',
                    category: product.category || 'Alte',
                    store: storeName,
                    catalogId: catalogId,
                    updatedAt: new Date()
                },
                create: {
                    name: product.name,
                    slug: productSlug,
                    price: parseFloat(product.price) || 0,
                    originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
                    discount: product.discount ? parseInt(product.discount) : null,
                    unit: product.unit || 'buc',
                    category: product.category || 'Alte',
                    store: storeName,
                    catalogId: catalogId,
                    inStock: true,
                    isActive: true
                }
            });
            savedCount++;
        } catch (error) {
            // Skip duplicate or invalid products
        }
    }

    return savedCount;
}

// Process a single catalog
async function processCatalog(catalog) {
    const catalogDir = path.join(process.cwd(), 'public', catalog.imageBasePath);

    if (!fs.existsSync(catalogDir)) {
        log(`  ⚠️ Catalog directory not found: ${catalogDir}`);
        return 0;
    }

    const images = fs.readdirSync(catalogDir)
        .filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'))
        .sort();

    let totalProducts = 0;

    log(`  📄 Processing ${images.length} pages...`);

    for (let i = 0; i < images.length; i++) {
        const imagePath = path.join(catalogDir, images[i]);

        // Extract products using AI
        const products = await extractProductsFromImage(imagePath, catalog.store);

        if (products.length > 0) {
            const saved = await saveProductsToDb(products, catalog.store, catalog.id);
            totalProducts += saved;
            log(`    Page ${i + 1}/${images.length}: ${saved} products extracted`);
        }

        // Rate limiting - 2 seconds between API calls
        await delay(2000);
    }

    return totalProducts;
}

// Get stores from catalog directories
function getAvailableStores() {
    if (!fs.existsSync(CATALOGS_DIR)) {
        return [];
    }

    return fs.readdirSync(CATALOGS_DIR)
        .filter(f => fs.statSync(path.join(CATALOGS_DIR, f)).isDirectory());
}

// Main execution
async function main() {
    log('='.repeat(60));
    log('📦 Product Extractor - AI-based product extraction');
    log('='.repeat(60));

    ensureDir(LOGS_DIR);

    // Initialize store status
    const storeNames = getAvailableStores();
    for (const store of storeNames) {
        status.stores[store] = { success: false, catalogs: 0, products: 0, error: null };
    }
    saveStatus();

    // Get all catalogs with local images that HAVEN'T been processed yet
    const catalogs = await prisma.catalog.findMany({
        where: {
            status: 'COMPLETED',
            localImages: { not: null },
            imageBasePath: { not: null },
            productsExtractedAt: null  // Only process catalogs that haven't been extracted yet
        },
        orderBy: { store: 'asc' }
    });

    log(`Found ${catalogs.length} NEW catalogs to process (skipping already processed)`);
    status.totalCatalogs = catalogs.length;
    saveStatus();

    if (catalogs.length === 0) {
        log('✅ All catalogs have been processed! No new catalogs to extract.');
        status.running = false;
        status.completedAt = new Date().toISOString();
        saveStatus();
        saveLog();
        await prisma.$disconnect();
        return;
    }

    for (const catalog of catalogs) {
        status.currentStore = catalog.store;
        status.currentCatalog = catalog.title;
        saveStatus();

        log(`\n📖 Processing: ${catalog.title} (${catalog.store})`);

        try {
            const productCount = await processCatalog(catalog);

            // Mark catalog as processed to avoid re-processing next time
            await prisma.catalog.update({
                where: { id: catalog.id },
                data: { productsExtractedAt: new Date() }
            });
            log(`  ✅ Marked catalog as processed`);

            status.totalProducts += productCount;
            status.totalPages += catalog.totalPages || 0;

            if (!status.stores[catalog.store]) {
                status.stores[catalog.store] = { success: false, catalogs: 0, products: 0, error: null };
            }
            status.stores[catalog.store].catalogs++;
            status.stores[catalog.store].products += productCount;
            status.stores[catalog.store].success = true;

            saveStatus();

        } catch (error) {
            log(`  ❌ Error processing catalog: ${error.message}`);
            if (status.stores[catalog.store]) {
                status.stores[catalog.store].error = error.message;
            }
            saveStatus();
        }

        // Delay between catalogs
        await delay(1000);
    }

    status.running = false;
    status.completedAt = new Date().toISOString();
    status.currentStore = null;
    status.currentCatalog = null;
    saveStatus();

    log('');
    log('='.repeat(60));
    log('✅ EXTRACTION COMPLETE');
    log(`  Catalogs processed: ${status.totalCatalogs}`);
    log(`  Pages processed: ${status.totalPages}`);
    log(`  Products extracted: ${status.totalProducts}`);
    log('  Store Results:');
    for (const [name, data] of Object.entries(status.stores)) {
        const icon = data.success ? '✅' : '❌';
        log(`    ${icon} ${name}: ${data.catalogs} catalogs, ${data.products} products`);
    }
    log('='.repeat(60));

    saveLog();
    await prisma.$disconnect();
}

main().catch(error => {
    log(`Fatal error: ${error.message}`);
    status.running = false;
    status.error = error.message;
    status.completedAt = new Date().toISOString();
    saveStatus();
    saveLog();
    prisma.$disconnect();
    process.exit(1);
});
