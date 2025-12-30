#!/usr/bin/env node

/**
 * Kaufland Catalog Scraper - Direct CDN Download
 * Downloads images directly from eu.leafletscdns.com at max quality
 * No cookies popups, no screenshots - pure catalog images
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
  download: (msg) => console.log(`   ⬇️  ${msg}`),
};

/**
 * Download image from URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
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
 * Get catalog info from catalomat page
 */
async function getCatalogInfo(browser, catalogUrl) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  log.info(`Getting catalog info from: ${catalogUrl}`);

  try {
    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait a bit for page to load
    await new Promise(r => setTimeout(r, 3000));

    // Extract catalog ID and total pages from the page
    const catalogInfo = await page.evaluate(() => {
      // Look for image URLs in the page that contain the CDN pattern
      const images = document.querySelectorAll('img');
      let catalogId = null;

      for (const img of images) {
        const src = img.src || '';
        // Pattern: /ro/data/3/51887/0.jpg where 51887 is the catalog ID
        const match = src.match(/\/ro\/data\/\d+\/(\d+)\/(\d+)\./);
        if (match) {
          catalogId = match[1];
          break;
        }
      }

      // Also check for iframes
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        const src = iframe.src || '';
        const match = src.match(/\/ro\/data\/\d+\/(\d+)\//);
        if (match) {
          catalogId = match[1];
          break;
        }
      }

      // Try to find page count indicator (e.g., "1 / 52")
      const pageText = document.body.innerText;
      const pageMatch = pageText.match(/(\d+)\s*\/\s*(\d+)/);
      let totalPages = 52; // default
      if (pageMatch) {
        totalPages = parseInt(pageMatch[2]);
      }

      // Get catalog title
      const title = document.title || '';

      return { catalogId, totalPages, title };
    });

    // If we didn't find the ID, try to get it from network requests
    if (!catalogInfo.catalogId) {
      // Navigate to iframe if exists
      const iframeSrc = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : null;
      });

      if (iframeSrc) {
        await page.goto(iframeSrc, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000));

        // Try again to find catalog ID
        const iframeInfo = await page.evaluate(() => {
          const images = document.querySelectorAll('img');
          for (const img of images) {
            const src = img.src || img.dataset?.src || '';
            const match = src.match(/\/ro\/data\/\d+\/(\d+)\/(\d+)\./);
            if (match) {
              return { catalogId: match[1] };
            }
          }

          // Check page source for patterns
          const html = document.documentElement.outerHTML;
          const match = html.match(/\/ro\/data\/\d+\/(\d+)\//);
          if (match) {
            return { catalogId: match[1] };
          }

          return { catalogId: null };
        });

        if (iframeInfo.catalogId) {
          catalogInfo.catalogId = iframeInfo.catalogId;
        }
      }
    }

    await page.close();
    return catalogInfo;

  } catch (error) {
    log.error(`Error getting catalog info: ${error.message}`);
    await page.close();
    return null;
  }
}

/**
 * Download all pages of a catalog from CDN
 */
async function downloadCatalogPages(catalogId, catalogName, totalPages) {
  log.info(`\nDownloading ${totalPages} pages for catalog ${catalogId}...`);

  const downloadedPages = [];
  const safeName = catalogName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    // CDN URL pattern - quality 100 for max resolution
    const cdnUrl = `https://eu.leafletscdns.com/thumbor/0x0/filters:format(webp):quality(100)/ro/data/3/${catalogId}/${pageNum}.jpg`;
    const filename = `kaufland-${safeName}-${catalogId}-page-${String(pageNum + 1).padStart(2, '0')}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);

    try {
      // Try webp first, then jpg
      let downloaded = false;

      // Try direct JPG URL (simpler pattern)
      const jpgUrl = `https://eu.leafletscdns.com/ro/data/3/${catalogId}/${pageNum}.jpg`;

      try {
        await downloadImage(jpgUrl, filepath);
        downloaded = true;
        log.download(`Page ${pageNum + 1}: ${filename}`);
      } catch (e) {
        // Try with thumbor
        try {
          const thumborUrl = `https://eu.leafletscdns.com/thumbor/800x0/filters:format(jpg):quality(90)/ro/data/3/${catalogId}/${pageNum}.jpg`;
          await downloadImage(thumborUrl, filepath);
          downloaded = true;
          log.download(`Page ${pageNum + 1}: ${filename} (thumbor)`);
        } catch (e2) {
          log.error(`Failed to download page ${pageNum + 1}`);
        }
      }

      if (downloaded) {
        downloadedPages.push({
          pageNum: pageNum + 1,
          filepath,
          relativePath: `/catalog-images/${filename}`,
        });
      }

      // Small delay between downloads
      await new Promise(r => setTimeout(r, 100));

    } catch (error) {
      log.error(`Error downloading page ${pageNum + 1}: ${error.message}`);
    }
  }

  log.success(`Downloaded ${downloadedPages.length}/${totalPages} pages`);
  return downloadedPages;
}

/**
 * Process downloaded images with AI
 */
async function processImagesWithAI(pages, catalogName) {
  log.info(`\nProcessing ${pages.length} pages with AI...`);

  const allProducts = [];
  const seenProductNames = new Set();

  for (const page of pages) {
    try {
      // Read image file
      const imageBuffer = fs.readFileSync(page.filepath);
      const imageBase64 = imageBuffer.toString('base64');

      // Extract products with AI
      const products = await extractProductsFromImage(imageBase64, page.pageNum, catalogName);

      // Add products with page info
      for (const product of products) {
        if (!product.name || !product.price) continue;

        const normalizedName = product.name.toLowerCase().trim();
        if (!seenProductNames.has(normalizedName)) {
          seenProductNames.add(normalizedName);
          allProducts.push({
            ...product,
            catalogPageNumber: page.pageNum,
            catalogPageImage: page.relativePath,
            catalogName,
          });
          log.product(`${product.name} - ${product.price} lei ${product.is_vitrina ? '(vitrină)' : ''}`);
        }
      }

      log.info(`   Running total: ${allProducts.length} unique products\n`);

      // Rate limiting for AI API
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      log.error(`Error processing page ${page.pageNum}: ${error.message}`);
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

      // Skip obviously non-food items
      if (/telefon|tv|laptop|frigider|aragaz|aspirator|samsung|iphone|tablet|smartphone|mașină|detergent|șampon/i.test(product.name)) {
        continue;
      }

      // Normalize category
      let category = product.category || 'Altele';

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
      if (!e.message.includes('Unique constraint')) {
        // log.error(`Save error: ${e.message}`);
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
  console.log('║     KAUFLAND CATALOG SCRAPER - CDN DIRECT DOWNLOAD               ║');
  console.log('║     High quality images, no popups                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  log.info(`Using AI Model: ${VISION_MODEL}`);
  log.info(`Images directory: ${IMAGES_DIR}\n`);

  // Clear old images
  log.info('Clearing old catalog images...');
  const oldFiles = fs.readdirSync(IMAGES_DIR);
  for (const file of oldFiles) {
    if (file.endsWith('.jpg') || file.endsWith('.webp')) {
      fs.unlinkSync(path.join(IMAGES_DIR, file));
    }
  }
  log.success('Old images cleared\n');

  // Reset database
  log.info('Resetting database...');
  await prisma.product.deleteMany({});
  log.success('Database cleared\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const allProducts = [];

  try {
    // Catalog URLs to process
    const catalogUrls = [
      'https://www.catalomat.ro/kaufland/catalog-nou-de-miercuri-24-12-2025-51887/',
      // Add more catalog URLs here if needed
    ];

    for (const catalogUrl of catalogUrls) {
      log.info(`\n${'='.repeat(70)}`);
      log.info(`Processing: ${catalogUrl}`);
      log.info('='.repeat(70));

      // Get catalog info
      const info = await getCatalogInfo(browser, catalogUrl);

      if (!info || !info.catalogId) {
        log.error('Could not find catalog ID, trying manual extraction...');

        // Extract ID from URL pattern
        const urlMatch = catalogUrl.match(/-(\d+)\/?$/);
        if (urlMatch) {
          info.catalogId = urlMatch[1];
          info.totalPages = 52; // default
          log.info(`Extracted catalog ID from URL: ${info.catalogId}`);
        } else {
          log.error('Could not determine catalog ID, skipping...');
          continue;
        }
      }

      log.success(`Catalog ID: ${info.catalogId}`);
      log.success(`Total pages: ${info.totalPages}`);
      log.success(`Title: ${info.title || 'Kaufland Catalog'}`);

      // Download pages from CDN
      const pages = await downloadCatalogPages(
        info.catalogId,
        info.title || 'kaufland',
        info.totalPages
      );

      if (pages.length === 0) {
        log.error('No pages downloaded, skipping...');
        continue;
      }

      // Process with AI
      const products = await processImagesWithAI(pages, info.title || catalogUrl);
      allProducts.push(...products);

      log.success(`Catalog complete: ${products.length} products extracted`);
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
  log.info('='.repeat(70));

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
