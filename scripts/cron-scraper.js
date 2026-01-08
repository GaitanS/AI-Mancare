#!/usr/bin/env node

/**
 * Cron Scraper - Kimbino.ro (Romanian Catalog Aggregator)
 * Runs weekly to scrape new catalogs from major supermarkets
 * Works WITHOUT Puppeteer - uses simple HTTP requests (Hostinger compatible!)
 */

// Load .env.production only if env vars not already set (e.g., by GitHub Actions)
require('dotenv').config({ path: '.env.production', override: false });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../storage');

// Logging utilities
const log = {
  info: (msg) => console.log(`[SCRAPER] [INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[SCRAPER] [ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SCRAPER] [SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

// Stores we want to scrape
const TARGET_STORES = [
  { slug: 'lidl', name: 'Lidl' },
  { slug: 'kaufland', name: 'Kaufland' },
  { slug: 'penny', name: 'Penny' },
  { slug: 'profi', name: 'Profi' },
  { slug: 'mega-image', name: 'Mega Image' },
  { slug: 'carrefour', name: 'Carrefour' },
  { slug: 'auchan', name: 'Auchan' },
  { slug: 'selgros', name: 'Selgros' },
];

/**
 * Fetch page content with proper headers
 */
async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Parse date range from Kimbino format
 * Example: "07.01.2026 - 13.01.2026"
 */
function parseDateRange(dateString) {
  try {
    const pattern = /(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/;
    const match = dateString.match(pattern);

    if (match) {
      const [_, startDay, startMonth, startYear, endDay, endMonth, endYear] = match;
      return {
        start: new Date(`${startYear}-${startMonth}-${startDay}`),
        end: new Date(`${endYear}-${endMonth}-${endDay}`),
      };
    }

    // Fallback
    return {
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    log.error(`Date parsing error: ${error.message}`);
    return {
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * Scrape Kimbino.ro homepage for all catalogs
 */
async function scrapeKimbinoHomepage() {
  log.info('Scraping Kimbino.ro homepage...');

  const html = await fetchPage('https://kimbino.ro');
  if (!html) return [];

  const $ = cheerio.load(html);
  const catalogs = [];

  // Find catalog links on the homepage
  $('a[href*="/catalog-"]').each((i, elem) => {
    const link = $(elem).attr('href');
    const text = $(elem).text().trim();

    // Extract date from text (format: "07.01.2026 - 13.01.2026")
    const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);

    if (link && link.includes('kimbino.ro')) {
      // Extract store name from URL
      const storeMatch = link.match(/kimbino\.ro\/([^\/]+)\//);
      const storeSlug = storeMatch ? storeMatch[1] : 'unknown';

      catalogs.push({
        url: link.startsWith('http') ? link : `https://kimbino.ro${link}`,
        storeName: storeSlug,
        dateRange: dateMatch ? `${dateMatch[1]} - ${dateMatch[2]}` : null,
      });
    }
  });

  log.info(`Found ${catalogs.length} catalog links on homepage`);
  return catalogs;
}

/**
 * Scrape individual store page for catalog details
 */
async function scrapeStoreCatalogs(storeSlug, storeName) {
  log.info(`Scraping catalogs for ${storeName}...`);

  const url = `https://kimbino.ro/${storeSlug}/`;
  const html = await fetchPage(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const catalogs = [];

  // Find catalog cards
  $('a.leaflet-card, a[href*="/catalog-"], .catalog-item a').each((i, elem) => {
    const link = $(elem).attr('href');
    const title = $(elem).find('.title, h2, h3').text().trim() || $(elem).text().trim();

    // Find date info
    const dateText = $(elem).find('.date, .validity, time').text().trim();
    const dates = parseDateRange(dateText);

    // Find PDF link if available
    const pdfLink = $(elem).find('a[href*=".pdf"]').attr('href') || null;

    if (link) {
      catalogs.push({
        title: title || `Catalog ${storeName}`,
        url: link.startsWith('http') ? link : `https://kimbino.ro${link}`,
        pdfUrl: pdfLink,
        storeName: storeName,
        validFrom: dates.start,
        validUntil: dates.end,
      });
    }
  });

  // Deduplicate by URL
  const unique = [...new Map(catalogs.map(c => [c.url, c])).values()];

  log.info(`Found ${unique.length} catalogs for ${storeName}`);
  return unique;
}

/**
 * Scrape catalog page for products (if Kimbino shows them)
 */
async function scrapeCatalogProducts(catalogUrl) {
  log.info(`Scraping products from ${catalogUrl}...`);

  const html = await fetchPage(catalogUrl);
  if (!html) return [];

  const $ = cheerio.load(html);
  const products = [];

  // Try to find product listings
  $('.product, .offer-item, .product-card').each((i, elem) => {
    const name = $(elem).find('.product-name, .title, h3').text().trim();
    const priceText = $(elem).find('.price, .current-price').text().trim();
    const oldPriceText = $(elem).find('.old-price, .original-price').text().trim();

    const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
    const oldPrice = oldPriceText ?
      parseFloat(oldPriceText.replace(/[^\d.,]/g, '').replace(',', '.')) : null;

    if (name && !isNaN(price)) {
      products.push({
        name,
        price,
        originalPrice: oldPrice,
        discount: oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0,
      });
    }
  });

  log.info(`Extracted ${products.length} products from catalog`);
  return products;
}

/**
 * Save catalog to database
 */
async function saveCatalog(catalog) {
  try {
    // Check if already exists
    const existing = await prisma.catalog.findFirst({
      where: {
        store: catalog.storeName,
        validFrom: catalog.validFrom,
        validUntil: catalog.validUntil,
      }
    });

    if (existing) {
      log.info(`Catalog ${catalog.storeName} already exists, skipping`);
      return existing;
    }

    // Create new catalog
    const saved = await prisma.catalog.create({
      data: {
        store: catalog.storeName,
        title: catalog.title,
        sourceUrl: catalog.url,
        pdfUrl: catalog.pdfUrl || '',
        validFrom: catalog.validFrom,
        validUntil: catalog.validUntil,
        status: 'PENDING',
      }
    });

    log.success(`Saved catalog: ${catalog.storeName} - ${catalog.title}`);
    return saved;

  } catch (error) {
    log.error(`Failed to save catalog: ${error.message}`);
    return null;
  }
}

/**
 * Main scraping function
 */
async function runScraper() {
  log.info('========================================');
  log.info('Starting Kimbino.ro Catalog Scraper');
  log.info('========================================');

  const startTime = Date.now();
  let catalogsFound = 0;
  let catalogsSaved = 0;

  try {
    // Scrape each target store
    for (const store of TARGET_STORES) {
      try {
        await delay(2000); // Rate limiting

        const catalogs = await scrapeStoreCatalogs(store.slug, store.name);
        catalogsFound += catalogs.length;

        // Save each catalog
        for (const catalog of catalogs) {
          const saved = await saveCatalog(catalog);
          if (saved) catalogsSaved++;
        }

      } catch (storeError) {
        log.error(`Error scraping ${store.name}: ${storeError.message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success('========================================');
    log.success(`Scraping completed in ${duration}s`);
    log.success(`Found: ${catalogsFound} catalogs`);
    log.success(`Saved: ${catalogsSaved} new catalogs`);
    log.success('========================================');

    return { catalogsFound, catalogsSaved };

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Helper: delay execution
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
  runScraper()
    .then((result) => {
      log.success(`Job finished. Found ${result.catalogsFound}, saved ${result.catalogsSaved}`);
      process.exit(0);
    })
    .catch((error) => {
      log.error(`Job failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runScraper };
