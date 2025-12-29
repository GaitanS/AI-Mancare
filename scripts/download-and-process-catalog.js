#!/usr/bin/env node

/**
 * Download and Process Catalog with AI
 * Downloads catalog images and extracts products using Gemini Vision
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// OpenRouter client
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Retete Ieftine - AI Mancare',
  },
});

const VISION_MODEL = process.env.AI_MODEL_VISION || 'google/gemini-2.5-flash';

const log = {
  info: (msg) => console.log(`[CATALOG] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
};

/**
 * Extract products from image using Gemini Vision
 */
async function extractProductsFromImage(imageBase64, storeName) {
  log.ai(`Analyzing image with Gemini Vision...`);

  const systemPrompt = `Ești un expert în extragerea de date din cataloage de supermarket românești.

TASK: Analizează imaginea catalogului și extrage informații despre toate produsele ALIMENTARE.

OUTPUT FORMAT (JSON STRICT):
{
  "products": [
    {
      "name": "string (nume complet produs)",
      "brand": "string sau null",
      "price": number (preț în lei, ex: 10.99),
      "unit": "string (kg, L, buc, 100g, pachet)",
      "original_price": number sau null (preț vechi dacă există),
      "discount_percentage": number sau null (ex: 25 pentru 25%),
      "category": "string (Proteine, Carbohidrați, Lactate, Legume, Fructe, Băuturi, Condimente, Dulciuri, Conserve, Panificație)",
      "extraction_confidence": number (0.0-1.0)
    }
  ]
}

REGULI:
- Extrage DOAR produse alimentare (ignoră electronice, haine, etc)
- Prețurile sunt în LEI
- Dacă vezi preț vechi și nou, calculează reducerea
- Returnează DOAR JSON valid
- Dacă nu găsești produse alimentare, returnează {"products": []}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: `Extrage toate produsele ALIMENTARE din această pagină de catalog ${storeName}. Returnează DOAR JSON.`,
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return [];
    }

    // Clean JSON
    const jsonContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonContent);
    return parsed.products || [];

  } catch (error) {
    log.error(`AI extraction failed: ${error.message}`);
    return [];
  }
}

/**
 * Scrape catalog images from Kimbino/Cago
 */
async function scrapeCatalogImages(browser, store = 'lidl') {
  log.info(`Scraping catalog images for ${store}...`);
  const images = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Try cago.ro for catalog images
    const urls = {
      lidl: 'https://www.cago.ro/catalog-lidl',
      kaufland: 'https://www.cago.ro/catalog-kaufland',
      penny: 'https://www.cago.ro/catalog-penny',
      carrefour: 'https://www.cago.ro/catalog-carrefour',
    };

    await page.goto(urls[store] || urls.lidl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Accept cookies
    try {
      await page.click('[class*="cookie"] button, #accept-cookies, .cookie-accept');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    // Wait for catalog to load
    await new Promise(r => setTimeout(r, 3000));

    // Click to open the latest catalog
    try {
      const catalogLink = await page.$('.catalog-card a, .catalog-item a, a[href*="catalog"]');
      if (catalogLink) {
        await catalogLink.click();
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (e) {}

    // Extract catalog page images
    const imageUrls = await page.evaluate(() => {
      const imgs = [];

      // Look for catalog page images
      const selectors = [
        'img[src*="catalog"]',
        'img[src*="page"]',
        '.catalog-page img',
        '.flipbook img',
        'img[class*="page"]',
        '.page-image img',
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(img => {
          if (img.src && img.src.startsWith('http') && !imgs.includes(img.src)) {
            imgs.push(img.src);
          }
        });
      }

      // Also get from data attributes
      document.querySelectorAll('[data-src], [data-image]').forEach(el => {
        const src = el.dataset.src || el.dataset.image;
        if (src && src.startsWith('http') && !imgs.includes(src)) {
          imgs.push(src);
        }
      });

      return imgs.slice(0, 10); // Limit to first 10 pages
    });

    log.info(`Found ${imageUrls.length} catalog page URLs`);

    // Download images as base64
    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
      try {
        log.info(`Downloading page ${i + 1}...`);

        // Navigate to image and screenshot, or fetch directly
        const imgPage = await browser.newPage();
        const response = await imgPage.goto(imageUrls[i], { timeout: 30000 });

        if (response) {
          const buffer = await response.buffer();
          const base64 = buffer.toString('base64');
          images.push({
            url: imageUrls[i],
            base64,
            pageNumber: i + 1,
          });
        }

        await imgPage.close();
      } catch (e) {
        log.error(`Failed to download page ${i + 1}: ${e.message}`);
      }
    }

    await page.close();

  } catch (error) {
    log.error(`Catalog scraping failed: ${error.message}`);
  }

  return images;
}

/**
 * Take screenshots of catalog pages
 */
async function screenshotCatalogPages(browser, store = 'lidl') {
  log.info(`Taking screenshots of ${store} catalog...`);
  const screenshots = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1200, height: 1600 });

    // Go to catalog viewer
    const urls = {
      lidl: 'https://www.kimbino.ro/lidl/',
      kaufland: 'https://www.kimbino.ro/kaufland/',
      penny: 'https://www.kimbino.ro/penny/',
    };

    await page.goto(urls[store] || urls.lidl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Accept cookies
    try {
      const cookieBtn = await page.$('#onetrust-accept-btn-handler, [class*="cookie"] button');
      if (cookieBtn) {
        await cookieBtn.click();
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {}

    // Click on the first catalog
    try {
      await page.waitForSelector('a[href*="catalog"], .catalog-link, .leaflet-link', { timeout: 5000 });
      const catalogLink = await page.$('a[href*="catalog"], .catalog-link, .leaflet-link');
      if (catalogLink) {
        await catalogLink.click();
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (e) {
      log.info('No catalog link found, trying direct page');
    }

    // Take screenshots of visible pages
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise(r => setTimeout(r, 2000));

        // Take screenshot
        const screenshot = await page.screenshot({
          encoding: 'base64',
          type: 'jpeg',
          quality: 85,
        });

        screenshots.push({
          base64: screenshot,
          pageNumber: i + 1,
        });

        log.success(`Screenshot page ${i + 1} captured`);

        // Try to go to next page
        const nextBtn = await page.$('[class*="next"], .arrow-right, button[aria-label*="next"], .flipbook-nav-right');
        if (nextBtn) {
          await nextBtn.click();
        } else {
          // Try keyboard navigation
          await page.keyboard.press('ArrowRight');
        }

      } catch (e) {
        log.error(`Screenshot ${i + 1} failed: ${e.message}`);
        break;
      }
    }

    await page.close();

  } catch (error) {
    log.error(`Screenshot capture failed: ${error.message}`);
  }

  return screenshots;
}

/**
 * Save extracted products to database
 */
async function saveProducts(products, store) {
  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7);

  let saved = 0;

  for (const product of products) {
    try {
      if (!product.name || !product.price || product.price <= 0) continue;

      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          store: store,
        },
      });

      if (existing) continue;

      await prisma.product.create({
        data: {
          name: product.name,
          brand: product.brand || null,
          category: product.category || 'Altele',
          subcategory: null,
          price: product.price,
          originalPrice: product.original_price || null,
          discountPercentage: product.discount_percentage || null,
          unit: product.unit || 'buc',
          store: store,
          validFrom,
          validUntil,
          extractionConfidence: product.extraction_confidence || 0.8,
        },
      });

      saved++;
      log.product(`${product.name} - ${product.price} lei${product.discount_percentage ? ` (-${product.discount_percentage}%)` : ''}`);

    } catch (e) {
      log.error(`Save failed: ${e.message}`);
    }
  }

  return saved;
}

/**
 * Main function
 */
async function main() {
  log.info('Starting Catalog AI Processor...\n');

  const stores = ['lidl', 'kaufland', 'penny'];
  let totalProducts = 0;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    for (const store of stores) {
      log.info(`\n${'='.repeat(50)}`);
      log.info(`Processing ${store.toUpperCase()} catalog...`);
      log.info(`${'='.repeat(50)}\n`);

      // Take screenshots of catalog pages
      const screenshots = await screenshotCatalogPages(browser, store);

      if (screenshots.length === 0) {
        log.error(`No screenshots captured for ${store}`);
        continue;
      }

      log.success(`Captured ${screenshots.length} pages`);

      // Process each page with AI
      let storeProducts = [];

      for (const screenshot of screenshots) {
        log.info(`\nProcessing page ${screenshot.pageNumber}...`);

        const products = await extractProductsFromImage(screenshot.base64, store);

        if (products.length > 0) {
          log.success(`Extracted ${products.length} products from page ${screenshot.pageNumber}`);
          storeProducts.push(...products);
        } else {
          log.info(`No food products found on page ${screenshot.pageNumber}`);
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 2000));
      }

      // Save to database
      if (storeProducts.length > 0) {
        const saved = await saveProducts(storeProducts, store.charAt(0).toUpperCase() + store.slice(1));
        totalProducts += saved;
        log.success(`Saved ${saved} new products for ${store}`);
      }
    }

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  // Final stats
  const total = await prisma.product.count();
  log.info(`\n${'='.repeat(50)}`);
  log.success(`Processing complete!`);
  log.info(`New products extracted: ${totalProducts}`);
  log.info(`Total products in database: ${total}`);
}

main();
