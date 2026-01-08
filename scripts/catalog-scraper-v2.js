#!/usr/bin/env node
/**
 * Catalog Scraper v2 - cataloagedeoferte.ro
 * 
 * Downloads catalog images locally and stores metadata in database.
 * Includes logging to file and status tracking for admin UI.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'https://cataloagedeoferte.ro';
const IMAGE_CDN = 'https://app.cataloagedeoferte.ro';
const CATALOGS_DIR = path.join(process.cwd(), 'public', 'catalogs');
const LOGS_DIR = path.join(process.cwd(), 'logs');
const STATUS_FILE = path.join(process.cwd(), 'logs', 'catalog-scraper-status.json');

// Stores to scrape
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
    stores: {},
    currentStore: null,
    error: null
};

// Initialize store status
STORES.forEach(store => {
    status.stores[store.name] = { success: false, catalogs: 0, pages: 0, error: null };
});

// Logging
let logBuffer = [];
const logTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(LOGS_DIR, `catalog-scraper-${logTimestamp}.log`);

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

// Utility: delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Utility: download image
async function downloadImage(url, filepath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            }
        });
        fs.writeFileSync(filepath, response.data);
        return true;
    } catch (error) {
        return false;
    }
}

// Parse catalog ID from URL to CDN path
function getCatalogCdnPath(catalogSlug, storeSlug) {
    const parts = catalogSlug.split('-');
    if (parts.length < 8) return null;

    const uniqueId = parts[parts.length - 1];
    const endYear = parts[parts.length - 2];
    const endMonth = parts[parts.length - 3];
    const endDay = parts[parts.length - 4];
    const startYear = parts[parts.length - 5];
    const startMonth = parts[parts.length - 6];
    const startDay = parts[parts.length - 7];

    const cdnPath = `${endYear}${endMonth}${endDay}_${startYear}${startMonth}${startDay}_${storeSlug}_${uniqueId}`;
    return cdnPath;
}

// Get catalogs for a store
async function getStoreCatalogs(store) {
    log(`📦 Fetching catalogs for ${store.name}...`);
    status.currentStore = store.name;
    saveStatus();

    try {
        const response = await axios.get(`${BASE_URL}/magazine/${store.slug}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const catalogs = [];

        $('a[href*="/magazine/' + store.slug + '/"]').each((i, el) => {
            const href = $(el).attr('href');
            const match = href?.match(new RegExp(`/magazine/${store.slug}/([^/]+)/1$`));
            if (match) {
                const catalogSlug = match[1];
                const title = $(el).text().trim() || catalogSlug;

                if (!catalogs.find(c => c.slug === catalogSlug)) {
                    catalogs.push({
                        slug: catalogSlug,
                        title: title,
                        url: `${BASE_URL}${href}`,
                        storeSlug: store.slug,
                        storeName: store.name
                    });
                }
            }
        });

        log(`  Found ${catalogs.length} catalogs`);
        return catalogs;

    } catch (error) {
        log(`  ❌ Error fetching store: ${error.message}`);
        status.stores[store.name].error = error.message;
        saveStatus();
        return [];
    }
}

// Get total pages for a catalog
async function getCatalogPageCount(catalogUrl) {
    try {
        const response = await axios.get(catalogUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        let maxPage = 1;
        $('a').each((i, el) => {
            const text = $(el).text().trim();
            const pageNum = parseInt(text);
            if (!isNaN(pageNum) && pageNum > maxPage) {
                maxPage = pageNum;
            }
        });

        return maxPage;
    } catch (error) {
        return 1;
    }
}

// Parse validity dates from catalog slug
function parseValidityDates(catalogSlug) {
    const parts = catalogSlug.split('-');
    if (parts.length < 8) {
        return { validFrom: new Date(), validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }

    const endYear = parseInt('20' + parts[parts.length - 2]);
    const endMonth = parseInt(parts[parts.length - 3]) - 1;
    const endDay = parseInt(parts[parts.length - 4]);
    const startYear = parseInt('20' + parts[parts.length - 5]);
    const startMonth = parseInt(parts[parts.length - 6]) - 1;
    const startDay = parseInt(parts[parts.length - 7]);

    return {
        validFrom: new Date(startYear, startMonth, startDay),
        validUntil: new Date(endYear, endMonth, endDay)
    };
}

// Download all pages for a catalog
async function downloadCatalog(catalog, totalPages) {
    const cdnPath = getCatalogCdnPath(catalog.slug, catalog.storeSlug);
    if (!cdnPath) {
        log(`  ❌ Could not parse CDN path for: ${catalog.slug}`);
        return null;
    }

    const localDir = path.join(CATALOGS_DIR, catalog.storeSlug, catalog.slug);
    ensureDir(localDir);

    const downloadedImages = [];
    let successCount = 0;

    for (let page = 1; page <= totalPages; page++) {
        const pageNum = String(page).padStart(2, '0');
        const imageUrl = `${IMAGE_CDN}/${cdnPath}/image${pageNum}.webp`;
        const localFilename = `page-${pageNum}.webp`;
        const localPath = path.join(localDir, localFilename);

        if (fs.existsSync(localPath)) {
            downloadedImages.push(localFilename);
            successCount++;
            continue;
        }

        const success = await downloadImage(imageUrl, localPath);
        if (success) {
            downloadedImages.push(localFilename);
            successCount++;
        }

        await delay(100);
    }

    log(`  ✅ Downloaded ${successCount}/${totalPages} pages`);

    return {
        localImages: downloadedImages,
        imageBasePath: `/catalogs/${catalog.storeSlug}/${catalog.slug}`,
        pagesDownloaded: successCount
    };
}

// Save catalog to database
async function saveCatalogToDb(catalog, pageCount, localData) {
    const { validFrom, validUntil } = parseValidityDates(catalog.slug);

    try {
        await prisma.catalog.upsert({
            where: { slug: catalog.slug },
            update: {
                title: catalog.title,
                totalPages: pageCount,
                processedPages: localData.localImages.length,
                localImages: JSON.stringify(localData.localImages),
                imageBasePath: localData.imageBasePath,
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
        log(`  ❌ DB Error: ${error.message}`);
        return false;
    }
}

// Clean up expired catalogs
async function cleanupExpiredCatalogs() {
    log('🧹 Cleaning up expired catalogs...');

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

// Main execution
async function main() {
    log('='.repeat(60));
    log('🚀 Catalog Scraper v2 - cataloagedeoferte.ro');
    log('='.repeat(60));

    ensureDir(CATALOGS_DIR);
    saveStatus();

    for (const store of STORES) {
        try {
            const catalogs = await getStoreCatalogs(store);
            let storePages = 0;

            for (const catalog of catalogs) {
                log(`📖 Processing: ${catalog.title}`);

                const pageCount = await getCatalogPageCount(catalog.url);
                const localData = await downloadCatalog(catalog, pageCount);

                if (localData) {
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
            saveStatus();

        } catch (error) {
            log(`❌ Store ${store.name} failed: ${error.message}`);
            status.stores[store.name].error = error.message;
            status.stores[store.name].success = false;
            saveStatus();
        }
    }

    await cleanupExpiredCatalogs();

    status.running = false;
    status.completedAt = new Date().toISOString();
    status.currentStore = null;
    saveStatus();

    log('');
    log('='.repeat(60));
    log('✅ SCRAPING COMPLETE');
    log(`  Total catalogs: ${status.totalCatalogs}`);
    log(`  Total pages: ${status.totalPages}`);
    log('  Store Results:');
    for (const [name, data] of Object.entries(status.stores)) {
        const icon = data.success ? '✅' : '❌';
        log(`    ${icon} ${name}: ${data.catalogs} catalogs, ${data.pages} pages`);
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

