#!/usr/bin/env node

/**
 * Kaufland Complete Catalog Scraper
 * - Uses Gemini 3 Flash Preview
 * - Extracts ALL food products (including beverages, snacks, "la vitrină")
 * - Saves catalog page images for each product
 * - Processes all 52+ pages per catalog
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
const MAX_PAGES_PER_CATALOG = 60; // 52 pages + buffer
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
      "name": "string (nume complet cu greutate/volum, ex: 'Piept de pui 1kg', 'Bere Ursus 0.5L', 'Salam de Sibiu la vitrină 100g')",
      "brand": "string sau null",
      "price": number (prețul ACTUAL în lei, cel mare/colorat),
      "unit": "string (kg, g, L, ml, buc)",
      "original_price": number sau null (prețul vechi/barat dacă există),
      "discount_percentage": number sau null (ex: 25 pentru -25%)",
      "category": "string (Carne, Mezeluri, Lactate, Legume, Fructe, Panificație, Paste, Conserve, Condimente, Băuturi, Dulciuri, Snacks, Congelate, Vitrină)",
      "is_vitrina": boolean (true dacă e produs "la vitrină" vândut la cântar)
    }
  ]
}

REGULI CRITICE:
1. Prețurile mari colorate = preț actual cu reducere
2. Prețuri barate/mici/tăiate = preț vechi (original_price)
3. Include ÎNTOTDEAUNA greutatea/volumul în nume (ex: "Lapte Zuzu 1L", "Bere Heineken 0.33L")
4. Pentru produse "la vitrină": pune gramajul afișat (100g, 250g) și is_vitrina: true
5. BĂUTURILE sunt ingrediente! Include: vin, bere, apă minerală, cafea, sucuri
6. Returnează DOAR JSON valid, fără explicații
7. Dacă nu găsești produse alimentare: {"products": []}
8. Extrage TOATE produsele vizibile, nu doar primele`;

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
              text: `Aceasta este pagina ${pageNum} din catalogul ${catalogName}. Extrage TOATE produsele ALIMENTARE și BĂUTURILE. Include vin, bere, apă, cafea, sucuri, chipsuri, snacks. Pentru produse "la vitrină" include gramajul. Returnează JSON.`,
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
 * Save catalog page image
 */
function savePageImage(imageBase64, catalogName, pageNum) {
  const safeCatalogName = catalogName.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 50);
  const filename = `${safeCatalogName}-page-${String(pageNum).padStart(2, '0')}.jpg`;
  const filepath = path.join(IMAGES_DIR, filename);

  fs.writeFileSync(filepath, Buffer.from(imageBase64, 'base64'));

  // Return relative path for database storage
  return `/catalog-images/${filename}`;
}

/**
 * Scrape a specific catalog
 */
async function scrapeCatalog(browser, catalogUrl, catalogName) {
  log.info(`\n${'='.repeat(70)}`);
  log.info(`Opening catalog: ${catalogName}`);
  log.info(`URL: ${catalogUrl}`);
  log.info(`${'='.repeat(70)}\n`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1400, height: 1000 });

  const productsWithImages = [];
  const seenProductNames = new Set();

  try {
    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    await new Promise(r => setTimeout(r, 3000));

    // Check if there's a catalog viewer iframe
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });

    if (iframeSrc) {
      log.info(`Found iframe viewer, navigating...`);
      await page.goto(iframeSrc, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 3000));
    }

    // Process all pages
    let previousScreenshot = null;
    let samePageCount = 0;
    let totalProductsThisCatalog = 0;

    for (let pageNum = 1; pageNum <= MAX_PAGES_PER_CATALOG; pageNum++) {
      try {
        await new Promise(r => setTimeout(r, 1500));

        // Take screenshot
        const screenshot = await page.screenshot({
          encoding: 'base64',
          type: 'jpeg',
          quality: 90,
        });

        // Check if same as previous (end of catalog)
        if (previousScreenshot === screenshot) {
          samePageCount++;
          if (samePageCount >= 2) {
            log.info(`\n📚 Reached end of catalog at page ${pageNum - 1}`);
            break;
          }
        } else {
          samePageCount = 0;
        }
        previousScreenshot = screenshot;

        log.page(`Captured page ${pageNum}`);

        // Save the page image
        const imagePath = savePageImage(screenshot, catalogName, pageNum);
        log.page(`Saved image: ${imagePath}`);

        // Extract products with AI
        const products = await extractProductsFromImage(screenshot, pageNum, catalogName);

        // Add products with image path
        for (const product of products) {
          if (!product.name || !product.price) continue;

          const normalizedName = product.name.toLowerCase().trim();
          if (!seenProductNames.has(normalizedName)) {
            seenProductNames.add(normalizedName);
            productsWithImages.push({
              ...product,
              catalogPageNumber: pageNum,
              catalogPageImage: imagePath,
              catalogName: catalogName,
            });
            totalProductsThisCatalog++;
            log.product(`${product.name} - ${product.price} lei ${product.is_vitrina ? '(vitrină)' : ''}`);
          }
        }

        log.info(`   Running total: ${totalProductsThisCatalog} unique products\n`);

        // Navigate to next page - try multiple methods
        let navigated = false;

        // Method 1: Click on right side of page (flipbook viewers)
        try {
          const viewportWidth = 1400;
          await page.mouse.click(viewportWidth - 50, 500);
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {}

        // Method 2: Arrow key
        await page.keyboard.press('ArrowRight');
        await new Promise(r => setTimeout(r, 500));

        // Method 3: Click next button
        await page.evaluate(() => {
          const selectors = [
            '.next', '.arrow-right', '[class*="next"]', '[class*="right"]',
            'button[aria-label*="next"]', '.flipbook-nav-right',
            '[class*="forward"]', '.page-next'
          ];
          for (const selector of selectors) {
            const btn = document.querySelector(selector);
            if (btn && btn.offsetParent !== null) {
              btn.click();
              break;
            }
          }
        });

        // Rate limiting for AI API
        await new Promise(r => setTimeout(r, 2000));

      } catch (error) {
        log.error(`Error on page ${pageNum}: ${error.message}`);
      }
    }

    log.success(`\nCatalog "${catalogName}" complete: ${totalProductsThisCatalog} products extracted`);

  } catch (error) {
    log.error(`Catalog error: ${error.message}`);
  } finally {
    await page.close();
  }

  return productsWithImages;
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

      // Skip obviously non-food items that might slip through
      if (/telefon|tv|laptop|frigider|aragaz|aspirator|samsung|iphone|tablet|smartphone|mașină|detergent|șampon/i.test(product.name)) {
        continue;
      }

      // Normalize category
      let category = product.category || 'Altele';

      // Category mapping
      if (/carne|pui|porc|vită|miel|curcan/i.test(product.name) || /carne/i.test(category)) category = 'Proteine';
      if (/mezeluri|salam|șuncă|bacon|cârnați|parizer|pate|tobă/i.test(product.name) || /mezeluri/i.test(category)) category = 'Proteine';
      if (/pește|somon|ton|macrou|sardine|hering|crap|păstrăv/i.test(product.name)) category = 'Proteine';
      if (/lactate|lapte|iaurt|brânză|cașcaval|smântână|unt|frișcă|mascarpone|feta/i.test(product.name) || /lactate/i.test(category)) category = 'Lactate';
      if (/legume|cartofi|ceapă|morcov|roșii|ardei|varză|salată|castraveți|spanac|fasole|mazăre/i.test(product.name) || /legume/i.test(category)) category = 'Legume';
      if (/fructe|mere|banane|portocale|struguri|căpșuni|pere|kiwi|ananas|mango|avocado/i.test(product.name) || /fructe/i.test(category)) category = 'Fructe';
      if (/pâine|franzelă|covrigi|baghetă|chiflă|lipie|plăcintă/i.test(product.name) || /pâine|panificație/i.test(category)) category = 'Panificație';
      if (/paste|orez|făină|spaghetti|mălai|griș|fulgi|cereale/i.test(product.name) || /paste|carbohidrați/i.test(category)) category = 'Carbohidrați';
      if (/bere|vin|șampanie|vodka|whisky|rom|țuică|rachiu|lichior|prosecco/i.test(product.name)) category = 'Băuturi Alcoolice';
      if (/apă|suc|cola|fanta|sprite|pepsi|energizant|red bull|monster|limonadă|nectar/i.test(product.name)) category = 'Băuturi';
      if (/cafea|nescafe|jacobs|lavazza|tchibo|cappuccino|espresso/i.test(product.name)) category = 'Cafea';
      if (/ceai|lipton|fares/i.test(product.name)) category = 'Ceai';
      if (/dulci|ciocolat|biscuiți|prăjitur|tort|napolitană|bomboane|gumă|acadele|jeleu/i.test(product.name) || /dulciuri/i.test(category)) category = 'Dulciuri';
      if (/chips|chipsuri|snack|covrig|floricele|alune|fistic|migdale|nuci|semințe|lay|chio|pringles/i.test(product.name) || /snacks/i.test(category)) category = 'Snacks';
      if (/conserv/i.test(product.name) || /conserve/i.test(category)) category = 'Conserve';
      if (/condiment|sare|piper|boia|oregano|busuioc|cimbru|sos|maioneză|muștar|ketchup|ulei|oțet/i.test(product.name) || /condimente/i.test(category)) category = 'Condimente';
      if (/congelat|înghețată/i.test(product.name) || /congelate/i.test(category)) category = 'Congelate';
      if (product.is_vitrina || /vitrină/i.test(category)) category = 'Vitrină';

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
      // Likely duplicate, skip
      if (!e.message.includes('Unique constraint')) {
        log.error(`Save error: ${e.message}`);
      }
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
  console.log('║     KAUFLAND COMPLETE CATALOG SCRAPER                            ║');
  console.log('║     Model: Gemini 3 Flash Preview                                ║');
  console.log('║     Max pages: 60 per catalog                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  log.info(`Using AI Model: ${VISION_MODEL}`);
  log.info(`Images directory: ${IMAGES_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1000'],
  });

  const allProducts = [];

  try {
    // Get catalog list
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    log.info('Fetching catalog list from catalomat.ro...');
    await page.goto('https://www.catalomat.ro/kaufland/', { waitUntil: 'networkidle2', timeout: 60000 });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    // Get all food catalog URLs (exclude nonfood)
    const catalogs = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        if (a.href &&
            a.href.includes('/kaufland/catalog-') &&
            !a.href.includes('nonfood')) {
          // Get catalog name from text or URL
          const text = a.textContent?.trim() || a.href.split('/').pop();
          links.push({
            url: a.href,
            name: text.substring(0, 60)
          });
        }
      });
      // Unique by URL
      const seen = new Set();
      return links.filter(l => {
        if (seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
      }).slice(0, 2); // Process first 2 food catalogs
    });

    await page.close();

    log.info(`Found ${catalogs.length} catalogs to process:\n`);
    catalogs.forEach((c, i) => log.info(`  ${i + 1}. ${c.name}`));
    console.log('\n');

    // Process each catalog
    for (const catalog of catalogs) {
      const products = await scrapeCatalog(browser, catalog.url, catalog.name);
      allProducts.push(...products);
    }

  } catch (error) {
    log.error(`Scraping error: ${error.message}`);
    console.error(error);
  } finally {
    await browser.close();
  }

  // Save to database
  log.info(`\n${'='.repeat(70)}`);
  log.info('SAVING TO DATABASE');
  log.info(`${'='.repeat(70)}\n`);

  log.info(`Total extracted: ${allProducts.length} unique products`);

  if (allProducts.length > 0) {
    const saved = await saveProducts(allProducts);
    log.success(`Saved ${saved} products to database`);
  }

  // Show final stats
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

  log.success(`Total products in database: ${total}`);
  console.log('\nProducts by category:');
  console.log('─'.repeat(40));
  byCategory.forEach(c => {
    const bar = '█'.repeat(Math.min(c._count.id, 30));
    console.log(`  ${c.category.padEnd(20)} ${String(c._count.id).padStart(4)} ${bar}`);
  });
  console.log('\n');

  await prisma.$disconnect();
}

main().catch(console.error);
