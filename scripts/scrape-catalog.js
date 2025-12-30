#!/usr/bin/env node

/**
 * Universal Catalog Scraper for Romanian Supermarkets
 * Supports: Auchan, Carrefour, Kaufland, LaDoiPași, Lidl, Mega Image, Metro, PENNY, Profi, Selgros
 *
 * Usage: node scripts/scrape-catalog.js <store> [catalog-url]
 * Example: node scripts/scrape-catalog.js lidl
 * Example: node scripts/scrape-catalog.js kaufland https://www.catalomat.ro/kaufland/catalog-nou-...
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Store configurations
const STORES = {
  auchan: {
    name: 'Auchan',
    baseUrl: 'https://www.catalomat.ro/auchan/',
    color: '\x1b[31m', // Red
  },
  carrefour: {
    name: 'Carrefour',
    baseUrl: 'https://www.catalomat.ro/carrefour/',
    color: '\x1b[34m', // Blue
  },
  kaufland: {
    name: 'Kaufland',
    baseUrl: 'https://www.catalomat.ro/kaufland/',
    color: '\x1b[31m', // Red
  },
  ladoipasi: {
    name: 'La Doi Pași',
    baseUrl: 'https://www.catalomat.ro/la-doi-pasi/',
    color: '\x1b[33m', // Yellow
  },
  lidl: {
    name: 'Lidl',
    baseUrl: 'https://www.catalomat.ro/lidl/',
    color: '\x1b[34m', // Blue
  },
  'mega-image': {
    name: 'Mega Image',
    baseUrl: 'https://www.catalomat.ro/mega-image/',
    color: '\x1b[31m', // Red
  },
  metro: {
    name: 'Metro',
    baseUrl: 'https://www.catalomat.ro/metro/',
    color: '\x1b[34m', // Blue
  },
  penny: {
    name: 'PENNY',
    baseUrl: 'https://www.catalomat.ro/penny/',
    color: '\x1b[33m', // Yellow
  },
  profi: {
    name: 'Profi',
    baseUrl: 'https://www.catalomat.ro/profi/',
    color: '\x1b[35m', // Magenta
  },
  selgros: {
    name: 'Selgros',
    baseUrl: 'https://www.catalomat.ro/selgros/',
    color: '\x1b[36m', // Cyan
  },
};

const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
  page: (msg) => console.log(`   📄 ${msg}`),
  store: (store, msg) => console.log(`${store.color}[${store.name}]\x1b[0m ${msg}`),
};

/**
 * Get category for a product
 */
function getCategory(productName) {
  const name = productName.toLowerCase();

  // ANIMALE
  if (/hrană.*pisici|hrană.*câini|one.*pisici|whiskas|pedigree|felix\b|purina one|vitakraft.*pisici|vitakraft.*câini|snack.*pisici/i.test(name)) {
    return 'Animale';
  }
  // PANIFICAȚIE
  if (/pâine|franzelă|baghetă|chiflă|cozonac|lipie|croissant|gogoașă|plăcintă|patiserie|churro|saleu|chec|prăjitur|tort\b|ecler|pain.*chocolat|foi.*plăcintă/i.test(name)) {
    return 'Panificatie';
  }
  // PEȘTE & FRUCTE DE MARE
  if (/pește|somon|ton\b|macrou|păstrăv|șalău|creveți|caracatiță|sushi|fructe de mare|sardine|hering|crap|doradă|file.*nil|file.*șalău|file somon/i.test(name)) {
    return 'Peste & Fructe de Mare';
  }
  // CARNE & MEZELURI
  if (/carne|pui\b|porc|vită|miel|curcan|pulpe|piept|aripi|mușchi|fleică|rasol|cotlet|antricot|vrăbioară|carpaccio|vitello|grill/i.test(name)) {
    if (!/somon|păstrăv|șalău|ton\b|macrou/i.test(name)) {
      return 'Carne & Mezeluri';
    }
  }
  if (/mezeluri|salam|șuncă|bacon|cârnați|parizer|pate|tobă|kaizer|jambon|ruladă|cremwurști|cârnăciori|pastramă|mici\b/i.test(name)) {
    return 'Carne & Mezeluri';
  }
  if (/afumat/i.test(name) && !/păstrăv|somon|pește|macrou/i.test(name)) {
    return 'Carne & Mezeluri';
  }
  // LACTATE
  if (/lapte|iaurt|brânză|cașcaval|smântână|unt\b|frișcă|mascarpone|gorgonzola|feta|telemea|mozzarella|parmezan|ricotta|cream cheese|margarină/i.test(name)) {
    if (!/ardei/i.test(name)) {
      return 'Lactate';
    }
  }
  // APĂ
  if (/apă minerală|apă plată|apă de izvor|apă.*naturală|bilbor|borsec|aqua carpatica|aquavia/i.test(name)) {
    return 'Apa';
  }
  // BĂUTURI ALCOOLICE
  if (/bere\b|vin\b|șampanie|vodka|whisky|rom\b|lichior|prosecco|lambrusco|cocktail|tequila|gin\b|coniac|brandy|vermut|spumant|alcool|malibu/i.test(name)) {
    if (!/gogoașă|prăjitur|baton|condiment|vin.*fiert/i.test(name)) {
      return 'Bauturi Alcoolice';
    }
  }
  // BĂUTURI RĂCORITOARE
  if (/suc\b|cola|fanta|sprite|pepsi|mirinda|7up|schweppes|limonadă|energizant|red bull|monster|hell|ciao|mountain dew|sirop|san pellegrino/i.test(name)) {
    return 'Bauturi Racoritoare';
  }
  if (/răcoritoare|fresh\b/i.test(name) && /băutură/i.test(name)) {
    return 'Bauturi Racoritoare';
  }
  // CAFEA & CEAI
  if (/cafea|espresso|cappuccino|nescafe|jacobs|lavazza|capsule.*cafea|cacao\b/i.test(name)) {
    return 'Cafea & Ceai';
  }
  if (/ceai\b|infuzie/i.test(name)) {
    return 'Cafea & Ceai';
  }
  // DULCIURI & SNACKS
  if (/ciocolat|biscuiți|napolitană|praline|bomboane|dulciuri|kit kat|milka|oreo|snickers|mars|twix|bounty|raffaello|ferrero|kinder|jelly|gummy|baton|făgăraș|jaffa|cherry queen|kandia/i.test(name)) {
    return 'Dulciuri & Snacks';
  }
  if (/chips|chipsuri|snack|floricele|popcorn|covrigei|sticks|crackers|lay's/i.test(name)) {
    if (!/pisici|câini/i.test(name)) {
      return 'Dulciuri & Snacks';
    }
  }
  // CONSERVE
  if (/conserv|gogoșari|murături|compot|mazăre.*boabe|porumb|ananas.*bucăți|în oțet|oțet.*cm/i.test(name)) {
    return 'Conserve';
  }
  // LEGUME & FRUCTE
  if (/roșii|ardei|cartofi|ceapă|morcov|varză|salată|castraveți|vinete|dovlecei|spanac|usturoi|ciuperci|conopidă|broccoli|țelină|ridichi|măsline|căpșun|lămâi|lime|limes|avocado/i.test(name)) {
    return 'Legume & Fructe';
  }
  if (/mere\b|banane|portocale|struguri|cireșe|piersici|pepene|kiwi|mango|ananas|fructe/i.test(name)) {
    if (!/bucăți.*suc|suc.*propriu|compot|conserv|băutură|răcoritoare/i.test(name)) {
      return 'Legume & Fructe';
    }
  }
  // INGREDIENTE
  if (/făină|mălai|griș|zahăr|sare\b|piper|boia|oregano|cimbru|condiment|mirodenii|drojdie|bicarbonat|amidon|gelatină|esență|vanilie|scorțișoară|nucșoară|migdale|nucă.*cocos/i.test(name)) {
    return 'Ingrediente';
  }
  if (/ulei|oțet\b|sos\b|maioneză|muștar|ketchup|pastă.*tomate|bulion|cremă.*gătit|cremă.*cacao|cremă.*tartinabilă|cremă.*alune/i.test(name)) {
    if (!/în oțet/i.test(name)) {
      return 'Ingrediente';
    }
  }
  if (/paste\b|spaghetti|penne|fusilli|macaroane|orez|năut|linte|quinoa|cușcuș|bob\b/i.test(name)) {
    return 'Ingrediente';
  }
  // CONGELATE
  if (/congelat|înghețată|legume.*congelate|fructe.*congelate|pizza.*congelat|fasole.*verde.*1\s*kg/i.test(name)) {
    return 'Congelate';
  }

  return 'Altele';
}

/**
 * Download image from URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.catalomat.ro/',
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(filepath); } catch (e) {}
        return downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(filepath); } catch (e) {}
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          const stats = fs.statSync(filepath);
          resolve({ filepath, size: stats.size });
        });
      });
    }).on('error', (err) => {
      file.close();
      try { fs.unlinkSync(filepath); } catch (e) {}
      reject(err);
    });
  });
}

/**
 * Extract products from image using Gemini 3 Flash Preview
 */
async function extractProductsFromImage(imageBase64, pageNum, storeName) {
  log.ai(`Analyzing page ${pageNum} with Gemini 3 Flash Preview...`);

  const systemPrompt = `Ești un expert în extragerea de date din cataloage de supermarket românești.

TASK: Analizează imaginea și extrage ABSOLUT TOATE produsele ALIMENTARE și BĂUTURILE vizibile.

IMPORTANT - INCLUDE OBLIGATORIU:
- Carne, pește, mezeluri, ouă
- Lactate (lapte, iaurt, brânză, cașcaval, smântână, unt)
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
              text: `Pagina ${pageNum} din catalogul ${storeName}. Extrage TOATE produsele alimentare. JSON only.`,
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
 * Find the latest catalog URL for a store
 */
async function findLatestCatalog(browser, storeConfig) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    log.info(`Finding latest catalog for ${storeConfig.name}...`);
    await page.goto(storeConfig.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Find first catalog link (newest)
    const catalogUrl = await page.evaluate(() => {
      // Look for catalog links
      const links = document.querySelectorAll('a[href*="catalog"]');
      for (const link of links) {
        const href = link.href;
        if (href.includes('catalomat.ro') && href.match(/catalog.*\d{5}/)) {
          return href;
        }
      }
      return null;
    });

    await page.close();
    return catalogUrl;

  } catch (error) {
    log.error(`Failed to find catalog: ${error.message}`);
    await page.close();
    return null;
  }
}

/**
 * Main scraping function
 */
async function scrapeCatalog(storeKey, catalogUrl = null) {
  const storeConfig = STORES[storeKey];
  if (!storeConfig) {
    log.error(`Unknown store: ${storeKey}`);
    log.info(`Available stores: ${Object.keys(STORES).join(', ')}`);
    return;
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log(`║     CATALOG SCRAPER - ${storeConfig.name.padEnd(43)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
  });

  // Find catalog URL if not provided
  if (!catalogUrl) {
    catalogUrl = await findLatestCatalog(browser, storeConfig);
    if (!catalogUrl) {
      log.error('Could not find catalog URL');
      await browser.close();
      return;
    }
  }

  log.success(`Catalog URL: ${catalogUrl}`);

  // Extract catalog ID from URL
  const catalogIdMatch = catalogUrl.match(/(\d{5})/);
  const catalogId = catalogIdMatch ? catalogIdMatch[1] : 'unknown';
  const catalogName = `${storeKey}-${catalogId}`;

  log.info(`Catalog ID: ${catalogId}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1600, height: 1000 });

  const allProducts = [];
  const seenProductNames = new Set();
  const imageUrls = new Map();

  // Listen for image URLs - capture ALL catalog images
  page.on('response', async (response) => {
    const url = response.url();
    // Match any leafletscdns URL with the catalog ID and a page number
    if (url.includes('leafletscdns.com') && url.includes(`/${catalogId}/`) && url.match(/\/\d+\.jpg/)) {
      const match = url.match(/\/(\d+)\.jpg/);
      if (match) {
        const pageNum = parseInt(match[1]);
        const currentUrl = imageUrls.get(pageNum);
        // Prefer URLs with thumbor signature (longer URLs = better quality)
        if (!currentUrl || url.length > currentUrl.length) {
          imageUrls.set(pageNum, url);
          log.page(`Captured URL for page ${pageNum + 1}`);
        }
      }
    }
    // Also capture URLs that might have different path structure (ro/data/X/catalogId)
    else if (url.includes('leafletscdns.com') && url.match(/\/ro\/data\/\d+\/\d+\/\d+\.jpg/)) {
      const pathMatch = url.match(/\/ro\/data\/(\d+)\/(\d+)\/(\d+)\.jpg/);
      if (pathMatch) {
        const urlCatalogId = pathMatch[2];
        const pageNum = parseInt(pathMatch[3]);
        if (urlCatalogId === catalogId) {
          const currentUrl = imageUrls.get(pageNum);
          if (!currentUrl || url.length > currentUrl.length) {
            imageUrls.set(pageNum, url);
            log.page(`Captured URL for page ${pageNum + 1} (alt path)`);
          }
        }
      }
    }
  });

  try {
    // Navigate to catalog
    log.info('Opening catalog page...');
    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // Accept cookies
    log.info('Handling cookie consent...');
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('De acord') || text.includes('Accept'))) {
          await btn.click();
          log.success('Cookie consent accepted');
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      }
    } catch (e) {}

    // Get total pages
    let totalPages = 30; // Default estimate
    const pageInfo = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const text = el.textContent.trim();
        const match = text.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (match) {
          return { current: parseInt(match[1]), total: parseInt(match[2]) };
        }
      }
      return null;
    });

    if (pageInfo) {
      totalPages = pageInfo.total;
      log.success(`Catalog has ${totalPages} pages`);
    }

    await new Promise(r => setTimeout(r, 3000));

    // Navigate through all pages
    log.info(`Navigating through ${totalPages} pages to collect image URLs...`);

    // Click on the catalog to focus it first
    try {
      await page.mouse.click(800, 500);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    // First pass: forward - use multiple navigation methods
    for (let i = 0; i < totalPages + 10; i++) {
      // Try clicking on the right side of the catalog
      try { await page.mouse.click(1100, 500); } catch (e) {}
      // Use keyboard
      await page.keyboard.press('ArrowRight');
      // Try clicking next buttons
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('[class*="next"], [class*="right"], [class*="forward"], .arrow-right, button');
        for (const btn of buttons) {
          if (btn.offsetParent !== null && (btn.className.includes('next') || btn.className.includes('right'))) {
            btn.click();
            break;
          }
        }
      });

      await new Promise(r => setTimeout(r, 1000));
      if (i % 10 === 0) {
        log.info(`Forward: ${i}/${totalPages}, ${imageUrls.size} URLs collected`);
      }
    }

    log.info(`After forward pass: ${imageUrls.size} URLs`);

    // Second pass: backward
    await new Promise(r => setTimeout(r, 2000));
    log.info('Going back through catalog...');

    for (let i = 0; i < totalPages + 10; i++) {
      try { await page.mouse.click(300, 500); } catch (e) {}
      await page.keyboard.press('ArrowLeft');
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('[class*="prev"], [class*="left"], [class*="back"], .arrow-left');
        for (const btn of buttons) {
          if (btn.offsetParent !== null) {
            btn.click();
            break;
          }
        }
      });
      await new Promise(r => setTimeout(r, 800));
      if (i % 10 === 0) {
        log.info(`Backward: ${i}/${totalPages}, ${imageUrls.size} URLs collected`);
      }
    }

    log.info(`After backward pass: ${imageUrls.size} URLs`);

    // Third pass: forward again
    log.info('Final forward pass...');
    for (let i = 0; i < totalPages + 10; i++) {
      try { await page.mouse.click(1100, 500); } catch (e) {}
      await page.keyboard.press('ArrowRight');
      await new Promise(r => setTimeout(r, 600));
    }

    await new Promise(r => setTimeout(r, 3000));
    log.success(`Collected ${imageUrls.size} image URLs\n`);

    // Process each page
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const displayPage = pageNum + 1;
      log.page(`\nProcessing page ${displayPage}/${totalPages}...`);

      const imageUrl = imageUrls.get(pageNum);
      if (!imageUrl) {
        log.error(`No image URL found for page ${displayPage}`);
        continue;
      }

      const filename = `${catalogName}-page-${String(displayPage).padStart(2, '0')}.jpg`;
      const filepath = path.join(IMAGES_DIR, filename);

      try {
        // Download image
        const result = await downloadImage(imageUrl, filepath);

        if (result.size < 20000) {
          log.error(`Image too small: ${Math.round(result.size / 1024)}KB - skipping`);
          continue;
        }

        log.success(`Downloaded: ${filename} (${Math.round(result.size / 1024)}KB)`);

        // Read image for AI processing
        const imageBase64 = fs.readFileSync(filepath).toString('base64');

        // Extract products with AI
        const products = await extractProductsFromImage(imageBase64, displayPage, storeConfig.name);

        // Add products
        for (const product of products) {
          if (!product.name || !product.price) continue;

          const normalizedName = product.name.toLowerCase().trim();
          if (!seenProductNames.has(normalizedName)) {
            seenProductNames.add(normalizedName);
            allProducts.push({
              ...product,
              catalogPageNumber: displayPage,
              catalogPageImage: `/catalog-images/${filename}`,
              catalogName,
              store: storeConfig.name,
            });
            log.product(`${product.name} - ${product.price} lei`);
          }
        }

        log.info(`   Total unique: ${allProducts.length} products`);

        await new Promise(r => setTimeout(r, 300));

      } catch (error) {
        log.error(`Failed page ${displayPage}: ${error.message}`);
      }
    }

  } catch (error) {
    log.error(`Scraping error: ${error.message}`);
    console.error(error);
  } finally {
    await browser.close();
  }

  return { products: allProducts, store: storeConfig.name, catalogName };
}

/**
 * Save products to database
 */
async function saveProducts(products, storeName) {
  log.info(`\nSaving ${products.length} products from ${storeName} to database...`);

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

      const category = getCategory(product.name);

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
          store: storeName,
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
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     UNIVERSAL CATALOG SCRAPER                                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('Usage: node scripts/scrape-catalog.js <store> [catalog-url]');
    console.log('\nAvailable stores:');
    Object.entries(STORES).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(15)} - ${config.name}`);
    });
    console.log('\nExamples:');
    console.log('  node scripts/scrape-catalog.js lidl');
    console.log('  node scripts/scrape-catalog.js kaufland https://www.catalomat.ro/kaufland/...');
    return;
  }

  const storeKey = args[0].toLowerCase();
  const catalogUrl = args[1] || null;

  // Clean old images for this store
  log.info(`Clearing old ${storeKey} catalog images...`);
  try {
    const oldFiles = fs.readdirSync(IMAGES_DIR);
    for (const file of oldFiles) {
      if (file.startsWith(storeKey) && (file.endsWith('.jpg') || file.endsWith('.webp'))) {
        fs.unlinkSync(path.join(IMAGES_DIR, file));
      }
    }
  } catch (e) {}
  log.success('Old images cleared');

  // Delete existing products from this store
  log.info(`Removing existing ${STORES[storeKey]?.name || storeKey} products from database...`);
  const deleteResult = await prisma.product.deleteMany({
    where: { store: STORES[storeKey]?.name || storeKey }
  });
  log.success(`Deleted ${deleteResult.count} existing products`);

  // Scrape
  const result = await scrapeCatalog(storeKey, catalogUrl);

  if (result && result.products.length > 0) {
    const saved = await saveProducts(result.products, result.store);
    log.success(`Saved ${saved} products to database`);
  }

  // Stats
  const total = await prisma.product.count();
  const byStore = await prisma.product.groupBy({
    by: ['store'],
    _count: { id: true },
  });
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

  console.log('\nBy store:');
  byStore.forEach(s => {
    console.log(`  ${s.store.padEnd(20)} ${s._count.id}`);
  });

  console.log('\nBy category:');
  byCategory.forEach(c => {
    console.log(`  ${c.category.padEnd(25)} ${c._count.id}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
