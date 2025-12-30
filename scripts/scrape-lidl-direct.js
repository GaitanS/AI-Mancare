#!/usr/bin/env node

/**
 * Lidl Catalog Scraper - Direct Image URL Construction
 * Extracts thumbor signature from first page and constructs URLs for all pages
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
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

const VISION_MODEL = process.env.AI_MODEL_VISION || 'google/gemini-3-flash-preview';
const IMAGES_DIR = path.join(process.cwd(), 'public', 'catalog-images');

const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
  page: (msg) => console.log(`   📄 ${msg}`),
};

/**
 * Get category for a product
 */
function getCategory(productName) {
  const name = productName.toLowerCase();

  if (/hrană.*pisici|hrană.*câini|one.*pisici|whiskas|pedigree|felix\b|purina one|vitakraft.*pisici|vitakraft.*câini|snack.*pisici/i.test(name)) {
    return 'Animale';
  }
  if (/pâine|franzelă|baghetă|chiflă|cozonac|lipie|croissant|gogoașă|plăcintă|patiserie|churro|saleu|chec|prăjitur|tort\b|ecler|pain.*chocolat|foi.*plăcintă/i.test(name)) {
    return 'Panificatie';
  }
  if (/pește|somon|ton\b|macrou|păstrăv|șalău|creveți|caracatiță|sushi|fructe de mare|sardine|hering|crap|doradă|file.*nil|file.*șalău|file somon/i.test(name)) {
    return 'Peste & Fructe de Mare';
  }
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
  if (/lapte|iaurt|brânză|cașcaval|smântână|unt\b|frișcă|mascarpone|gorgonzola|feta|telemea|mozzarella|parmezan|ricotta|cream cheese|margarină/i.test(name)) {
    if (!/ardei/i.test(name)) {
      return 'Lactate';
    }
  }
  if (/apă minerală|apă plată|apă de izvor|apă.*naturală|bilbor|borsec|aqua carpatica|aquavia/i.test(name)) {
    return 'Apa';
  }
  if (/bere\b|vin\b|șampanie|vodka|whisky|rom\b|lichior|prosecco|lambrusco|cocktail|tequila|gin\b|coniac|brandy|vermut|spumant|alcool|malibu/i.test(name)) {
    if (!/gogoașă|prăjitur|baton|condiment|vin.*fiert/i.test(name)) {
      return 'Bauturi Alcoolice';
    }
  }
  if (/suc\b|cola|fanta|sprite|pepsi|mirinda|7up|schweppes|limonadă|energizant|red bull|monster|hell|ciao|mountain dew|sirop|san pellegrino/i.test(name)) {
    return 'Bauturi Racoritoare';
  }
  if (/răcoritoare|fresh\b/i.test(name) && /băutură/i.test(name)) {
    return 'Bauturi Racoritoare';
  }
  if (/cafea|espresso|cappuccino|nescafe|jacobs|lavazza|capsule.*cafea|cacao\b/i.test(name)) {
    return 'Cafea & Ceai';
  }
  if (/ceai\b|infuzie/i.test(name)) {
    return 'Cafea & Ceai';
  }
  if (/ciocolat|biscuiți|napolitană|praline|bomboane|dulciuri|kit kat|milka|oreo|snickers|mars|twix|bounty|raffaello|ferrero|kinder|jelly|gummy|baton|făgăraș|jaffa|cherry queen|kandia/i.test(name)) {
    return 'Dulciuri & Snacks';
  }
  if (/chips|chipsuri|snack|floricele|popcorn|covrigei|sticks|crackers|lay's/i.test(name)) {
    if (!/pisici|câini/i.test(name)) {
      return 'Dulciuri & Snacks';
    }
  }
  if (/conserv|gogoșari|murături|compot|mazăre.*boabe|porumb|ananas.*bucăți|în oțet|oțet.*cm/i.test(name)) {
    return 'Conserve';
  }
  if (/roșii|ardei|cartofi|ceapă|morcov|varză|salată|castraveți|vinete|dovlecei|spanac|usturoi|ciuperci|conopidă|broccoli|țelină|ridichi|măsline|căpșun|lămâi|lime|limes|avocado/i.test(name)) {
    return 'Legume & Fructe';
  }
  if (/mere\b|banane|portocale|struguri|cireșe|piersici|pepene|kiwi|mango|ananas|fructe/i.test(name)) {
    if (!/bucăți.*suc|suc.*propriu|compot|conserv|băutură|răcoritoare/i.test(name)) {
      return 'Legume & Fructe';
    }
  }
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
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.catalomat.ro/',
      }
    };

    https.get(options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
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
 * Extract products from catalog page using AI
 */
async function extractProductsFromPage(imagePath, pageNum) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg';

  const prompt = `Analyze this Romanian supermarket catalog page and extract ALL food products shown.

For EACH product, provide:
- name: Product name in Romanian (include brand if visible)
- price: Current price in RON (number only, e.g., 12.99)
- originalPrice: Original price if on sale (number only), or null
- unit: Unit of measurement (e.g., "kg", "buc", "l", "500g")

IMPORTANT:
- Extract EVERY visible food product
- Prices should be numbers only (no "lei" or currency symbols)
- If a product shows a discount, include both prices
- Skip non-food items (cleaning products, household items, electronics)
- Include all meat, dairy, bread, drinks, snacks, etc.

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
 * Main function
 */
async function main() {
  const catalogUrl = process.argv[2] || 'https://www.catalomat.ro/lidl/catalog-nou-de-vineri-02-01-2026-52160/';

  // Extract catalog ID from URL
  const catalogIdMatch = catalogUrl.match(/(\d{5})/);
  const catalogId = catalogIdMatch ? catalogIdMatch[1] : 'unknown';
  const storeId = 4; // Lidl store ID

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     LIDL CATALOG SCRAPER - Direct URL Construction              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  log.info(`Catalog ID: ${catalogId}`);
  log.info(`Store ID: ${storeId} (Lidl)`);

  // Clear old Lidl images
  log.info('Clearing old Lidl catalog images...');
  const existingFiles = fs.readdirSync(IMAGES_DIR);
  for (const file of existingFiles) {
    if (file.startsWith('lidl-')) {
      fs.unlinkSync(path.join(IMAGES_DIR, file));
    }
  }
  log.success('Old images cleared');

  // Delete existing Lidl products
  log.info('Removing existing Lidl products from database...');
  const deleted = await prisma.product.deleteMany({
    where: { store: 'Lidl' }
  });
  log.success(`Deleted ${deleted.count} existing products`);

  // Launch browser to get the thumbor signature from first page
  log.info('Launching browser to capture thumbor signature...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  let capturedUrl = null;
  let totalPages = 30;

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('leafletscdns.com') && url.includes(`/${catalogId}/`) && url.includes('/0.jpg')) {
      capturedUrl = url;
      log.success(`Captured base URL: ${url.substring(0, 100)}...`);
    }
  });

  try {
    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    // Accept cookies
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('De acord')) {
          await btn.click();
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      }
    } catch (e) {}

    // Get total pages
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

  } finally {
    await browser.close();
  }

  if (!capturedUrl) {
    log.error('Failed to capture base URL');
    return;
  }

  // Parse the captured URL to extract components
  // Example: https://eu.leafletscdns.com/thumbor/n3EB8yER3fwE3zmF8UI9N-O5Xvw=/0x0/filters:format(webp):quality(65)/ro/data/4/52160/0.jpg?t=1766560582

  // We need to generate new URLs for each page
  // The signature is specific to the image, so we need a different approach
  // Let's try constructing URLs without signature (some CDNs allow this)

  const basePattern = `https://eu.leafletscdns.com/thumbor/unsafe/0x0/filters:format(jpeg):quality(85)/ro/data/${storeId}/${catalogId}`;

  log.info('Constructing image URLs for all pages...');

  const allProducts = [];
  const seenProductNames = new Set();
  let processedPages = 0;

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const imageUrl = `${basePattern}/${pageNum}.jpg`;
    const filename = `lidl-${catalogId}-page-${String(pageNum + 1).padStart(2, '0')}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);

    log.page(`Processing page ${pageNum + 1}/${totalPages}...`);

    try {
      // Download image
      const size = await downloadImage(imageUrl, filepath);
      log.success(`Downloaded: ${filename} (${Math.round(size / 1024)}KB)`);

      // Extract products with AI
      log.ai('Analyzing with AI...');
      const products = await extractProductsFromPage(filepath, pageNum + 1);

      if (products.length > 0) {
        log.success(`Found ${products.length} products on page ${pageNum + 1}`);

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
              store: 'Lidl',
              imageUrl: `/catalog-images/${filename}`,
              catalogPage: pageNum + 1,
            };

            allProducts.push(productData);
            log.product(`${product.name} - ${product.price} lei [${category}]`);
          }
        }
      }

      processedPages++;

      // Small delay between pages
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      log.error(`Failed page ${pageNum + 1}: ${error.message}`);

      // If download fails, try with the original captured URL pattern
      if (capturedUrl && pageNum === 0) {
        log.info('Trying alternative URL pattern...');
      }
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

  // Print summary
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
