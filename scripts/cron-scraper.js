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
const OpenAI = require('openai'); // For OpenRouter
require('dotenv').config({ path: '.env.production', override: false });

const prisma = new PrismaClient();
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../storage');

// OpenRouter Configuration
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Scraper CatalogSmart',
  },
});
const VISION_MODEL = 'google/gemini-2.5-flash-image';

// Weekly Reset Helper Imports (Placeholder - we will implement logic match here as script is JS)
// Note: We can't import TS files easily here. We will execute reset logic via raw SQL or simpler JS logic if needed.
// For now, let's implement the core logic directly here or use a separate JS script for reset.
// We will call the API endpoint for reset if possible, or reimplement lightweight logic.
// Actually, calling the API route would be cleaner if the app is running.
// But this script might run standalone. Let's stick to direct DB manipulation for safety.

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
 * Keywords that indicate non-food catalogs to skip
 */
const SKIP_KEYWORDS = [
  'non-food', 'nonfood', 'non food',
  'unelte', 'bricolaj', 'tools',
  'grădină', 'gradina', 'garden',
  'haine', 'îmbrăcăminte', 'fashion', 'textile',
  'electrocasnice', 'electronice', 'electronics',
  'auto', 'automotive',
  'jucării', 'jucarii', 'toys',
  'mobilă', 'mobila', 'furniture',
  'papetărie', 'papetarie', 'office',
];

/**
 * Check if catalog should be skipped based on keywords and date
 * @param {string} title - Catalog title
 * @param {Date} validFrom - Start date
 * @param {Date} validUntil - End date
 * @returns {{ skip: boolean, reason: string }} 
 */
function shouldSkipCatalog(title, validFrom, validUntil) {
  // Normalize title for comparison
  const normalizedTitle = (title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Check for skip keywords
  for (const keyword of SKIP_KEYWORDS) {
    const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalizedTitle.includes(normalizedKeyword)) {
      return { skip: true, reason: `Keyword match: "${keyword}"` };
    }
  }

  // Check date validity
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (validUntil && validUntil < today) {
    return { skip: true, reason: `Expired: valid until ${validUntil.toISOString().split('T')[0]}` };
  }

  // Optional: Skip if catalog hasn't started yet (more than 7 days in future)
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  if (validFrom && validFrom > sevenDaysFromNow) {
    return { skip: true, reason: `Future catalog: starts ${validFrom.toISOString().split('T')[0]}` };
  }

  return { skip: false, reason: null };
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
    // First check if catalog should be skipped
    const skipCheck = shouldSkipCatalog(catalog.title, catalog.validFrom, catalog.validUntil);
    if (skipCheck.skip) {
      log.info(`SKIP: ${catalog.storeName} - "${catalog.title}" (${skipCheck.reason})`);
      return { skipped: true, reason: skipCheck.reason };
    }

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
 * Update scraper status file for progress tracking
 */
async function updateStatus(data) {
  const statusPath = path.join(STORAGE_PATH, 'scraper-status.json');
  try {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
    await fs.writeFile(statusPath, JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (e) {
    log.error(`Failed to update status: ${e.message}`);
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
  const totalStores = TARGET_STORES.length;
  let catalogsFound = 0;
  let catalogsSaved = 0;

  // Write initial status
  await updateStatus({
    running: true,
    current: 0,
    total: totalStores,
    currentStore: null,
    message: 'Pornire scraper...',
    startedAt: new Date().toISOString()
  });

  try {
    // 1. Monday Reset Check
    const today = new Date();
    if (today.getDay() === 1) { // 1 = Monday
      await updateStatus({ message: 'Luni: Executare reset săptămânal...' });
      const resetStats = await performMondayReset();
      log.info(`Monday Reset: Archived ${resetStats.archivedCount}, Deleted ${resetStats.deletedCount}`);
    }

    // Scrape each target store
    for (let i = 0; i < TARGET_STORES.length; i++) {
      const store = TARGET_STORES[i];

      // Update progress
      await updateStatus({
        running: true,
        current: i,
        total: totalStores,
        currentStore: store.name,
        message: `Procesăm: ${store.name}...`,
        catalogsFound,
        catalogsSaved
      });

      try {
        await delay(2000); // Rate limiting

        const catalogs = await scrapeStoreCatalogs(store.slug, store.name);
        catalogsFound += catalogs.length;

        // Save each catalog (with filtering)
        let skippedCount = 0;
        for (const catalog of catalogs) {
          const result = await saveCatalog(catalog);

          if (result?.skipped) {
            skippedCount++;
          } else if (result) {
            catalogsSaved++;

            // --- INTELLIGENT PROCESSING START ---
            // If we saved a new catalog, let's see if we can improve it with Vision
            // We need actual page images. Since we use Axios/Cheerio (no JS), fetching dynamic pages is hard.
            // Kimbino usually provides an 'og:image' or similar for the cover.
            // For now, we will try to process the COVER image if products are missing.

            const products = await scrapeCatalogProducts(catalog.url);
            let finalProducts = products;

            if (products.length === 0) {
              // Kimbino didn't return HTML products. Try finding an image to process.
              // For static scraping, we might grab the og:image as a fallback or if possible find page images.
              try {
                const catHtml = await fetchPage(catalog.url);
                if (catHtml) {
                  const $c = cheerio.load(catHtml);
                  // Try to find cover image or meta image
                  let imageUrl = $c('meta[property="og:image"]').attr('content');

                  if (!imageUrl) {
                    // Fallback: look for generic image tags that look like pages
                    imageUrl = $c('img[src*="cloud/public/templates/catalog"]').first().attr('src');
                  }

                  if (imageUrl) {
                    log.info(`Using Vision for ${catalog.title} (Cover: ${imageUrl})`);
                    const extracted = await processCatalogImage(imageUrl, store.name);
                    if (extracted.length > 0) {
                      log.success(`Vision extracted ${extracted.length} products from cover`);
                      finalProducts = extracted;
                    }
                  }
                }
              } catch (visionErr) {
                log.error(`Vision check failed for ${catalog.title}: ${visionErr.message}`);
              }
            }

            // Save products to DB
            if (finalProducts.length > 0) {
              for (const p of finalProducts) {
                await prisma.product.create({
                  data: {
                    catalogId: result.id,
                    store: store.name,
                    name: p.name,
                    price: p.price,
                    originalPrice: p.originalPrice || null,
                    quantity: p.quantity || '',
                    unit: p.quantity ? p.quantity.replace(/\d+/g, '').trim() : 'buc',
                    category: p.category || 'Altele',
                    brand: p.brand || null,
                    validFrom: catalog.validFrom,
                    validUntil: catalog.validUntil,
                    discountPercentage: p.discount || (p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0)
                  }
                });
              }
              log.info(`Saved ${finalProducts.length} products to DB for ${catalog.title}`);
            }
            // --- INTELLIGENT PROCESSING END ---
          }
        }

        if (skippedCount > 0) {
          log.info(`  → ${skippedCount} catalogs skipped (non-food/expired)`);
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


    // Write final status
    await updateStatus({
      running: false,
      complete: true,
      current: totalStores,
      total: totalStores,
      currentStore: null,
      message: `Finalizat! ${catalogsSaved} cataloage noi găsite.`,
      catalogsFound,
      catalogsSaved,
      duration: `${duration}s`
    });

    return { catalogsFound, catalogsSaved };

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);

    // Write error status
    await updateStatus({
      running: false,
      complete: false,
      error: error.message,
      message: `Eroare: ${error.message}`
    });

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

/**
 * Process a catalog image to extract products
 * @param {string} imageUrl - Public URL of the catalog image
 * @param {string} store - Store name for context
 */
async function processCatalogImage(imageUrl, store) {
  try {
    log.info(`[VISION] Analyzing image for ${store}: ${imageUrl}`);

    const prompt = `
    Analyze this supermarket catalog page from ${store}.
    Extract all FOOD products visible with their prices.
    Ignore non-food items (clothes, electronics, household items).
    
    For each product extract:
    - Name (in Romanian)
    - Current Price (in RON)
    - Original Price (if visible, cross-out price)
    - Quantity/Unit (e.g. 1kg, 100g, buc, L)
    - Discount percentage (if shown)
    - Category (e.g. Carne, Lactate, Legume, Fructe, Bacanie, Bauturi)
    - Brand (if visible)

    Return ONLY a JSON object with a "products" array.
    `;

    const response = await openrouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ],
        },
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      log.error('No content received from Vision API');
      return [];
    }

    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        log.error('Failed to parse JSON response');
        return [];
      }
    }

    if (parsedData && Array.isArray(parsedData.products)) {
      log.info(`[VISION] Extracted ${parsedData.products.length} products`);
      return parsedData.products;
    }

    return [];

  } catch (error) {
    log.error(`[VISION] Processing failed: ${error.message}`);
    return [];
  }
}

/**
 * Perform Monday Reset Tasks
 * - Archive old recipes
 * - Clear expired products
 */
async function performMondayReset() {
  log.info('[MONDAY RESET] Starting weekly maintenance...');
  let archivedCount = 0;
  let deletedCount = 0;

  try {
    // 1. Archive Recipes (> 7 days old)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const recipesToArchive = await prisma.recipe.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        isPublished: true
      }
    });

    for (const recipe of recipesToArchive) {
      try {
        let ingredientNames = [];
        try {
          const ingredientIds = typeof recipe.ingredientIds === 'string'
            ? JSON.parse(recipe.ingredientIds)
            : recipe.ingredientIds;

          if (Array.isArray(ingredientIds) && ingredientIds.length > 0) {
            const products = await prisma.product.findMany({
              where: { id: { in: ingredientIds } },
              select: { name: true }
            });
            ingredientNames = products.map(p => p.name.toLowerCase().trim());
          }
        } catch (e) {
          // ignore parsing error
        }

        const existing = await prisma.recipeArchive.findFirst({
          where: { originalRecipeId: recipe.id }
        });

        if (!existing) {
          await prisma.recipeArchive.create({
            data: {
              originalRecipeId: recipe.id,
              title: recipe.title,
              slug: recipe.slug,
              description: recipe.description,
              imageUrl: recipe.imageUrl,
              instructions: recipe.instructions,
              tips: recipe.tips,
              servings: recipe.servings,
              difficulty: recipe.difficulty,
              ingredientNames: JSON.stringify(ingredientNames)
            }
          });
          archivedCount++;
        }
      } catch (err) {
        log.error(`Failed to archive recipe ${recipe.id}: ${err.message}`);
      }
    }
    log.info(`[MONDAY RESET] Archived ${archivedCount} recipes`);

    // 2. Clear Expired Products (> 7 days past expiry)
    const expiryCutoff = new Date();
    expiryCutoff.setDate(expiryCutoff.getDate() - 7);

    const deleteResult = await prisma.product.deleteMany({
      where: { validUntil: { lt: expiryCutoff } }
    });
    deletedCount = deleteResult.count;
    log.info(`[MONDAY RESET] Deleted ${deletedCount} expired products`);

  } catch (error) {
    log.error(`[MONDAY RESET] Failed: ${error.message}`);
  }

  return { archivedCount, deletedCount };
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
