#!/usr/bin/env node
/**
 * Catalog Scraper v2 - Multi-Source Cascading
 *
 * Downloads catalog images locally and stores metadata in database.
 * Tries multiple source adapters per store in priority order:
 *   1. cataloagedeoferte.ro (fast, cheerio)
 *   2. ofertelecatalog.ro  (puppeteer, JS-rendered)
 *
 * If no source has current catalogs for a store, it's simply skipped.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const registry = require('./sources/registry');

const prisma = new PrismaClient();

// Configuration
const CATALOGS_DIR = path.join(process.cwd(), 'public', 'catalogs');
const LOGS_DIR = path.join(process.cwd(), 'logs');
const STATUS_FILE = path.join(LOGS_DIR, 'catalog-scraper-status.json');

// Stores to scrape — slugs can differ per source
const STORES = [
    { name: 'Kaufland', slug: 'kaufland' },
    { name: 'Lidl', slug: 'lidl' },
    { name: 'Carrefour', slug: 'carrefour' },
    { name: 'Mega Image', slug: 'mega-image' },
    { name: 'Penny', slug: 'penny-market' },
    { name: 'Profi', slug: 'profi' },
    { name: 'Selgros', slug: 'selgros' },
    { name: 'Supeco', slug: 'supeco' },
    { name: 'Auchan', slug: 'auchan' },
];

// Status tracking
let status = {
    running: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalCatalogs: 0,
    totalPages: 0,
    totalStores: STORES.length,
    processedStores: 0,
    stores: {},
    currentStore: null,
    currentCatalog: null,
    error: null
};

// Initialize store status
STORES.forEach(store => {
    status.stores[store.name] = { success: false, catalogs: 0, pages: 0, source: null, error: null };
});

// Logging
const logTimestamp = new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' }).replace(/[/:, ]/g, '-');
const LOG_FILE = path.join(LOGS_DIR, `catalog-scraper-${logTimestamp}.log`);

function log(message) {
    const timestamp = new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
    const line = `[${timestamp}] ${message}`;
    console.log(line);
    ensureDir(LOGS_DIR);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

function saveStatus() {
    ensureDir(LOGS_DIR);
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

// Utility: delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Utility: download image from any URL
async function downloadImage(url, filepath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });
        fs.writeFileSync(filepath, response.data);
        return true;
    } catch {
        return false;
    }
}

// ── Download & Save (unified for all sources) ────────────────────────────────

/**
 * Download all page images for a catalog.
 * imageUrls come from the source adapter — format: [{ page, url }]
 */
async function downloadCatalogImages(catalog, imageUrls) {
    const localDir = path.join(CATALOGS_DIR, catalog.storeSlug, catalog.slug);
    ensureDir(localDir);

    const downloadedImages = [];
    let successCount = 0;

    for (const { page, url } of imageUrls) {
        const pageNum = String(page).padStart(2, '0');
        // Detect extension from source URL (.webp, .jpg, .png), default to .webp
        const extMatch = url.match(/\.(webp|jpg|jpeg|png)(\?|$)/i);
        const ext = extMatch ? extMatch[1].toLowerCase().replace('jpeg', 'jpg') : 'webp';
        const localFilename = `page-${pageNum}.${ext}`;
        const localPath = path.join(localDir, localFilename);

        // Check if already downloaded (any extension)
        const existing = ['webp', 'jpg', 'png'].find(e =>
            fs.existsSync(path.join(localDir, `page-${pageNum}.${e}`))
        );
        if (existing) {
            downloadedImages.push(`page-${pageNum}.${existing}`);
            successCount++;
            continue;
        }

        const success = await downloadImage(url, localPath);
        if (success) {
            downloadedImages.push(localFilename);
            successCount++;
        }

        await delay(100);
    }

    log(`  Downloaded ${successCount}/${imageUrls.length} pages`);

    return {
        localImages: downloadedImages,
        imageBasePath: `/catalogs/${catalog.storeSlug}/${catalog.slug}`,
        pagesDownloaded: successCount
    };
}

/**
 * Save catalog metadata to database.
 * Uses validFrom/validUntil from the catalog object (set by source adapter).
 */
async function saveCatalogToDb(catalog, pageCount, localData) {
    const validFrom = catalog.validFrom || new Date();
    const validUntil = catalog.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
        await prisma.catalog.upsert({
            where: { slug: catalog.slug },
            update: {
                title: catalog.title,
                validFrom,
                validUntil,
                totalPages: pageCount,
                processedPages: localData.localImages.length,
                localImages: JSON.stringify(localData.localImages),
                imageBasePath: localData.imageBasePath,
                sourceUrl: catalog.url,
                status: 'COMPLETED',
                processingCompletedAt: new Date(),
                updatedAt: new Date()
            },
            create: {
                store: catalog.storeName,
                title: catalog.title,
                slug: catalog.slug,
                pdfUrl: catalog.url,
                sourceUrl: catalog.url,
                validFrom,
                validUntil,
                status: 'COMPLETED',
                totalPages: pageCount,
                processedPages: localData.localImages.length,
                localImages: JSON.stringify(localData.localImages),
                imageBasePath: localData.imageBasePath,
                processingCompletedAt: new Date()
            }
        });
        return true;
    } catch (error) {
        log(`  DB Error: ${error.message}`);
        return false;
    }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanupExpiredCatalogs() {
    log('Cleaning up expired catalogs...');

    const expiredCatalogs = await prisma.catalog.findMany({
        where: { validUntil: { lt: new Date() } }
    });

    for (const catalog of expiredCatalogs) {
        if (catalog.imageBasePath) {
            const localDir = path.join(process.cwd(), 'public', catalog.imageBasePath);
            if (fs.existsSync(localDir)) {
                fs.rmSync(localDir, { recursive: true, force: true });
            }
        }
        await prisma.catalog.delete({ where: { id: catalog.id } });
    }

    log(`  Cleaned ${expiredCatalogs.length} expired catalogs`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    log('='.repeat(60));
    log('Catalog Scraper v2 - Multi-Source Cascading');
    log('='.repeat(60));

    ensureDir(CATALOGS_DIR);
    saveStatus();

    for (const store of STORES) {
        try {
            log(`Processing store: ${store.name}`);
            status.currentStore = store.name;
            saveStatus();

            // Cascading discovery: try each source in priority order
            const { catalogs, source } = await registry.discoverCatalogsForStore(store, log);

            status.stores[store.name].source = source;
            let storePages = 0;

            for (const catalog of catalogs) {
                status.currentCatalog = catalog.title;
                saveStatus();
                log(`  Processing catalog: ${catalog.title} [${catalog.source}]`);

                // Get page image URLs from the source adapter
                const { pageCount, imageUrls } = await registry.getPageImageUrls(catalog);

                if (imageUrls.length === 0) {
                    log(`  No page images found for: ${catalog.slug}`);
                    continue;
                }

                // Download images (unified for all sources)
                const localData = await downloadCatalogImages(catalog, imageUrls);

                if (localData.pagesDownloaded > 0) {
                    await saveCatalogToDb(catalog, pageCount, localData);
                    status.totalCatalogs++;
                    status.totalPages += localData.pagesDownloaded;
                    status.stores[store.name].catalogs++;
                    storePages += localData.pagesDownloaded;
                }

                await delay(500);
            }

            status.stores[store.name].pages = storePages;
            status.stores[store.name].success = catalogs.length > 0;
            status.processedStores++;
            saveStatus();

        } catch (error) {
            log(`Store ${store.name} failed: ${error.message}`);
            status.stores[store.name].error = error.message;
            status.stores[store.name].success = false;
            saveStatus();
        }
    }

    await cleanupExpiredCatalogs();

    // Close all source adapters (puppeteer browser, etc.)
    await registry.closeAll();

    status.running = false;
    status.completedAt = new Date().toISOString();
    status.currentStore = null;
    status.currentCatalog = null;
    saveStatus();

    log('');
    log('='.repeat(60));
    log('SCRAPING COMPLETE');
    log(`  Total catalogs: ${status.totalCatalogs}`);
    log(`  Total pages: ${status.totalPages}`);
    log('  Store Results:');
    for (const [name, data] of Object.entries(status.stores)) {
        const icon = data.success ? '+' : '-';
        const src = data.source ? ` [${data.source}]` : '';
        log(`    ${icon} ${name}: ${data.catalogs} catalogs, ${data.pages} pages${src}`);
    }
    log('='.repeat(60));

    await prisma.$disconnect();
}

main().catch(async error => {
    log(`Fatal error: ${error.message}`);
    status.running = false;
    status.error = error.message;
    status.completedAt = new Date().toISOString();
    saveStatus();
    await registry.closeAll().catch(() => {});
    await prisma.$disconnect();
    process.exit(1);
});
