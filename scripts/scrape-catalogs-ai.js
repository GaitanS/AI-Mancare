#!/usr/bin/env node

/**
 * Catalog Scraper with AI Vision
 * Scrapes catalog pages from catalomat.ro and extracts products using Gemini Vision
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

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
  info: (msg) => console.log(`[SCRAPER] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
};

/**
 * Extract products from image using Gemini Vision
 */
async function extractProductsFromImage(imageBase64, storeName, pageNum) {
  log.ai(`Analyzing page ${pageNum} with Gemini Vision...`);

  const systemPrompt = `Ești un expert în extragerea de date din cataloage de supermarket românești.

TASK: Analizează imaginea catalogului și extrage informații despre TOATE produsele ALIMENTARE vizibile.

OUTPUT FORMAT (JSON STRICT):
{
  "products": [
    {
      "name": "string (nume complet produs, include greutatea dacă e vizibilă)",
      "brand": "string sau null",
      "price": number (preț ACTUAL în lei, ex: 10.99),
      "unit": "string (kg, g, L, ml, buc, pachet)",
      "original_price": number sau null (preț VECHI/barat dacă există),
      "discount_percentage": number sau null (procentul de reducere dacă e vizibil),
      "category": "string (una din: Carne, Mezeluri, Lactate, Legume, Fructe, Pâine, Paste, Orez, Conserve, Condimente, Băuturi, Dulciuri, Snacks, Congelate, Altele)",
      "confidence": number (0.0-1.0, cât de sigur ești de extracție)
    }
  ]
}

REGULI IMPORTANTE:
1. Extrage DOAR produse alimentare (ignoră: electrocasnice, haine, cosmetice, detergenți)
2. Prețurile sunt în LEI (RON)
3. Prețul cu reducere e de obicei mai mare și colorat (roșu/galben)
4. Prețul vechi e barat sau mai mic
5. Dacă vezi "-30%" sau similar, completează discount_percentage
6. Include greutatea în nume: "Piept de pui 1kg", "Lapte 1L"
7. Returnează DOAR JSON valid, fără explicații
8. Dacă nu găsești produse alimentare, returnează {"products": []}`;

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
              text: `Extrage TOATE produsele ALIMENTARE din această pagină de catalog ${storeName}. Fii atent la prețuri și reduceri. Returnează DOAR JSON valid.`,
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return [];
    }

    // Clean JSON
    const jsonContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonContent);
    const products = parsed.products || [];

    log.success(`Page ${pageNum}: Found ${products.length} food products`);
    return products;

  } catch (error) {
    log.error(`AI extraction failed for page ${pageNum}: ${error.message}`);
    return [];
  }
}

/**
 * Scrape catalog pages from catalomat.ro
 */
async function scrapeCatalogPages(browser, store) {
  const storeUrls = {
    kaufland: 'https://www.catalomat.ro/kaufland/',
    lidl: 'https://www.catalomat.ro/lidl/',
    penny: 'https://www.catalomat.ro/penny/',
    carrefour: 'https://www.catalomat.ro/carrefour/',
    auchan: 'https://www.catalomat.ro/auchan/',
    mega: 'https://www.catalomat.ro/mega-image/',
    profi: 'https://www.catalomat.ro/profi/',
  };

  const url = storeUrls[store.toLowerCase()];
  if (!url) {
    log.error(`Unknown store: ${store}`);
    return [];
  }

  log.info(`Scraping ${store} catalog from catalomat.ro...`);
  const screenshots = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1400, height: 1800 });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler, [class*="cookie"] button, .accept-cookies');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));

    // Find and click on the first/latest catalog
    try {
      // Look for catalog links
      const catalogLink = await page.$('a[href*="/catalog"], .catalog-link, .brochure-link, a.lazyloadBrochure');
      if (catalogLink) {
        await catalogLink.click();
        await new Promise(r => setTimeout(r, 4000));
      }
    } catch (e) {
      log.info('Could not find catalog link, trying direct approach');
    }

    // Now we should be in the catalog viewer
    // Take screenshots of multiple pages
    const maxPages = 15; // Get up to 15 pages

    for (let i = 0; i < maxPages; i++) {
      try {
        await new Promise(r => setTimeout(r, 2000));

        // Take screenshot of current page
        const screenshot = await page.screenshot({
          encoding: 'base64',
          type: 'jpeg',
          quality: 90,
          fullPage: false,
        });

        screenshots.push({
          base64: screenshot,
          pageNumber: i + 1,
        });

        log.success(`Screenshot page ${i + 1} captured`);

        // Try to navigate to next page
        // Try various navigation methods
        const nextSelectors = [
          '.next-page',
          '.arrow-right',
          '[class*="next"]',
          '[class*="right"]',
          'button[aria-label*="next"]',
          '.page-nav-right',
          '#nextPage',
        ];

        let navigated = false;
        for (const selector of nextSelectors) {
          try {
            const nextBtn = await page.$(selector);
            if (nextBtn) {
              await nextBtn.click();
              navigated = true;
              break;
            }
          } catch (e) {}
        }

        // If no button found, try keyboard
        if (!navigated) {
          await page.keyboard.press('ArrowRight');
        }

        await new Promise(r => setTimeout(r, 1500));

      } catch (e) {
        log.error(`Error on page ${i + 1}: ${e.message}`);
        break;
      }
    }

    await page.close();

  } catch (error) {
    log.error(`Scraping failed: ${error.message}`);
  }

  return screenshots;
}

/**
 * Alternative: Get catalog images directly from CDN
 */
async function getCatalogImagesFromCDN(browser, store) {
  log.info(`Getting ${store} catalog images from CDN...`);
  const images = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Go to catalomat page
    const url = `https://www.catalomat.ro/${store.toLowerCase()}/`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2000));

    // Click on first catalog to open it
    try {
      await page.click('a[href*="catalog"], .catalog-item a');
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {}

    // Collect all catalog page image URLs
    const imageUrls = await page.evaluate(() => {
      const urls = [];

      // Try to find catalog page images
      const imgElements = document.querySelectorAll('img[src*="leaflets"], img[data-src*="leaflets"], img[src*="catalog"], img[data-src*="catalog"]');
      imgElements.forEach(img => {
        const src = img.src || img.dataset.src;
        if (src && src.includes('http')) {
          // Get high-res version
          const highRes = src.replace(/\/\d+x\d+\//, '/800x0/').replace('240x240', '800x0');
          if (!urls.includes(highRes)) {
            urls.push(highRes);
          }
        }
      });

      // Also check for page navigation
      const pageLinks = document.querySelectorAll('[data-page], .page-thumb img');
      pageLinks.forEach(el => {
        const src = el.src || el.dataset.src || el.dataset.image;
        if (src && src.includes('http') && !urls.includes(src)) {
          urls.push(src);
        }
      });

      return urls.slice(0, 20); // Max 20 pages
    });

    log.info(`Found ${imageUrls.length} catalog page URLs`);

    // Download each image
    for (let i = 0; i < Math.min(imageUrls.length, 15); i++) {
      try {
        const imgPage = await browser.newPage();
        const response = await imgPage.goto(imageUrls[i], { timeout: 30000 });

        if (response && response.ok()) {
          const buffer = await response.buffer();
          images.push({
            base64: buffer.toString('base64'),
            pageNumber: i + 1,
            url: imageUrls[i],
          });
          log.success(`Downloaded page ${i + 1}`);
        }

        await imgPage.close();
      } catch (e) {
        log.error(`Failed to download page ${i + 1}`);
      }
    }

    await page.close();

  } catch (error) {
    log.error(`CDN scraping failed: ${error.message}`);
  }

  return images;
}

/**
 * Save products to database
 */
async function saveProducts(products, store) {
  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7);

  let saved = 0;
  let skipped = 0;

  // Deduplicate products by normalized name first
  const uniqueProducts = [];
  const seenNames = new Set();

  for (const product of products) {
    if (!product.name || !product.price) continue;

    // Normalize name for comparison (lowercase, remove extra spaces)
    const normalizedName = product.name.toLowerCase().trim().replace(/\s+/g, ' ');

    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      uniqueProducts.push(product);
    }
  }

  log.info(`Deduplicated: ${products.length} -> ${uniqueProducts.length} unique products`);

  for (const product of uniqueProducts) {
    try {
      // Validate product
      if (!product.name || !product.price || product.price <= 0 || product.price > 500) {
        skipped++;
        continue;
      }

      // Skip non-food items that might have slipped through
      const nonFoodKeywords = /telefon|tv|televizor|laptop|frigider|mașină|aragaz|aspirator|electro|samsung|iphone|playstation|xbox|smartphone|tableta|console/i;
      if (nonFoodKeywords.test(product.name)) {
        skipped++;
        continue;
      }

      // Check for duplicates in DB (use similarity)
      const namePart = product.name.split(' ').slice(0, 3).join(' ');
      const existing = await prisma.product.findFirst({
        where: {
          name: { contains: namePart },
          store: store,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Normalize category
      const category = normalizeCategory(product.category);

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
          store: store,
          validFrom,
          validUntil,
          extractionConfidence: product.confidence || 0.8,
        },
      });

      saved++;
      const discount = product.discount_percentage ? ` (-${product.discount_percentage}%)` : '';
      log.product(`${product.name} - ${product.price} lei${discount}`);

    } catch (e) {
      log.error(`Save failed: ${e.message}`);
    }
  }

  return { saved, skipped };
}

/**
 * Normalize category names
 */
function normalizeCategory(category) {
  if (!category) return 'Altele';

  const cat = category.toLowerCase();

  if (/carne|pui|porc|vită|miel/.test(cat)) return 'Proteine';
  if (/mezeluri|salam|șuncă|bacon|cârnați/.test(cat)) return 'Proteine';
  if (/pește|somon|ton/.test(cat)) return 'Proteine';
  if (/lactate|lapte|iaurt|brânză|smântână|unt/.test(cat)) return 'Lactate';
  if (/legume|cartofi|ceapă|roșii|ardei|varză|morcov/.test(cat)) return 'Legume';
  if (/fructe|mere|banane|portocale|struguri/.test(cat)) return 'Fructe';
  if (/pâine|panificație|chifle|covrigi/.test(cat)) return 'Panificație';
  if (/paste|orez|făină|griș/.test(cat)) return 'Carbohidrați';
  if (/conserv/.test(cat)) return 'Conserve';
  if (/condiment|ulei|oțet|sos/.test(cat)) return 'Condimente';
  if (/băutur|suc|apă|bere|vin|cola/.test(cat)) return 'Băuturi';
  if (/dulci|ciocolat|biscui|tort|prăjitur/.test(cat)) return 'Dulciuri';
  if (/snack|chips|covrig/.test(cat)) return 'Snacks';
  if (/congela|înghețat/.test(cat)) return 'Congelate';

  return 'Altele';
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const storesToScrape = args.length > 0 ? args : ['kaufland'];

  log.info('='.repeat(60));
  log.info('Starting Catalog AI Scraper');
  log.info('='.repeat(60));
  log.info(`Stores to scrape: ${storesToScrape.join(', ')}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1400,1800'],
  });

  let totalProducts = 0;

  try {
    for (const store of storesToScrape) {
      log.info('\n' + '='.repeat(60));
      log.info(`Processing ${store.toUpperCase()}`);
      log.info('='.repeat(60));

      // Get catalog screenshots
      const screenshots = await scrapeCatalogPages(browser, store);

      if (screenshots.length === 0) {
        log.error(`No screenshots captured for ${store}, trying CDN method...`);
        const cdnImages = await getCatalogImagesFromCDN(browser, store);
        screenshots.push(...cdnImages);
      }

      if (screenshots.length === 0) {
        log.error(`Could not get any pages for ${store}`);
        continue;
      }

      log.success(`Got ${screenshots.length} catalog pages for ${store}`);

      // Extract products from each page
      let allProducts = [];

      for (const screenshot of screenshots) {
        const products = await extractProductsFromImage(
          screenshot.base64,
          store,
          screenshot.pageNumber
        );

        allProducts.push(...products);

        // Rate limiting for AI API
        await new Promise(r => setTimeout(r, 2000));
      }

      log.info(`\nTotal products extracted for ${store}: ${allProducts.length}`);

      // Save to database
      if (allProducts.length > 0) {
        const storeName = store.charAt(0).toUpperCase() + store.slice(1);
        const { saved, skipped } = await saveProducts(allProducts, storeName);
        log.success(`${store}: Saved ${saved}, Skipped ${skipped}`);
        totalProducts += saved;
      }
    }

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  // Final stats
  const total = await prisma.product.count();
  const byStore = await prisma.product.groupBy({
    by: ['store'],
    _count: { id: true },
  });

  log.info('\n' + '='.repeat(60));
  log.success('Scraping complete!');
  log.info('='.repeat(60));
  log.info(`New products saved: ${totalProducts}`);
  log.info(`Total products in DB: ${total}`);

  if (byStore.length > 0) {
    log.info('\nProducts by store:');
    byStore.forEach(s => log.info(`  ${s.store}: ${s._count.id}`));
  }
}

main().catch(console.error);
