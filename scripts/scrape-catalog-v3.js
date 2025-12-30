#!/usr/bin/env node

/**
 * Universal Catalog Scraper v3 - Using cataloagedeoferte.ro
 * Much simpler - direct image URLs without thumbor signatures!
 *
 * Usage: node scripts/scrape-catalog-v3.js <store> [--all]
 * Example: node scripts/scrape-catalog-v3.js lidl
 * Example: node scripts/scrape-catalog-v3.js kaufland
 * Example: node scripts/scrape-catalog-v3.js --all
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Retete Ieftine - AI Mancare',
  },
});

const VISION_MODEL = process.env.AI_MODEL_VISION || 'google/gemini-2.5-flash-preview-05-20';
const IMAGES_DIR = path.join(process.cwd(), 'public', 'catalog-images');
const BASE_URL = 'https://cataloagedeoferte.ro';
const CDN_URL = 'https://app.cataloagedeoferte.ro';

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Store configurations
const STORES = {
  auchan: { name: 'Auchan', slug: 'auchan', color: '\x1b[31m' },
  carrefour: { name: 'Carrefour', slug: 'carrefour', color: '\x1b[34m' },
  kaufland: { name: 'Kaufland', slug: 'kaufland', color: '\x1b[31m' },
  ladoipasi: { name: 'La Doi Pași', slug: 'la-doi-pasi', color: '\x1b[33m' },
  lidl: { name: 'Lidl', slug: 'lidl', color: '\x1b[34m' },
  'mega-image': { name: 'Mega Image', slug: 'mega-image', color: '\x1b[31m' },
  metro: { name: 'Metro', slug: 'metro', color: '\x1b[34m' },
  penny: { name: 'PENNY', slug: 'penny', color: '\x1b[33m' },
  profi: { name: 'Profi', slug: 'profi', color: '\x1b[35m' },
  selgros: { name: 'Selgros', slug: 'selgros', color: '\x1b[36m' },
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

  // ANIMALE - check FIRST with specific patterns
  if (/hrană.*pisici|hrană.*câini|one.*pisici|whiskas|pedigree|felix\b|purina one|vitakraft.*pisici|vitakraft.*câini|snack.*pisici/i.test(name)) {
    return 'Animale';
  }
  // PANIFICAȚIE - check before dulciuri
  if (/pâine|franzelă|baghetă|chiflă|cozonac|lipie|croissant|gogoașă|plăcintă|patiserie|churro|saleu|chec|prăjitur|tort\b|ecler|pain.*chocolat|foi.*plăcintă/i.test(name)) {
    return 'Panificatie';
  }
  // PEȘTE & FRUCTE DE MARE - check BEFORE carne
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
  if (/apă minerală|apă plată|apă de izvor|apă.*naturală|bilbor|borsec|aqua carpatica|aquvia/i.test(name)) {
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
  // CONSERVE - check BEFORE legume & ingrediente
  if (/conserv|gogoșari|murături|compot|mazăre.*boabe|porumb|ananas.*bucăți|în oțet|oțet.*cm/i.test(name)) {
    return 'Conserve';
  }
  // LEGUME & FRUCTE
  if (/roșii|ardei|cartofi|ceapă|morcov|varză|salată|castraveți|vinete|dovlecei|spanac|usturoi|ciuperci|conopidă|broccoli|țelină|ridichi|măsline|căpșun|lămâi|lime|limes|avocado|sfeclă|apio|pomelo|grepfrut|clementine|mandarine|kaki|pere\b|struguri|prune|caise|piersici|nectarine|zmeură|mure|afine|coacăze|căpșuni|pepene|harbuz/i.test(name)) {
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
  // LACTATE - more products
  if (/kefir|sana\b/i.test(name)) {
    return 'Lactate';
  }
  // INGREDIENTE - more products
  if (/pesto|hummus|leguminoase|năut|linte|mazăre|ulei|unt.*arahide|nuci|stafide|müsli|fulgi.*ovăz|edamame/i.test(name)) {
    return 'Ingrediente';
  }
  // DULCIURI & SNACKS - more products
  if (/fursecuri|biscuiți|crackers|rondele.*orez/i.test(name)) {
    return 'Dulciuri & Snacks';
  }
  // CONGELATE - frozen foods
  if (/gyoza|pizza\b|crochete|pachețele.*primăvară|bougatsa/i.test(name)) {
    return 'Congelate';
  }
  // BAUTURI RACORITOARE - more drinks
  if (/ginger.*shot|băutură.*ovăz/i.test(name)) {
    return 'Bauturi Racoritoare';
  }

  return 'Altele';
}

/**
 * Fetch HTML content
 */
async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    };

    https.get(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Download image from URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://cataloagedeoferte.ro/',
      }
    };

    https.get(options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(filepath);
        resolve(stats.size);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

/**
 * Find latest food catalog for a store
 */
async function findLatestCatalog(storeConfig) {
  log.info(`Finding latest catalog for ${storeConfig.name}...`);

  const url = `${BASE_URL}/magazine/${storeConfig.slug}`;
  const html = await fetchHtml(url);

  // Look for catalog links - find the first one that looks like a food catalog
  // Pattern: /magazine/store/store-dd-mm-yy-dd-mm-yy-xxxxx/1
  const catalogPattern = new RegExp(`/magazine/${storeConfig.slug}/${storeConfig.slug}-[\\w-]+/1`, 'g');
  const matches = html.match(catalogPattern) || [];

  if (matches.length === 0) {
    log.error(`No catalogs found for ${storeConfig.name}`);
    return null;
  }

  // Get unique catalog IDs (remove the /1 page number)
  const uniqueCatalogs = [...new Set(matches.map(m => m.replace(/\/1$/, '')))];
  log.info(`Found ${uniqueCatalogs.length} catalogs`);

  // Return the first (newest) catalog
  const catalogPath = uniqueCatalogs[0];
  const catalogId = catalogPath.split('/').pop();

  log.info(`Selected catalog: ${catalogId}`);

  // Get catalog details (page count) from the first page
  const catalogUrl = `${BASE_URL}${catalogPath}/1`;
  const catalogHtml = await fetchHtml(catalogUrl);

  // Extract page count from HTML - look for patterns like "38 pagini" or in various formats
  let pageCount = 30; // default
  const pageMatch = catalogHtml.match(/(\d+)\s*pagin/i);
  if (pageMatch) {
    pageCount = parseInt(pageMatch[1]);
  }

  // Extract image base URL - look for CDN URL pattern
  // Pattern: https://app.cataloagedeoferte.ro/XXXXXX_XXXXXX_store_xxxxx/imageXX.webp
  const imageUrlMatch = catalogHtml.match(/https:\/\/app\.cataloagedeoferte\.ro\/([^\/]+)\/image/);
  let imageBase = null;
  if (imageUrlMatch) {
    imageBase = `${CDN_URL}/${imageUrlMatch[1]}`;
    log.info(`Image base: ${imageBase}`);
  }

  // Extract validity dates from catalog ID
  // Format: store-dd-mm-yy-dd-mm-yy-xxxxx (e.g., lidl-02-01-26-04-01-26-pxfva)
  let validFrom = new Date();
  let validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7); // Default: 1 week

  const dateMatch = catalogId.match(/(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    // Parse dates: dd-mm-yy format
    const [, d1, m1, y1, d2, m2, y2] = dateMatch;
    validFrom = new Date(2000 + parseInt(y1), parseInt(m1) - 1, parseInt(d1));
    validUntil = new Date(2000 + parseInt(y2), parseInt(m2) - 1, parseInt(d2));
    log.info(`Validity: ${validFrom.toLocaleDateString()} - ${validUntil.toLocaleDateString()}`);
  }

  return {
    id: catalogId,
    path: catalogPath,
    pageCount: pageCount,
    imageBase: imageBase,
    validFrom: validFrom,
    validUntil: validUntil,
  };
}

/**
 * Extract products from catalog page using AI
 */
async function extractProductsFromPage(imagePath, pageNum, store) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

  const prompt = `Analyze this Romanian supermarket catalog page from ${store} and extract ALL food products shown.

For EACH product, provide:
- name: Product name in Romanian (include brand if visible)
- price: Current price in RON (number only, e.g., 12.99)
- originalPrice: Original price if on sale (number only), or null
- unit: Unit of measurement (e.g., "kg", "buc", "l", "500g")

IMPORTANT:
- Extract EVERY visible food product
- Prices should be numbers only (no "lei" or currency symbols)
- If a product shows a discount, include both prices
- Skip non-food items (cleaning products, household items, electronics, toys)
- Include all meat, dairy, bread, drinks, snacks, fruits, vegetables, etc.

Return ONLY a valid JSON array, no other text:
[{"name": "...", "price": X.XX, "originalPrice": X.XX or null, "unit": "..."}]`;

  try {
    const response = await openrouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = response.choices[0].message.content.trim();

    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const products = JSON.parse(jsonStr);
    return Array.isArray(products) ? products : [];

  } catch (error) {
    log.error(`AI extraction failed for page ${pageNum}: ${error.message}`);
    return [];
  }
}

/**
 * Scrape a single store's catalog
 */
async function scrapeStore(storeKey) {
  const storeConfig = STORES[storeKey];
  if (!storeConfig) {
    log.error(`Unknown store: ${storeKey}`);
    return { products: 0 };
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log(`║     CATALOG SCRAPER v3 - ${storeConfig.name.padEnd(40)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Find latest catalog
  const catalog = await findLatestCatalog(storeConfig);
  if (!catalog) {
    return { products: 0 };
  }

  log.success(`Catalog: ${catalog.id}`);
  log.success(`Pages: ${catalog.pageCount}`);
  log.success(`Image base: ${catalog.imageBase || 'Will determine from page'}`);

  // Clear old images for this store
  log.info(`Clearing old ${storeConfig.name} catalog images...`);
  const existingFiles = fs.readdirSync(IMAGES_DIR);
  for (const file of existingFiles) {
    if (file.startsWith(`${storeKey}-`)) {
      fs.unlinkSync(path.join(IMAGES_DIR, file));
    }
  }
  log.success('Old images cleared');

  // Delete existing products for this store
  log.info(`Removing existing ${storeConfig.name} products from database...`);
  const deleted = await prisma.product.deleteMany({
    where: { store: storeConfig.name }
  });
  log.success(`Deleted ${deleted.count} existing products`);

  // If we don't have imageBase, fetch first page to determine it
  let imageBase = catalog.imageBase;
  if (!imageBase) {
    const firstPageUrl = `${BASE_URL}${catalog.path}/1`;
    const firstPageHtml = await fetchHtml(firstPageUrl);
    const imgMatch = firstPageHtml.match(/https:\/\/app\.cataloagedeoferte\.ro\/([^\/]+)\/image/);
    if (imgMatch) {
      imageBase = `${CDN_URL}/${imgMatch[1]}`;
      log.success(`Found image base: ${imageBase}`);
    } else {
      log.error('Could not determine image base URL');
      return { products: 0 };
    }
  }

  const allProducts = [];
  const seenProductNames = new Set();

  // Download and process each page (images are 0-indexed: image00, image01, etc.)
  for (let pageNum = 1; pageNum <= catalog.pageCount; pageNum++) {
    const imageIndex = String(pageNum - 1).padStart(2, '0'); // 0-indexed for image URL
    const paddedPage = String(pageNum).padStart(2, '0'); // 1-indexed for filename
    const imageUrl = `${imageBase}/image${imageIndex}.webp`;
    const filename = `${storeKey}-${catalog.id}-page-${paddedPage}.webp`;
    const filepath = path.join(IMAGES_DIR, filename);

    log.page(`Processing page ${pageNum}/${catalog.pageCount}...`);

    try {
      // Download image
      const size = await downloadImage(imageUrl, filepath);
      log.success(`Downloaded: ${filename} (${Math.round(size / 1024)}KB)`);

      // Extract products with AI
      log.ai('Analyzing with AI...');
      const products = await extractProductsFromPage(filepath, pageNum, storeConfig.name);

      if (products.length > 0) {
        log.success(`Found ${products.length} products on page ${pageNum}`);

        for (const product of products) {
          if (product.name && !seenProductNames.has(product.name.toLowerCase())) {
            seenProductNames.add(product.name.toLowerCase());

            const category = getCategory(product.name);

            const productData = {
              name: product.name,
              price: parseFloat(product.price) || 0,
              originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
              unit: product.unit || 'buc',
              category: category,
              store: storeConfig.name,
              catalogPageImage: `/catalog-images/${filename}`,
              catalogPageNumber: pageNum,
              validFrom: catalog.validFrom,
              validUntil: catalog.validUntil,
            };

            allProducts.push(productData);
            log.product(`${product.name} - ${product.price} lei [${category}]`);
          }
        }
      } else {
        log.info(`No food products on page ${pageNum} (might be non-food or ads)`);
      }

      // Small delay between pages to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));

    } catch (error) {
      log.error(`Failed page ${pageNum}: ${error.message}`);
    }
  }

  // Save products to database
  if (allProducts.length > 0) {
    log.info(`Saving ${allProducts.length} products to database...`);

    for (const product of allProducts) {
      await prisma.product.create({ data: product });
    }

    log.success(`Saved ${allProducts.length} products to database`);
  }

  return { products: allProducts.length };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/scrape-catalog-v3.js <store> [--all]');
    console.log('');
    console.log('Available stores:');
    Object.entries(STORES).forEach(([key, store]) => {
      console.log(`  ${key.padEnd(15)} ${store.name}`);
    });
    console.log('');
    console.log('Options:');
    console.log('  --all          Scrape all stores');
    return;
  }

  const results = {};

  if (args.includes('--all')) {
    // Scrape all stores
    for (const storeKey of Object.keys(STORES)) {
      try {
        const result = await scrapeStore(storeKey);
        results[storeKey] = result.products;
      } catch (error) {
        log.error(`Failed to scrape ${storeKey}: ${error.message}`);
        results[storeKey] = 0;
      }
    }
  } else {
    // Scrape single store
    const storeKey = args[0].toLowerCase();
    if (!STORES[storeKey]) {
      log.error(`Unknown store: ${storeKey}`);
      log.info(`Available stores: ${Object.keys(STORES).join(', ')}`);
      return;
    }

    const result = await scrapeStore(storeKey);
    results[storeKey] = result.products;
  }

  // Print final summary
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     SCRAPING COMPLETE                                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const products = await prisma.product.findMany();
  log.success(`Total products in database: ${products.length}`);

  // Count by store
  const byStore = {};
  products.forEach(p => {
    byStore[p.store] = (byStore[p.store] || 0) + 1;
  });

  console.log('\nBy store:');
  Object.entries(byStore).sort((a, b) => b[1] - a[1]).forEach(([store, count]) => {
    console.log(`  ${store.padEnd(20)} ${count}`);
  });

  // Count by category
  const byCategory = {};
  products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  console.log('\nBy category:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(25)} ${count}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
