#!/usr/bin/env node

/**
 * Kaufland Catalog Scraper v2 - Capture Real Image URLs
 * Navigates through catalog and captures the actual image URLs with thumbor signatures
 * Downloads the high-quality images directly
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

const log = {
  info: (msg) => console.log(`[KAUFLAND] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
  page: (msg) => console.log(`   📄 ${msg}`),
};

/**
 * Download image from URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
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
async function extractProductsFromImage(imageBase64, pageNum, catalogName) {
  log.ai(`Analyzing page ${pageNum} with Gemini 3 Flash Preview...`);

  const systemPrompt = `Ești un expert în extragerea de date din cataloage de supermarket românești Kaufland.

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
 * Main scraping function
 */
async function scrapeCatalog(catalogUrl, catalogId, totalPages) {
  log.info(`\nStarting catalog scrape: ${catalogUrl}`);
  log.info(`Catalog ID: ${catalogId}, Expected pages: ${totalPages}\n`);

  const browser = await puppeteer.launch({
    headless: false, // See what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1600, height: 1000 });

  const allProducts = [];
  const seenProductNames = new Set();
  const catalogName = `kaufland-${catalogId}`;

  // Collect image URLs from network requests
  const imageUrls = new Map(); // pageNum -> URL

  page.on('response', async (response) => {
    const url = response.url();
    // Look for catalog page images with thumbor signature
    if (url.includes('leafletscdns.com') && url.includes(`/${catalogId}/`) && url.match(/\/\d+\.jpg/)) {
      const match = url.match(/\/(\d+)\.jpg/);
      if (match) {
        const pageNum = parseInt(match[1]);
        // Store the URL - prefer higher quality ones
        const currentUrl = imageUrls.get(pageNum);
        if (!currentUrl || url.length > currentUrl.length) {
          imageUrls.set(pageNum, url);
          log.page(`Captured URL for page ${pageNum + 1}`);
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

    // Get the actual total pages from the page indicator
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

    // Wait for initial images to load
    await new Promise(r => setTimeout(r, 3000));

    // Navigate through all pages to collect image URLs
    log.info(`Navigating through ${totalPages} pages to collect image URLs...`);

    // First pass: go forward through all pages
    for (let i = 0; i < totalPages + 5; i++) {
      // Navigate to next page using multiple methods
      try { await page.mouse.click(1200, 500); } catch (e) {}
      await page.keyboard.press('ArrowRight');
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('[class*="next"], [class*="right"], .arrow-right');
        for (const btn of buttons) {
          if (btn.offsetParent !== null) {
            btn.click();
            break;
          }
        }
      });

      await new Promise(r => setTimeout(r, 800));

      if (i % 10 === 0) {
        log.info(`Forward: ${i}/${totalPages} pages navigated, ${imageUrls.size} URLs collected`);
      }
    }

    log.info(`After forward pass: ${imageUrls.size} URLs collected`);

    // Wait then go back through catalog to catch any missing pages
    await new Promise(r => setTimeout(r, 2000));
    log.info('Going back through catalog to catch missing pages...');

    // Second pass: go backward through all pages
    for (let i = 0; i < totalPages + 5; i++) {
      try { await page.mouse.click(200, 500); } catch (e) {}
      await page.keyboard.press('ArrowLeft');
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('[class*="prev"], [class*="left"], .arrow-left');
        for (const btn of buttons) {
          if (btn.offsetParent !== null) {
            btn.click();
            break;
          }
        }
      });

      await new Promise(r => setTimeout(r, 600));

      if (i % 10 === 0) {
        log.info(`Backward: ${i}/${totalPages} pages navigated, ${imageUrls.size} URLs collected`);
      }
    }

    log.info(`After backward pass: ${imageUrls.size} URLs collected`);

    // Third pass: go forward one more time for any remaining
    log.info('Final forward pass...');
    for (let i = 0; i < totalPages + 5; i++) {
      try { await page.mouse.click(1200, 500); } catch (e) {}
      await page.keyboard.press('ArrowRight');
      await new Promise(r => setTimeout(r, 500));
    }

    // Wait for final images
    await new Promise(r => setTimeout(r, 3000));

    log.success(`Collected ${imageUrls.size} image URLs\n`);

    // Debug: show collected URLs
    log.info('Sample URLs:');
    let count = 0;
    for (const [pageNum, url] of imageUrls) {
      if (count < 3) {
        log.info(`  Page ${pageNum + 1}: ${url.substring(0, 100)}...`);
        count++;
      }
    }

    // Now download and process each image
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
        const products = await extractProductsFromImage(imageBase64, displayPage, catalogName);

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
            });
            log.product(`${product.name} - ${product.price} lei`);
          }
        }

        log.info(`   Total unique: ${allProducts.length} products`);

        // Small delay
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

      // Normalize category - CLEAR RULES, NO DUPLICATES
      const name = product.name.toLowerCase();
      let category = 'Altele';

      // ANIMALE - hrană pentru animale (check FIRST - be specific!)
      if (/hrană.*pisici|hrană.*câini|one.*pisici|whiskas|pedigree|felix\b|purina one|vitakraft.*pisici|vitakraft.*câini|snack.*pisici/i.test(name)) {
        category = 'Animale';
      }
      // PANIFICAȚIE (check before dulciuri)
      else if (/pâine|franzelă|baghetă|chiflă|cozonac|lipie|croissant|gogoașă|plăcintă|patiserie|churro|saleu|chec|prăjitur|tort\b|ecler|pain.*chocolat|foi.*plăcintă/i.test(name)) {
        category = 'Panificatie';
      }
      // PEȘTE & FRUCTE DE MARE (check BEFORE carne)
      else if (/pește|somon|ton\b|macrou|păstrăv|șalău|creveți|caracatiță|sushi|fructe de mare|sardine|hering|crap|doradă|file.*nil|file.*șalău|file somon/i.test(name)) {
        category = 'Peste & Fructe de Mare';
      }
      // CARNE & MEZELURI
      else if (/carne|pui\b|porc|vită|miel|curcan|pulpe|piept|aripi|mușchi|fleică|rasol|cotlet|antricot|vrăbioară|carpaccio|vitello|grill/i.test(name)) {
        category = 'Carne & Mezeluri';
      }
      else if (/mezeluri|salam|șuncă|bacon|cârnați|parizer|pate|tobă|kaizer|jambon|ruladă|cremwurști|cârnăciori|pastramă|mici\b|afumat/i.test(name)) {
        category = 'Carne & Mezeluri';
      }
      // LACTATE
      else if (/lapte|iaurt|brânză|cașcaval|smântână|unt\b|frișcă|mascarpone|gorgonzola|feta|telemea|mozzarella|parmezan|ricotta|cream cheese|margarină/i.test(name)) {
        if (!/ardei/i.test(name)) category = 'Lactate';
      }
      // APĂ
      else if (/apă minerală|apă plată|apă de izvor|apă.*naturală|bilbor|borsec|aqua carpatica|aquavia/i.test(name)) {
        category = 'Apa';
      }
      // BĂUTURI ALCOOLICE
      else if (/bere\b|vin\b|șampanie|vodka|whisky|rom\b|lichior|prosecco|lambrusco|cocktail|tequila|gin\b|coniac|brandy|vermut|spumant|alcool|malibu/i.test(name)) {
        if (!/gogoașă|prăjitur|baton|condiment|vin.*fiert/i.test(name)) category = 'Bauturi Alcoolice';
      }
      // BĂUTURI RĂCORITOARE
      else if (/suc\b|cola|fanta|sprite|pepsi|mirinda|7up|schweppes|limonadă|energizant|red bull|monster|hell|ciao|mountain dew|sirop|san pellegrino|răcoritoare|fresh\b/i.test(name)) {
        category = 'Bauturi Racoritoare';
      }
      // CAFEA & CEAI
      else if (/cafea|espresso|cappuccino|nescafe|jacobs|lavazza|capsule.*cafea|cacao\b|ceai\b|infuzie/i.test(name)) {
        category = 'Cafea & Ceai';
      }
      // DULCIURI & SNACKS
      else if (/ciocolat|biscuiți|napolitană|praline|bomboane|dulciuri|kit kat|milka|oreo|snickers|mars|twix|bounty|raffaello|ferrero|kinder|jelly|gummy|baton|făgăraș|jaffa|cherry queen|kandia/i.test(name)) {
        category = 'Dulciuri & Snacks';
      }
      else if (/chips|chipsuri|snack|floricele|popcorn|covrigei|sticks|crackers|lay's/i.test(name)) {
        if (!/pisici|câini/i.test(name)) category = 'Dulciuri & Snacks';
      }
      // CONSERVE (check before legume & ingrediente)
      else if (/conserv|gogoșari|murături|compot|mazăre.*boabe|porumb|ananas.*bucăți|în oțet|oțet.*cm/i.test(name)) {
        category = 'Conserve';
      }
      // LEGUME & FRUCTE
      else if (/roșii|ardei|cartofi|ceapă|morcov|varză|salată|castraveți|vinete|dovlecei|spanac|usturoi|ciuperci|conopidă|broccoli|țelină|ridichi|măsline|căpșun|lămâi|lime|limes|avocado/i.test(name)) {
        category = 'Legume & Fructe';
      }
      else if (/mere\b|banane|portocale|struguri|cireșe|piersici|pepene|kiwi|mango|ananas|fructe/i.test(name)) {
        if (!/bucăți.*suc|suc.*propriu|compot|conserv|băutură|răcoritoare/i.test(name)) category = 'Legume & Fructe';
      }
      // INGREDIENTE
      else if (/făină|mălai|griș|zahăr|sare\b|piper|boia|oregano|cimbru|condiment|mirodenii|drojdie|bicarbonat|amidon|gelatină|esență|vanilie|scorțișoară|nucșoară|migdale|nucă.*cocos/i.test(name)) {
        category = 'Ingrediente';
      }
      else if (/ulei|oțet\b|sos\b|maioneză|muștar|ketchup|pastă.*tomate|bulion|cremă.*gătit|cremă.*cacao|cremă.*tartinabilă|cremă.*alune/i.test(name)) {
        if (!/în oțet/i.test(name)) category = 'Ingrediente';
      }
      else if (/paste\b|spaghetti|penne|fusilli|macaroane|orez|năut|linte|quinoa|cușcuș|bob\b/i.test(name)) {
        category = 'Ingrediente';
      }
      // CONGELATE
      else if (/congelat|înghețată|legume.*congelate|fructe.*congelate|pizza.*congelat|fasole.*verde.*1\s*kg/i.test(name)) {
        category = 'Congelate';
      }

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
  console.log('║     KAUFLAND CATALOG SCRAPER v2 - REAL IMAGE URLS                ║');
  console.log('║     Captures thumbor-signed image URLs from page navigation      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Clear old images
  log.info('Clearing old catalog images...');
  try {
    const oldFiles = fs.readdirSync(IMAGES_DIR);
    for (const file of oldFiles) {
      if (file.endsWith('.jpg') || file.endsWith('.webp') || file.endsWith('.png')) {
        fs.unlinkSync(path.join(IMAGES_DIR, file));
      }
    }
  } catch (e) {}
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
