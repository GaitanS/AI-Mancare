#!/usr/bin/env node

/**
 * Kaufland Catalog Scraper - Direct CDN Download
 * Downloads original high-quality images directly from CDN
 * Pattern discovered: https://eu.leafletscdns.com/ro/data/3/{catalogId}/{pageNum}.jpg
 */

require('dotenv').config();
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
 * Download image from URL with retries
 */
function downloadImage(url, filepath, retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptDownload = (attemptsLeft) => {
      const file = fs.createWriteStream(filepath);

      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
          'Referer': 'https://www.catalomat.ro/',
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          try { fs.unlinkSync(filepath); } catch (e) {}
          const redirectUrl = response.headers.location;
          return downloadImage(redirectUrl, filepath, attemptsLeft).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(filepath); } catch (e) {}
          if (attemptsLeft > 1) {
            setTimeout(() => attemptDownload(attemptsLeft - 1), 1000);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            // Check file size
            const stats = fs.statSync(filepath);
            if (stats.size < 5000) {
              // Too small, probably an error
              if (attemptsLeft > 1) {
                try { fs.unlinkSync(filepath); } catch (e) {}
                setTimeout(() => attemptDownload(attemptsLeft - 1), 1000);
              } else {
                reject(new Error('File too small'));
              }
            } else {
              resolve({ filepath, size: stats.size });
            }
          });
        });
      }).on('error', (err) => {
        file.close();
        try { fs.unlinkSync(filepath); } catch (e) {}
        if (attemptsLeft > 1) {
          setTimeout(() => attemptDownload(attemptsLeft - 1), 1000);
        } else {
          reject(err);
        }
      });
    };

    attemptDownload(retries);
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
async function scrapeCatalog(catalogId, storeDataId, totalPages) {
  log.info(`\nStarting catalog scrape`);
  log.info(`Catalog ID: ${catalogId}, Store Data ID: ${storeDataId}, Total pages: ${totalPages}\n`);

  const allProducts = [];
  const seenProductNames = new Set();
  const catalogName = `kaufland-${catalogId}`;

  // The CDN URL pattern discovered from exploration
  // Original: https://eu.leafletscdns.com/ro/data/3/51887/0.jpg
  // With thumbor for quality: https://eu.leafletscdns.com/thumbor/.../ro/data/3/51887/0.jpg

  // Try different URL patterns
  const urlPatterns = [
    // Direct CDN (highest quality)
    (page) => `https://eu.leafletscdns.com/ro/data/${storeDataId}/${catalogId}/${page}.jpg`,
    // With quality filter but larger size
    (page) => `https://eu.leafletscdns.com/thumbor/unsafe/1200x0/filters:format(jpg):quality(90)/ro/data/${storeDataId}/${catalogId}/${page}.jpg`,
    // Alternative patterns
    (page) => `https://eu.leafletscdns.com/thumbor/unsafe/0x0/filters:format(jpg):quality(85)/ro/data/${storeDataId}/${catalogId}/${page}.jpg`,
  ];

  // Test which URL pattern works
  let workingPattern = null;
  for (const pattern of urlPatterns) {
    const testUrl = pattern(0);
    log.info(`Testing URL pattern: ${testUrl.substring(0, 80)}...`);

    try {
      const testPath = path.join(IMAGES_DIR, 'test.jpg');
      await downloadImage(testUrl, testPath);
      const stats = fs.statSync(testPath);
      if (stats.size > 10000) {
        workingPattern = pattern;
        log.success(`Pattern works! File size: ${Math.round(stats.size / 1024)}KB`);
        fs.unlinkSync(testPath);
        break;
      }
      fs.unlinkSync(testPath);
    } catch (e) {
      log.info(`Pattern failed: ${e.message}`);
    }
  }

  if (!workingPattern) {
    log.error('No working URL pattern found!');
    return [];
  }

  // Download and process each page
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const displayPage = pageNum + 1;
    log.page(`Processing page ${displayPage}/${totalPages}...`);

    const imageUrl = workingPattern(pageNum);
    const filename = `${catalogName}-page-${String(displayPage).padStart(2, '0')}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);

    try {
      // Download image
      const result = await downloadImage(imageUrl, filepath);
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

      log.info(`   Total unique: ${allProducts.length} products\n`);

      // Small delay between requests
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      log.error(`Failed page ${displayPage}: ${error.message}`);
    }
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
  console.log('║     KAUFLAND CATALOG SCRAPER - DIRECT CDN DOWNLOAD               ║');
  console.log('║     High quality original images                                 ║');
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

  // Catalog configuration
  // From the exploration, we found:
  // Store data ID: 3 (for Kaufland)
  // Catalog ID: 51887
  // Pages: 0-51 (52 total)
  const catalogId = '51887';
  const storeDataId = '3';
  const totalPages = 52;

  // Scrape
  const products = await scrapeCatalog(catalogId, storeDataId, totalPages);

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
