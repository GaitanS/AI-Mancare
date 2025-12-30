#!/usr/bin/env node

/**
 * Kaufland Catalog Scraper - Page by Page Screenshots
 * Opens each page in the catalog viewer and takes clean screenshots
 * Handles cookies and popups properly
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// OpenRouter client with Gemini 3 Flash Preview
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Retete Ieftine - AI Mancare',
  },
});

const VISION_MODEL = process.env.AI_MODEL_VISION || 'google/gemini-3-flash-preview';
const IMAGES_DIR = path.join(process.cwd(), 'public', 'catalog-images');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const log = {
  info: (msg) => console.log(`[KAUFLAND] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
  page: (msg) => console.log(`   📄 ${msg}`),
};

/**
 * Extract products from image using Gemini 3 Flash Preview
 */
async function extractProductsFromImage(imageBase64, pageNum, catalogName) {
  log.ai(`Analyzing page ${pageNum} with Gemini 3 Flash Preview...`);

  const systemPrompt = `Ești un expert în extragerea de date din cataloage de supermarket românești Kaufland.

TASK: Analizează imaginea și extrage ABSOLUT TOATE produsele ALIMENTARE și BĂUTURILE vizibile.

IMPORTANT - INCLUDE OBLIGATORIU:
- Carne, pește, mezeluri, ouă
- Lactate (lapte, iaurt, brânză, smântână, unt)
- Legume și fructe
- Pâine și produse de patiserie
- Paste, orez, făină, mălai
- Conserve
- Condimente, sosuri, ulei, oțet
- Dulciuri, ciocolată, biscuiți, prăjituri
- Snacks-uri, chipsuri, covrigei, floricele
- BĂUTURI: apă, sucuri, bere, vin, șampanie, cafea, ceai, energizante
- Produse "LA VITRINĂ" - extrage cu gramajul de la vitrină (100g, 250g, etc)
- Produse congelate

EXCLUDE DOAR: electrocasnice, haine, cosmetice, produse de curățenie, detergenți

OUTPUT FORMAT (JSON STRICT):
{
  "products": [
    {
      "name": "string (nume complet cu greutate/volum)",
      "brand": "string sau null",
      "price": number (prețul ACTUAL în lei),
      "unit": "string (kg, g, L, ml, buc)",
      "original_price": number sau null,
      "discount_percentage": number sau null,
      "category": "string",
      "is_vitrina": boolean
    }
  ]
}

REGULI:
1. Prețurile mari colorate = preț actual
2. Prețuri barate = preț vechi (original_price)
3. Include greutatea în nume
4. Returnează DOAR JSON valid`;

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
              text: `Pagina ${pageNum} din ${catalogName}. Extrage TOATE produsele alimentare. JSON only.`,
            },
          ],
        },
      ],
      max_tokens: 8000,
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
 * Scrape catalog by navigating through each page
 */
async function scrapeCatalog(catalogUrl, catalogId, totalPages) {
  log.info(`\nStarting catalog scrape: ${catalogUrl}`);
  log.info(`Catalog ID: ${catalogId}, Total pages: ${totalPages}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1000'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1400, height: 1000 });

  const allProducts = [];
  const seenProductNames = new Set();
  const catalogName = `kaufland-${catalogId}`;

  try {
    // Navigate to catalog
    log.info('Opening catalog page...');
    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle cookie consent - try multiple selectors
    log.info('Handling cookie consent...');
    const cookieSelectors = [
      '#onetrust-accept-btn-handler',
      '.onetrust-close-btn-handler',
      '[data-testid="accept-cookies"]',
      'button[title="De acord și închide"]',
      'button:has-text("De acord")',
      '.fc-cta-consent',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll'
    ];

    for (const selector of cookieSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        log.success('Cookie consent accepted');
        await new Promise(r => setTimeout(r, 1000));
        break;
      } catch (e) {
        // Try next selector
      }
    }

    // Wait for page to stabilize
    await new Promise(r => setTimeout(r, 3000));

    // Close any notification popups
    try {
      const notificationBtn = await page.$('button[title="Mai târziu"]');
      if (notificationBtn) {
        await notificationBtn.click();
        log.info('Closed notification popup');
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {}

    // Find and click on the catalog to enter viewer
    log.info('Looking for catalog viewer...');

    // Try to find the catalog image/link
    const catalogClicked = await page.evaluate(() => {
      // Look for catalog image or link
      const selectors = [
        'a[href*="catalog"]',
        '.catalog-image',
        '.leaflet-image',
        'img[src*="leaflet"]',
        '.catalog-container img',
        '.catalog-preview'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (catalogClicked) {
      await new Promise(r => setTimeout(r, 3000));
    }

    // Check for iframe and switch to it
    const frames = page.frames();
    let catalogFrame = page;

    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('leaflet') || url.includes('catalog') || url.includes('ipaper')) {
        catalogFrame = frame;
        log.info('Found catalog viewer iframe');
        break;
      }
    }

    // Process each page
    let previousScreenshotHash = '';
    let sameCount = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      log.page(`Processing page ${pageNum}/${totalPages}...`);

      // Wait for page to load
      await new Promise(r => setTimeout(r, 1500));

      // Take screenshot
      const screenshot = await page.screenshot({
        encoding: 'base64',
        type: 'jpeg',
        quality: 90,
        fullPage: false
      });

      // Simple hash to detect same page
      const screenshotHash = screenshot.substring(0, 1000);
      if (screenshotHash === previousScreenshotHash) {
        sameCount++;
        if (sameCount >= 3) {
          log.info(`Reached end of catalog at page ${pageNum}`);
          break;
        }
      } else {
        sameCount = 0;
      }
      previousScreenshotHash = screenshotHash;

      // Save screenshot
      const filename = `${catalogName}-page-${String(pageNum).padStart(2, '0')}.jpg`;
      const filepath = path.join(IMAGES_DIR, filename);
      fs.writeFileSync(filepath, Buffer.from(screenshot, 'base64'));
      log.page(`Saved: ${filename}`);

      // Extract products with AI
      const products = await extractProductsFromImage(screenshot, pageNum, catalogName);

      // Add products
      for (const product of products) {
        if (!product.name || !product.price) continue;

        const normalizedName = product.name.toLowerCase().trim();
        if (!seenProductNames.has(normalizedName)) {
          seenProductNames.add(normalizedName);
          allProducts.push({
            ...product,
            catalogPageNumber: pageNum,
            catalogPageImage: `/catalog-images/${filename}`,
            catalogName,
          });
          log.product(`${product.name} - ${product.price} lei`);
        }
      }

      log.info(`   Total unique: ${allProducts.length} products\n`);

      // Navigate to next page
      // Method 1: Click right side
      try {
        await page.mouse.click(1300, 500);
      } catch (e) {}

      // Method 2: Arrow key
      await page.keyboard.press('ArrowRight');

      // Method 3: Click next button
      await page.evaluate(() => {
        const nextButtons = document.querySelectorAll('[class*="next"], [class*="right"], [class*="forward"], .arrow-right');
        for (const btn of nextButtons) {
          if (btn.offsetParent !== null) {
            btn.click();
            break;
          }
        }
      });

      // Wait between pages
      await new Promise(r => setTimeout(r, 2000));
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
  log.info(`\nSaving ${products.length} products to database...`);

  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7);

  let saved = 0;

  for (const product of products) {
    try {
      if (!product.name || !product.price || product.price <= 0 || product.price > 1000) {
        continue;
      }

      // Normalize category
      let category = product.category || 'Altele';

      if (/carne|pui|porc|vită|miel|curcan/i.test(product.name)) category = 'Proteine';
      if (/mezeluri|salam|șuncă|bacon|cârnați|parizer|pate|tobă/i.test(product.name)) category = 'Proteine';
      if (/pește|somon|ton|macrou/i.test(product.name)) category = 'Proteine';
      if (/lactate|lapte|iaurt|brânză|cașcaval|smântână|unt|frișcă/i.test(product.name)) category = 'Lactate';
      if (/legume|cartofi|ceapă|morcov|roșii|ardei|varză|salată/i.test(product.name)) category = 'Legume';
      if (/fructe|mere|banane|portocale|struguri|căpșuni/i.test(product.name)) category = 'Fructe';
      if (/pâine|franzelă|covrigi|baghetă|chiflă/i.test(product.name)) category = 'Panificație';
      if (/paste|orez|făină|spaghetti|mălai|griș/i.test(product.name)) category = 'Carbohidrați';
      if (/bere|vin|șampanie|vodka|whisky|rom/i.test(product.name)) category = 'Băuturi Alcoolice';
      if (/apă|suc|cola|fanta|sprite|pepsi/i.test(product.name)) category = 'Băuturi';
      if (/cafea|nescafe|jacobs/i.test(product.name)) category = 'Cafea';
      if (/dulci|ciocolat|biscuiți|prăjitur|tort/i.test(product.name)) category = 'Dulciuri';
      if (/chips|snack|covrig|floricele|alune/i.test(product.name)) category = 'Snacks';
      if (/conserv/i.test(product.name)) category = 'Conserve';
      if (/condiment|sos|maioneză|muștar|ulei|oțet/i.test(product.name)) category = 'Condimente';
      if (/congelat|înghețată/i.test(product.name)) category = 'Congelate';
      if (product.is_vitrina) category = 'Vitrină';

      await prisma.product.create({
        data: {
          name: product.name.substring(0, 200),
          brand: product.brand || null,
          category: category,
          subcategory: product.is_vitrina ? 'La vitrină' : null,
          price: parseFloat(product.price),
          originalPrice: product.original_price ? parseFloat(product.original_price) : null,
          discountPercentage: product.discount_percentage ? parseInt(product.discount_percentage) : null,
          unit: product.unit || 'buc',
          store: 'Kaufland',
          validFrom,
          validUntil,
          catalogPageNumber: product.catalogPageNumber,
          catalogPageImage: product.catalogPageImage,
          sourceUrl: product.catalogName,
          extractionConfidence: 0.90,
        },
      });

      saved++;

    } catch (e) {
      // Skip duplicates
    }
  }

  return saved;
}

/**
 * Main
 */
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     KAUFLAND CATALOG SCRAPER - PAGE BY PAGE                      ║');
  console.log('║     Clean screenshots without popups                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Clear old images
  log.info('Clearing old catalog images...');
  const oldFiles = fs.readdirSync(IMAGES_DIR);
  for (const file of oldFiles) {
    if (file.endsWith('.jpg') || file.endsWith('.webp') || file.endsWith('.png')) {
      fs.unlinkSync(path.join(IMAGES_DIR, file));
    }
  }
  log.success('Old images cleared');

  // Reset database
  log.info('Resetting database...');
  await prisma.product.deleteMany({});
  log.success('Database cleared\n');

  // Catalog to scrape
  const catalogUrl = 'https://www.catalomat.ro/kaufland/catalog-nou-de-miercuri-24-12-2025-51887/';
  const catalogId = '51887';
  const totalPages = 52;

  // Scrape
  const products = await scrapeCatalog(catalogUrl, catalogId, totalPages);

  // Save
  if (products.length > 0) {
    const saved = await saveProducts(products);
    log.success(`Saved ${saved} products to database`);
  }

  // Stats
  const total = await prisma.product.count();
  const byCategory = await prisma.product.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     SCRAPING COMPLETE                                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  log.success(`Total products: ${total}`);
  console.log('\nBy category:');
  byCategory.forEach(c => {
    console.log(`  ${c.category.padEnd(20)} ${c._count.id}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
