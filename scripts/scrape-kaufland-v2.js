#!/usr/bin/env node

/**
 * Kaufland Catalog Scraper V2
 * Uses catalomat.ro catalog viewer with AI Vision
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const fs = require('fs');
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
  info: (msg) => console.log(`[KAUFLAND] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
};

/**
 * Extract products from image using Gemini Vision
 */
async function extractProductsFromImage(imageBase64, pageNum) {
  log.ai(`Analyzing page ${pageNum}...`);

  const systemPrompt = `Ești un expert în extragerea de date din cataloage de supermarket românești Kaufland.

TASK: Analizează imaginea și extrage TOATE produsele ALIMENTARE vizibile.

OUTPUT FORMAT (JSON STRICT):
{
  "products": [
    {
      "name": "string (nume complet cu greutate/volum, ex: 'Piept de pui 1kg', 'Lapte Zuzu 1L')",
      "brand": "string sau null",
      "price": number (prețul ACTUAL în lei, fără RON/lei),
      "unit": "string (kg, g, L, ml, buc)",
      "original_price": number sau null (prețul vechi/barat dacă există),
      "discount_percentage": number sau null (ex: 25 pentru -25%)",
      "category": "string (Carne, Mezeluri, Lactate, Legume, Fructe, Pâine, Paste, Conserve, Condimente, Băuturi, Dulciuri, Snacks, Congelate)"
    }
  ]
}

REGULI IMPORTANTE:
1. DOAR produse alimentare (NU: electrocasnice, haine, cosmetice, produse de curățenie)
2. Prețurile mari colorate = preț actual cu reducere
3. Prețuri barate/mici = preț vechi (original_price)
4. Include greutatea în nume când e vizibilă (ex: "Piept pui 1kg", "Lapte 1L")
5. Returnează DOAR JSON valid, fără explicații
6. Dacă nu găsești produse alimentare: {"products": []}
7. Extrage TOATE produsele vizibile, nu doar primele`;

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
              text: 'Extrage TOATE produsele ALIMENTARE din această pagină de catalog Kaufland. Returnează JSON.',
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonContent);
    const products = parsed.products || [];

    log.success(`Page ${pageNum}: ${products.length} products found`);
    return products;

  } catch (error) {
    log.error(`AI error page ${pageNum}: ${error.message}`);
    return [];
  }
}

/**
 * Scrape a specific catalog page
 */
async function scrapeCatalogPage(browser, catalogUrl) {
  log.info(`Opening catalog: ${catalogUrl}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1400, height: 1000 });

  const allProducts = [];
  const seenProductNames = new Set();

  try {
    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2000));

    // Check if there's a catalog viewer iframe
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });

    if (iframeSrc) {
      log.info(`Found iframe viewer: ${iframeSrc}`);
      // Navigate to iframe source directly
      await page.goto(iframeSrc, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Now process pages
    const maxPages = 30;
    let previousScreenshot = null;
    let samePageCount = 0;

    for (let i = 0; i < maxPages; i++) {
      try {
        await new Promise(r => setTimeout(r, 1500));

        // Take screenshot
        const screenshot = await page.screenshot({
          encoding: 'base64',
          type: 'jpeg',
          quality: 85,
        });

        // Check if same as previous (end of catalog)
        if (previousScreenshot === screenshot) {
          samePageCount++;
          if (samePageCount >= 2) {
            log.info(`Reached end of catalog at page ${i + 1}`);
            break;
          }
        } else {
          samePageCount = 0;
        }
        previousScreenshot = screenshot;

        log.success(`Captured page ${i + 1}`);

        // Extract products with AI
        const products = await extractProductsFromImage(screenshot, i + 1);

        // Add unique products
        for (const product of products) {
          if (!product.name || !product.price) continue;

          const normalizedName = product.name.toLowerCase().trim();
          if (!seenProductNames.has(normalizedName)) {
            seenProductNames.add(normalizedName);
            allProducts.push(product);
            log.product(`${product.name} - ${product.price} lei`);
          }
        }

        // Try multiple navigation methods
        let navigated = false;

        // Method 1: Click on right side of page (common in flipbook viewers)
        try {
          const viewportWidth = 1400;
          await page.mouse.click(viewportWidth - 100, 500);
          await new Promise(r => setTimeout(r, 500));
          navigated = true;
        } catch (e) {}

        // Method 2: Click next button
        if (!navigated) {
          const nextClicked = await page.evaluate(() => {
            const selectors = [
              '.next', '.arrow-right', '[class*="next"]', '[class*="right"]',
              'button[aria-label*="next"]', '.flipbook-nav-right',
              '[class*="forward"]', '[class*="arrow"]'
            ];
            for (const selector of selectors) {
              const btn = document.querySelector(selector);
              if (btn && btn.offsetParent !== null) {
                btn.click();
                return true;
              }
            }
            return false;
          });
          navigated = nextClicked;
        }

        // Method 3: Keyboard navigation
        await page.keyboard.press('ArrowRight');
        await new Promise(r => setTimeout(r, 500));

        // Rate limiting for AI
        await new Promise(r => setTimeout(r, 1500));

      } catch (error) {
        log.error(`Error on page ${i + 1}: ${error.message}`);
      }
    }

  } catch (error) {
    log.error(`Catalog error: ${error.message}`);
  } finally {
    await page.close();
  }

  return allProducts;
}

/**
 * Main scraping function
 */
async function scrapeKauflandCatalogs() {
  log.info('Starting Kaufland catalog scraper V2...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1000'],
  });

  const allProducts = [];
  const seenProductNames = new Set();

  try {
    // First, get list of catalogs
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    log.info('Getting catalog list...');
    await page.goto('https://www.catalomat.ro/kaufland/', { waitUntil: 'networkidle2', timeout: 60000 });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    // Get catalog URLs - focus on food catalogs
    const catalogUrls = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        if (a.href &&
            a.href.includes('/kaufland/catalog-') &&
            !a.href.includes('nonfood') &&
            !a.href.includes('tematic')) {
          links.push(a.href);
        }
      });
      // Unique
      return [...new Set(links)].slice(0, 3); // Process up to 3 catalogs
    });

    await page.close();

    log.info(`Found ${catalogUrls.length} food catalogs to process:\n`);
    catalogUrls.forEach(url => log.info(`  - ${url}`));
    console.log();

    // Process each catalog
    for (const catalogUrl of catalogUrls) {
      log.info(`\n${'='.repeat(60)}`);
      const products = await scrapeCatalogPage(browser, catalogUrl);

      // Add unique products
      for (const product of products) {
        const normalizedName = product.name.toLowerCase().trim();
        if (!seenProductNames.has(normalizedName)) {
          seenProductNames.add(normalizedName);
          allProducts.push(product);
        }
      }

      log.info(`Catalog total: ${products.length} products, Overall unique: ${allProducts.length}`);
    }

  } catch (error) {
    log.error(`Scraping error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return allProducts;
}

/**
 * Save products to database
 */
async function saveProducts(products) {
  log.info(`\nSaving ${products.length} unique products to database...`);

  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7);

  let saved = 0;

  for (const product of products) {
    try {
      if (!product.name || !product.price || product.price <= 0 || product.price > 500) {
        continue;
      }

      // Skip non-food
      if (/telefon|tv|laptop|frigider|aragaz|aspirator|samsung|iphone|tablet|smartphone/i.test(product.name)) {
        continue;
      }

      // Normalize category
      let category = product.category || 'Altele';
      if (/carne|pui|porc|vită|miel/i.test(product.name) || /carne/i.test(category)) category = 'Proteine';
      if (/mezeluri|salam|șuncă|bacon|cârnați/i.test(product.name) || /mezeluri/i.test(category)) category = 'Proteine';
      if (/pește|somon|ton|macrou|sardine/i.test(product.name)) category = 'Proteine';
      if (/lactate|lapte|iaurt|brânză|cașcaval|smântână|unt/i.test(product.name) || /lactate/i.test(category)) category = 'Lactate';
      if (/legume|cartofi|ceapă|morcov|roșii|ardei|varză/i.test(product.name) || /legume/i.test(category)) category = 'Legume';
      if (/fructe|mere|banane|portocale|struguri/i.test(product.name) || /fructe/i.test(category)) category = 'Fructe';
      if (/pâine|franzelă|covrigi/i.test(product.name) || /pâine|panificație/i.test(category)) category = 'Panificație';
      if (/paste|orez|făină|spaghetti/i.test(product.name) || /paste|carbohidrați/i.test(category)) category = 'Carbohidrați';
      if (/băutur|suc|apă|bere|vin/i.test(product.name) || /băuturi/i.test(category)) category = 'Băuturi';
      if (/dulci|ciocolat|biscuiți/i.test(product.name) || /dulciuri/i.test(category)) category = 'Dulciuri';
      if (/conserv/i.test(product.name) || /conserve/i.test(category)) category = 'Conserve';
      if (/condiment|sare|piper|boia/i.test(product.name) || /condimente/i.test(category)) category = 'Condimente';

      await prisma.product.create({
        data: {
          name: product.name.substring(0, 200),
          brand: product.brand || null,
          category: category,
          subcategory: null,
          price: parseFloat(product.price),
          originalPrice: product.original_price ? parseFloat(product.original_price) : null,
          discountPercentage: product.discount_percentage ? parseInt(product.discount_percentage) : null,
          unit: product.unit || 'buc',
          store: 'Kaufland',
          validFrom,
          validUntil,
          extractionConfidence: 0.85,
        },
      });

      saved++;

    } catch (e) {
      // Likely duplicate, skip
    }
  }

  return saved;
}

/**
 * Main
 */
async function main() {
  try {
    // Reset database first
    log.info('Resetting database...');
    await prisma.product.deleteMany({});
    log.success('Database cleared\n');

    // Scrape catalogs
    const products = await scrapeKauflandCatalogs();

    log.info(`\nExtracted ${products.length} unique products`);

    // Save to database
    if (products.length > 0) {
      const saved = await saveProducts(products);
      log.success(`\nSaved ${saved} products to database`);
    }

    // Show stats
    const total = await prisma.product.count();
    const byCategory = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    log.info('\n' + '='.repeat(50));
    log.success('Scraping complete!');
    log.info('='.repeat(50));
    log.info(`Total products in DB: ${total}`);
    log.info('\nBy category:');
    byCategory.forEach(c => log.info(`  ${c.category}: ${c._count.id}`));

  } catch (error) {
    log.error(`Fatal: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
