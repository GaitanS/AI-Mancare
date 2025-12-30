#!/usr/bin/env node

/**
 * Kaufland Catalog Scraper - Extract Original Images
 * Opens each catalog page and extracts the original image URL
 * Downloads clean images without any overlays or popups
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.catalomat.ro/',
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        file.close();
        fs.unlinkSync(filepath);
        return downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
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
 * Scrape catalog by extracting original image URLs
 */
async function scrapeCatalog(catalogUrl, catalogId) {
  log.info(`\nStarting catalog scrape: ${catalogUrl}`);
  log.info(`Catalog ID: ${catalogId}\n`);

  const browser = await puppeteer.launch({
    headless: false, // Need to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1600, height: 1000 });

  const allProducts = [];
  const seenProductNames = new Set();
  const catalogName = `kaufland-${catalogId}`;
  let totalPages = 52;

  try {
    // Navigate to catalog
    log.info('Opening catalog page...');
    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // Handle cookie consent
    log.info('Handling cookie consent...');
    try {
      // Wait for and click "De acord și închide" button
      await page.waitForSelector('button', { timeout: 5000 });

      const accepted = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('De acord') || btn.textContent.includes('Accept')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (accepted) {
        log.success('Cookie consent accepted');
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      log.info('No cookie dialog found or already accepted');
    }

    // Get total pages from the page indicator (e.g., "1/52")
    try {
      const pageInfo = await page.evaluate(() => {
        const pageIndicators = document.querySelectorAll('*');
        for (const el of pageIndicators) {
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
        log.success(`Found ${totalPages} total pages`);
      }
    } catch (e) {
      log.info(`Using default ${totalPages} pages`);
    }

    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      log.page(`Processing page ${pageNum}/${totalPages}...`);

      // Wait for page to load
      await new Promise(r => setTimeout(r, 1500));

      // Find the main catalog image and get its source URL
      // We'll intercept network requests to find the image URL
      let imageUrl = null;

      // Method 1: Find the image element directly and get its src
      imageUrl = await page.evaluate(() => {
        // Look for the main catalog image in the viewer
        const selectors = [
          '.leaflet-page img',
          '.catalog-page img',
          '.page-image img',
          '[class*="page"] img[src*="leaflet"]',
          '[class*="page"] img[src*="cdn"]',
          'img[src*="leafletscdns"]',
          'img[src*="catalomat"]',
          '.ipaper-page img',
          'canvas', // Sometimes it's a canvas
        ];

        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.src) {
            return el.src;
          }
        }

        // Look in iframes
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const img = iframeDoc.querySelector('img[src*="cdn"], img[src*="leaflet"]');
            if (img && img.src) {
              return img.src;
            }
          } catch (e) {}
        }

        // Find any large image
        const allImages = document.querySelectorAll('img');
        for (const img of allImages) {
          if (img.width > 400 && img.height > 400 && img.src && !img.src.includes('logo')) {
            return img.src;
          }
        }

        return null;
      });

      // Method 2: Right-click context menu approach - simulate opening in new tab
      if (!imageUrl) {
        // Get all image URLs from network requests
        const imageUrls = await page.evaluate(() => {
          const performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;
          if (performance && performance.getEntriesByType) {
            const resources = performance.getEntriesByType('resource');
            return resources
              .filter(r => r.initiatorType === 'img' && (r.name.includes('cdn') || r.name.includes('leaflet')))
              .map(r => r.name);
          }
          return [];
        });

        if (imageUrls.length > 0) {
          imageUrl = imageUrls[imageUrls.length - 1]; // Get the most recent
        }
      }

      // Method 3: Construct the URL based on known pattern
      if (!imageUrl) {
        // Common CDN patterns for catalog images
        const possibleUrls = [
          `https://eu.leafletscdns.com/ro/data/1/${catalogId}/${pageNum}.jpg`,
          `https://eu.leafletscdns.com/ro/data/2/${catalogId}/${pageNum}.jpg`,
          `https://eu.leafletscdns.com/ro/data/3/${catalogId}/${pageNum}.jpg`,
          `https://cdn.catalomat.ro/catalogs/${catalogId}/pages/${pageNum}.jpg`,
        ];

        // Test each URL
        for (const testUrl of possibleUrls) {
          try {
            const response = await page.evaluate(async (url) => {
              try {
                const res = await fetch(url, { method: 'HEAD' });
                return res.ok;
              } catch {
                return false;
              }
            }, testUrl);

            if (response) {
              imageUrl = testUrl;
              break;
            }
          } catch (e) {}
        }
      }

      // If we found an image URL, download it
      let imageBase64 = null;
      const filename = `${catalogName}-page-${String(pageNum).padStart(2, '0')}.jpg`;
      const filepath = path.join(IMAGES_DIR, filename);

      if (imageUrl) {
        log.page(`Found image URL: ${imageUrl.substring(0, 80)}...`);

        try {
          await downloadImage(imageUrl, filepath);
          imageBase64 = fs.readFileSync(filepath).toString('base64');
          log.success(`Downloaded: ${filename} (${Math.round(fs.statSync(filepath).size / 1024)}KB)`);
        } catch (e) {
          log.error(`Failed to download: ${e.message}`);
        }
      }

      // Fallback: Take a screenshot of just the catalog area (not the whole page)
      if (!imageBase64) {
        log.info('Falling back to screenshot method...');

        // Try to find and screenshot just the catalog element
        const catalogElement = await page.$('.leaflet-container, .catalog-viewer, .ipaper-container, [class*="catalog"]');

        if (catalogElement) {
          const screenshotBuffer = await catalogElement.screenshot({
            type: 'jpeg',
            quality: 90,
          });
          fs.writeFileSync(filepath, screenshotBuffer);
          imageBase64 = screenshotBuffer.toString('base64');
          log.page(`Screenshot saved: ${filename}`);
        } else {
          // Last resort: full page screenshot with popup handling
          // First try to close any popups
          await page.evaluate(() => {
            const popups = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="dialog"], [class*="overlay"]');
            popups.forEach(p => {
              if (p.style) p.style.display = 'none';
            });
          });

          await new Promise(r => setTimeout(r, 500));

          const screenshot = await page.screenshot({
            encoding: 'base64',
            type: 'jpeg',
            quality: 90,
            clip: {
              x: 200, // Crop to avoid sidebars
              y: 100,
              width: 900,
              height: 700,
            }
          });

          fs.writeFileSync(filepath, Buffer.from(screenshot, 'base64'));
          imageBase64 = screenshot;
          log.page(`Cropped screenshot saved: ${filename}`);
        }
      }

      // Extract products with AI
      if (imageBase64) {
        const products = await extractProductsFromImage(imageBase64, pageNum, catalogName);

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
      }

      // Navigate to next page - click on the right side of the catalog
      try {
        // Method 1: Click right arrow/next button
        await page.evaluate(() => {
          const nextBtns = document.querySelectorAll('[class*="next"], [class*="right"], [class*="forward"], .arrow-right, [aria-label*="next"]');
          for (const btn of nextBtns) {
            if (btn.offsetParent !== null) {
              btn.click();
              return true;
            }
          }
          return false;
        });

        // Method 2: Click on the right side of the page
        await page.mouse.click(1400, 500);

        // Method 3: Press arrow key
        await page.keyboard.press('ArrowRight');

      } catch (e) {}

      // Wait between pages
      await new Promise(r => setTimeout(r, 2000));
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
  console.log('║     KAUFLAND CATALOG SCRAPER - ORIGINAL IMAGES                   ║');
  console.log('║     Extract clean catalog page images                            ║');
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

  // Scrape
  const products = await scrapeCatalog(catalogUrl, catalogId);

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
