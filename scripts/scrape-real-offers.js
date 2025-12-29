#!/usr/bin/env node

/**
 * Real Offers Scraper
 * Scrapes actual product offers from Romanian supermarket websites
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const log = {
  info: (msg) => console.log(`[SCRAPER] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
};

// Categorize products based on name
function categorizeProduct(name) {
  const nameLower = name.toLowerCase();

  if (/pui|porc|vită|miel|carne|cârnați|salam|șuncă|bacon|pulpă|piept|cotlet|antricot|mușchi|fleică|costiță|aripi|file/.test(nameLower)) {
    return 'Proteine';
  }
  if (/pește|somon|cod|ton|sardine|macrou|creveți|păstrăv|crap|scrumbie/.test(nameLower)) {
    return 'Proteine';
  }
  if (/lapte|iaurt|brânză|cașcaval|smântână|unt|telemea|mozzarella|parmezan|mascarpone|feta/.test(nameLower)) {
    return 'Lactate';
  }
  if (/ou|ouă/.test(nameLower)) {
    return 'Proteine';
  }
  if (/cartofi|ceapă|morcov|roșii|ardei|varză|salată|spanac|legume|castraveți|vinete|dovlecei|conopidă|broccoli|usturoi|pătrunjel|mărar/.test(nameLower)) {
    return 'Legume';
  }
  if (/mere|banane|portocale|struguri|fructe|căpșuni|cireșe|pepene|piersici|caise|prune|lămâi|kiwi|mango|avocado/.test(nameLower)) {
    return 'Fructe';
  }
  if (/pâine|franzelă|covrigi|chifle|baghetă|corn/.test(nameLower)) {
    return 'Panificație';
  }
  if (/orez|paste|făină|mălai|griș|spaghetti|penne|macaroane/.test(nameLower)) {
    return 'Carbohidrați';
  }
  if (/ulei|oțet|sare|piper|boia|condimente|sos|ketchup|muștar|maioneză/.test(nameLower)) {
    return 'Condimente';
  }
  if (/bere|vin|suc|apă|cola|fanta|sprite|pepsi|cafea|ceai/.test(nameLower)) {
    return 'Băuturi';
  }
  if (/ciocolată|biscuiți|napolitane|prăjitură|tort|înghețată|desert/.test(nameLower)) {
    return 'Dulciuri';
  }
  if (/conserv|ton|mazăre|porumb|fasole|roșii decojite|bulion|pastă/.test(nameLower)) {
    return 'Conserve';
  }

  return 'Altele';
}

/**
 * Scrape Lidl Romania offers
 */
async function scrapeLidl(browser) {
  log.info('Scraping Lidl Romania...');
  const products = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Go to Lidl offers page
    await page.goto('https://www.lidl.ro/c/super-weekend/a10048095', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for products to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Accept cookies if present
    try {
      await page.click('[data-testid="cookie-accept-all"], #onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    // Scroll to load more products
    await autoScroll(page);

    // Extract products
    const extractedProducts = await page.evaluate(() => {
      const items = [];

      // Try various selectors for Lidl
      const selectors = [
        '.product-grid-box',
        '.ods-tile',
        '[class*="ProductGridBox"]',
        '.ACampaignGrid__item',
        'article'
      ];

      let productElements = [];
      for (const selector of selectors) {
        productElements = document.querySelectorAll(selector);
        if (productElements.length > 5) break;
      }

      productElements.forEach((el) => {
        try {
          const nameEl = el.querySelector('h2, h3, .product-title, [class*="title"], [class*="name"]');
          const priceEl = el.querySelector('[class*="price"], .pricebox__price, .m-price__price');
          const oldPriceEl = el.querySelector('[class*="strikethrough"], [class*="crossed"], .m-price__rrp');

          const name = nameEl?.textContent?.trim();
          let price = priceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');
          let oldPrice = oldPriceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');

          if (name && price && parseFloat(price) > 0) {
            items.push({
              name: name.substring(0, 100),
              price: parseFloat(price),
              originalPrice: oldPrice ? parseFloat(oldPrice) : null,
              store: 'Lidl'
            });
          }
        } catch (e) {}
      });

      return items;
    });

    products.push(...extractedProducts);
    await page.close();

  } catch (error) {
    log.error(`Lidl scraping failed: ${error.message}`);
  }

  log.info(`Lidl: Found ${products.length} products`);
  return products;
}

/**
 * Scrape Kaufland Romania offers
 */
async function scrapeKaufland(browser) {
  log.info('Scraping Kaufland Romania...');
  const products = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto('https://www.kaufland.ro/oferte/oferta-curenta.html', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector('body', { timeout: 10000 });

    // Accept cookies
    try {
      await page.click('[class*="cookie"] button, #onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    await autoScroll(page);

    const extractedProducts = await page.evaluate(() => {
      const items = [];

      const productElements = document.querySelectorAll('.m-offer-tile, .o-overview-list__item, [class*="offer"]');

      productElements.forEach((el) => {
        try {
          const nameEl = el.querySelector('.m-offer-tile__title, h3, h4, [class*="title"]');
          const priceEl = el.querySelector('.m-offer-tile__price, [class*="price"]:not([class*="old"])');
          const oldPriceEl = el.querySelector('.m-offer-tile__basic-price, [class*="crossed"], [class*="old"]');
          const discountEl = el.querySelector('[class*="discount"], [class*="badge"]');

          const name = nameEl?.textContent?.trim();
          let price = priceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');
          let oldPrice = oldPriceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');
          let discount = discountEl?.textContent?.match(/(\d+)/)?.[1];

          if (name && price && parseFloat(price) > 0) {
            items.push({
              name: name.substring(0, 100),
              price: parseFloat(price),
              originalPrice: oldPrice ? parseFloat(oldPrice) : null,
              discountPercentage: discount ? parseInt(discount) : null,
              store: 'Kaufland'
            });
          }
        } catch (e) {}
      });

      return items;
    });

    products.push(...extractedProducts);
    await page.close();

  } catch (error) {
    log.error(`Kaufland scraping failed: ${error.message}`);
  }

  log.info(`Kaufland: Found ${products.length} products`);
  return products;
}

/**
 * Scrape Carrefour Romania offers
 */
async function scrapeCarrefour(browser) {
  log.info('Scraping Carrefour Romania...');
  const products = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto('https://www.carrefour.ro/promotii', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector('body', { timeout: 10000 });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler, [class*="cookie"] button');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    await autoScroll(page);

    const extractedProducts = await page.evaluate(() => {
      const items = [];

      const productElements = document.querySelectorAll('.product-card, [class*="product"], [class*="ProductCard"]');

      productElements.forEach((el) => {
        try {
          const nameEl = el.querySelector('[class*="name"], [class*="title"], h2, h3');
          const priceEl = el.querySelector('[class*="price"]:not([class*="old"]):not([class*="crossed"])');
          const oldPriceEl = el.querySelector('[class*="old"], [class*="crossed"], [class*="strikethrough"]');

          const name = nameEl?.textContent?.trim();
          let price = priceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');
          let oldPrice = oldPriceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');

          if (name && price && parseFloat(price) > 0 && parseFloat(price) < 1000) {
            items.push({
              name: name.substring(0, 100),
              price: parseFloat(price),
              originalPrice: oldPrice ? parseFloat(oldPrice) : null,
              store: 'Carrefour'
            });
          }
        } catch (e) {}
      });

      return items;
    });

    products.push(...extractedProducts);
    await page.close();

  } catch (error) {
    log.error(`Carrefour scraping failed: ${error.message}`);
  }

  log.info(`Carrefour: Found ${products.length} products`);
  return products;
}

/**
 * Auto scroll page to load lazy content
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // Wait for lazy loading
  await new Promise(r => setTimeout(r, 2000));
}

/**
 * Save products to database
 */
async function saveProducts(products) {
  log.info(`Saving ${products.length} products to database...`);

  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7);

  let saved = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      // Calculate discount if we have original price
      let discountPercentage = product.discountPercentage;
      if (!discountPercentage && product.originalPrice && product.originalPrice > product.price) {
        discountPercentage = Math.round((1 - product.price / product.originalPrice) * 100);
      }

      // Skip products without meaningful discount or invalid prices
      if (product.price <= 0 || product.price > 500) {
        skipped++;
        continue;
      }

      // Check if exists
      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          store: product.store,
        },
      });

      if (existing) {
        // Update price if changed
        if (existing.price !== product.price) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              price: product.price,
              originalPrice: product.originalPrice,
              discountPercentage,
              validFrom,
              validUntil,
              updatedAt: new Date(),
            },
          });
          updated++;
          log.product(`Updated: ${product.name} - ${product.price} lei`);
        } else {
          skipped++;
        }
        continue;
      }

      await prisma.product.create({
        data: {
          name: product.name,
          brand: null,
          category: categorizeProduct(product.name),
          subcategory: null,
          price: product.price,
          originalPrice: product.originalPrice,
          discountPercentage,
          unit: guessUnit(product.name),
          store: product.store,
          validFrom,
          validUntil,
          extractionConfidence: 0.75,
        },
      });

      saved++;
      log.product(`${product.store}: ${product.name} - ${product.price} lei${discountPercentage ? ` (-${discountPercentage}%)` : ''}`);
    } catch (e) {
      log.error(`Failed to save ${product.name}: ${e.message}`);
    }
  }

  log.success(`Saved: ${saved}, Updated: ${updated}, Skipped: ${skipped}`);
  return { saved, updated, skipped };
}

/**
 * Guess unit from product name
 */
function guessUnit(name) {
  const nameLower = name.toLowerCase();
  if (/\d+\s*kg|\d+kg|per kg|\/kg/.test(nameLower)) return 'kg';
  if (/\d+\s*g|\d+g/.test(nameLower)) return 'g';
  if (/\d+\s*l|\d+l|litru|litri/.test(nameLower)) return 'L';
  if (/\d+\s*ml|\d+ml/.test(nameLower)) return 'ml';
  if (/buc|bucată|bucati/.test(nameLower)) return 'buc';
  return 'buc';
}

/**
 * Main function
 */
async function main() {
  log.info('Starting Real Offers Scraper...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  try {
    let allProducts = [];

    // Scrape each store
    const lidlProducts = await scrapeLidl(browser);
    allProducts.push(...lidlProducts);

    const kauflandProducts = await scrapeKaufland(browser);
    allProducts.push(...kauflandProducts);

    const carrefourProducts = await scrapeCarrefour(browser);
    allProducts.push(...carrefourProducts);

    log.info(`\nTotal products scraped: ${allProducts.length}`);

    if (allProducts.length > 0) {
      await saveProducts(allProducts);
    } else {
      log.error('No products scraped. Sites may have changed structure or be blocking scrapers.');
      log.info('Using fallback: keeping existing seed data.');
    }

    // Show final stats
    const total = await prisma.product.count();
    const byStore = await prisma.product.groupBy({
      by: ['store'],
      _count: { id: true },
    });

    log.success(`\nDatabase stats:`);
    log.info(`Total products: ${total}`);
    byStore.forEach(s => log.info(`  ${s.store}: ${s._count.id}`));

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();
