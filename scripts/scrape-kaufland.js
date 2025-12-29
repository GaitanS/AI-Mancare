#!/usr/bin/env node

/**
 * Kaufland Romania Scraper
 * Extracts real product offers from Kaufland website
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const log = {
  info: (msg) => console.log(`[KAUFLAND] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
};

async function scrapeKaufland() {
  log.info('Starting Kaufland scraper...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    log.info('Navigating to Kaufland offers page...');

    await page.goto('https://www.kaufland.ro/oferte/oferte-saptamanale.html', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for content to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Accept cookies if present
    try {
      const cookieButton = await page.$('[data-testid="cookie-accept-all"], .cookie-accept, #onetrust-accept-btn-handler');
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // No cookie banner
    }

    log.info('Extracting products...');

    // Extract products from the page
    const products = await page.evaluate(() => {
      const items = [];

      // Try multiple selectors for product containers
      const productSelectors = [
        '.m-offer-tile',
        '.o-overview-list__item',
        '[class*="offer"]',
        '.product-tile',
        'article',
      ];

      let productElements = [];
      for (const selector of productSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          productElements = elements;
          break;
        }
      }

      // If no structured products, try to extract from text content
      const pageText = document.body.innerText;

      // Look for price patterns like "12,99" or "12.99"
      const pricePattern = /(\d{1,3}[,\.]\d{2})\s*(?:lei|RON)?/g;

      // Extract from structured elements if found
      productElements.forEach((el) => {
        try {
          // Get product name
          const nameEl = el.querySelector('h2, h3, h4, .product-name, .offer-name, [class*="title"]');
          const name = nameEl?.textContent?.trim();

          // Get prices
          const priceEl = el.querySelector('.price, [class*="price"], .offer-price');
          const oldPriceEl = el.querySelector('.old-price, .original-price, [class*="crossed"]');

          const priceText = priceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');
          const oldPriceText = oldPriceEl?.textContent?.replace(/[^\d,\.]/g, '').replace(',', '.');

          // Get discount
          const discountEl = el.querySelector('[class*="discount"], [class*="badge"], .percentage');
          const discountText = discountEl?.textContent?.match(/(\d+)%/)?.[1];

          // Get unit
          const unitEl = el.querySelector('[class*="unit"], .quantity, .weight');
          const unit = unitEl?.textContent?.trim() || 'buc';

          if (name && priceText) {
            items.push({
              name,
              price: parseFloat(priceText),
              originalPrice: oldPriceText ? parseFloat(oldPriceText) : null,
              discountPercentage: discountText ? parseInt(discountText) : null,
              unit,
              store: 'Kaufland',
            });
          }
        } catch (e) {
          // Skip invalid elements
        }
      });

      return items;
    });

    log.info(`Found ${products.length} products from DOM`);

    // If no products found from DOM, try API approach
    if (products.length === 0) {
      log.info('Trying alternative extraction method...');

      // Get all text and parse it
      const pageContent = await page.content();

      // Look for JSON data in script tags
      const jsonData = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
        const data = [];
        scripts.forEach(s => {
          try {
            const parsed = JSON.parse(s.textContent);
            data.push(parsed);
          } catch (e) {}
        });
        return data;
      });

      log.info(`Found ${jsonData.length} JSON data blocks`);
    }

    return products;

  } catch (error) {
    log.error(`Scraping failed: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function scrapeWithAPI() {
  log.info('Trying Kaufland API approach...');

  const axios = require('axios');

  try {
    // Try to find the API endpoint
    const response = await axios.get('https://www.kaufland.ro/api/offers', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data) {
      log.success('API response received');
      return response.data;
    }
  } catch (e) {
    log.info('API not available, will use web scraping');
  }

  return null;
}

async function saveProducts(products) {
  log.info(`Saving ${products.length} products to database...`);

  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7);

  let saved = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      // Check if exists
      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          store: product.store,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.product.create({
        data: {
          name: product.name,
          brand: product.brand || null,
          category: categorizeProduct(product.name),
          subcategory: null,
          price: product.price,
          originalPrice: product.originalPrice,
          discountPercentage: product.discountPercentage,
          unit: product.unit || 'buc',
          store: product.store,
          validFrom,
          validUntil,
          extractionConfidence: 0.85,
        },
      });

      saved++;
      log.product(`${product.name} - ${product.price} lei`);
    } catch (e) {
      log.error(`Failed to save ${product.name}: ${e.message}`);
    }
  }

  log.success(`Saved: ${saved}, Skipped: ${skipped}`);
  return saved;
}

function categorizeProduct(name) {
  const nameLower = name.toLowerCase();

  if (/pui|porc|vită|miel|carne|cârnați|salam|șuncă|bacon|pulpă|piept|cotlet|antricot/.test(nameLower)) {
    return 'Proteine';
  }
  if (/pește|somon|cod|ton|sardine|macrou|creveți/.test(nameLower)) {
    return 'Proteine';
  }
  if (/lapte|iaurt|brânză|cașcaval|smântână|unt|telemea|mozzarella/.test(nameLower)) {
    return 'Lactate';
  }
  if (/cartofi|ceapă|morcov|roșii|ardei|varză|salată|spanac|legume/.test(nameLower)) {
    return 'Legume';
  }
  if (/mere|banane|portocale|struguri|fructe|căpșuni|cireșe|pepene/.test(nameLower)) {
    return 'Fructe';
  }
  if (/pâine|franzelă|covrigi|chifle/.test(nameLower)) {
    return 'Panificație';
  }
  if (/orez|paste|făină|mălai|griș/.test(nameLower)) {
    return 'Carbohidrați';
  }
  if (/ulei|oțet|sare|piper|boia|condimente|sos/.test(nameLower)) {
    return 'Condimente';
  }
  if (/bere|vin|suc|apă|cola|fanta/.test(nameLower)) {
    return 'Băuturi';
  }

  return 'Altele';
}

async function main() {
  try {
    // First try API
    let products = await scrapeWithAPI();

    // If API fails, use Puppeteer
    if (!products || products.length === 0) {
      products = await scrapeKaufland();
    }

    if (products && products.length > 0) {
      await saveProducts(products);
    } else {
      log.error('No products extracted');
    }

    // Show final stats
    const total = await prisma.product.count();
    log.success(`Total products in database: ${total}`);

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
