#!/usr/bin/env node

/**
 * Direct Kaufland Catalog Scraper with AI Vision
 * Navigates through the actual catalog viewer and extracts products
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
  info: (msg) => console.log(`[KAUFLAND] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  product: (msg) => console.log(`   📦 ${msg}`),
  ai: (msg) => console.log(`   🤖 ${msg}`),
};

/**
 * Extract products from image using Gemini Vision
 */
async function extractProductsFromImage(imageBase64, pageNum) {
  log.ai(`Analyzing page ${pageNum}...`);

  const systemPrompt = `Ești un expert în extragerea de date din cataloage de supermarket românești Kaufland.

TASK: Analizează imaginea și extrage TOATE produsele ALIMENTARE vizibile.

OUTPUT FORMAT (JSON STRICT):
{
  "products": [
    {
      "name": "string (nume complet cu greutate/volum, ex: 'Piept de pui 1kg', 'Lapte Zuzu 1L')",
      "brand": "string sau null",
      "price": number (prețul ACTUAL în lei),
      "unit": "string (kg, g, L, ml, buc)",
      "original_price": number sau null (prețul vechi/barat),
      "discount_percentage": number sau null (ex: 25 pentru -25%)",
      "category": "string (Carne, Mezeluri, Lactate, Legume, Fructe, Pâine, Paste, Conserve, Condimente, Băuturi, Dulciuri, Snacks, Congelate)"
    }
  ]
}

REGULI:
1. DOAR produse alimentare (nu: electrocasnice, haine, cosmetice)
2. Prețurile mari colorate = preț actual cu reducere
3. Prețuri barate/mici = preț vechi
4. Include greutatea în nume când e vizibilă
5. Returnează DOAR JSON valid
6. Dacă nu găsești produse alimentare: {"products": []}`;

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
              text: 'Extrage TOATE produsele ALIMENTARE din această pagină de catalog Kaufland. Returnează JSON.',
            },
          ],
        },
      ],
      max_tokens: 4000,
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
async function scrapeKauflandCatalog() {
  log.info('Starting Kaufland catalog scraper...');
  log.info('Using catalomat.ro catalog viewer\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1000'],
  });

  const allProducts = [];
  const seenProductNames = new Set();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1400, height: 1000 });

    // Go to Kaufland catalog page on catalomat
    log.info('Navigating to catalomat.ro/kaufland...');
    await page.goto('https://www.catalomat.ro/kaufland/', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2000));

    // Click on the first catalog to open it
    log.info('Looking for catalog to open...');

    // Find the first catalog link
    const catalogClicked = await page.evaluate(() => {
      // Try to find catalog links
      const links = document.querySelectorAll('a[href*="catalog"], a[href*="kaufland/"]');
      for (const link of links) {
        if (link.href.includes('/kaufland/') && link.href !== window.location.href) {
          link.click();
          return true;
        }
      }

      // Try clicking on catalog image
      const imgs = document.querySelectorAll('.catalog-cover, .brochure-cover, img[alt*="catalog"]');
      for (const img of imgs) {
        const parent = img.closest('a');
        if (parent) {
          parent.click();
          return true;
        }
      }

      return false;
    });

    if (!catalogClicked) {
      log.info('Could not click catalog, trying direct URL...');

      // Try to find catalog URL from page and navigate directly
      const catalogUrl = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          if (link.href.includes('/kaufland/') && link.href.includes('catalog')) {
            return link.href;
          }
        }
        return null;
      });

      if (catalogUrl) {
        await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      }
    }

    await new Promise(r => setTimeout(r, 3000));

    // Now we should be in catalog view
    log.info('Taking screenshots of catalog pages...\n');

    const maxPages = 20;
    let previousScreenshot = null;

    for (let i = 0; i < maxPages; i++) {
      try {
        await new Promise(r => setTimeout(r, 1500));

        // Take screenshot
        const screenshot = await page.screenshot({
          encoding: 'base64',
          type: 'jpeg',
          quality: 85,
        });

        // Check if this is the same as previous page (means we've reached the end)
        if (previousScreenshot && screenshot === previousScreenshot) {
          log.info(`Reached end of catalog at page ${i}`);
          break;
        }
        previousScreenshot = screenshot;

        log.success(`Captured page ${i + 1}`);

        // Extract products with AI
        const products = await extractProductsFromImage(screenshot, i + 1);

        // Add unique products
        for (const product of products) {
          if (!product.name || !product.price) continue;

          const normalizedName = product.name.toLowerCase().trim();
          if (!seenProductNames.has(normalizedName)) {
            seenProductNames.add(normalizedName);
            allProducts.push(product);
          }
        }

        // Navigate to next page
        // Try clicking next button
        const nextClicked = await page.evaluate(() => {
          const nextButtons = document.querySelectorAll(
            '.next, .arrow-right, [class*="next"], [class*="right"], button[aria-label*="next"], .flipbook-nav-right'
          );
          for (const btn of nextButtons) {
            if (btn.offsetParent !== null) { // is visible
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (!nextClicked) {
          // Try keyboard navigation
          await page.keyboard.press('ArrowRight');
        }

        // Rate limiting for AI
        await new Promise(r => setTimeout(r, 2000));

      } catch (error) {
        log.error(`Error on page ${i + 1}: ${error.message}`);
        // Try to continue
      }
    }

    await page.close();

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
  log.info(`\nSaving ${products.length} unique products to database...`);

  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7);

  let saved = 0;

  for (const product of products) {
    try {
      if (!product.name || !product.price || product.price <= 0 || product.price > 300) {
        continue;
      }

      // Skip non-food
      if (/telefon|tv|laptop|frigider|aragaz|aspirator|samsung|iphone/i.test(product.name)) {
        continue;
      }

      // Normalize category
      let category = product.category || 'Altele';
      if (/carne|pui|porc|vită/i.test(category)) category = 'Proteine';
      if (/mezeluri|salam|șuncă/i.test(category)) category = 'Proteine';
      if (/lactate|lapte|iaurt|brânză/i.test(category)) category = 'Lactate';
      if (/legume/i.test(category)) category = 'Legume';
      if (/fructe/i.test(category)) category = 'Fructe';
      if (/pâine/i.test(category)) category = 'Panificație';
      if (/paste|orez/i.test(category)) category = 'Carbohidrați';
      if (/băutur/i.test(category)) category = 'Băuturi';
      if (/dulci|ciocolat/i.test(category)) category = 'Dulciuri';

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
          store: 'Kaufland',
          validFrom,
          validUntil,
          extractionConfidence: 0.85,
        },
      });

      saved++;
      const discount = product.discount_percentage ? ` (-${product.discount_percentage}%)` : '';
      log.product(`${product.name} - ${product.price} lei${discount}`);

    } catch (e) {
      // Likely duplicate, skip
    }
  }

  return saved;
}

/**
 * Main
 */
async function main() {
  try {
    // Reset database first
    log.info('Resetting database...');
    await prisma.product.deleteMany({});
    log.success('Database cleared\n');

    // Scrape catalog
    const products = await scrapeKauflandCatalog();

    log.info(`\nExtracted ${products.length} unique products`);

    // Save to database
    if (products.length > 0) {
      const saved = await saveProducts(products);
      log.success(`\nSaved ${saved} products to database`);
    }

    // Show stats
    const total = await prisma.product.count();
    const byCategory = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    log.info('\n' + '='.repeat(50));
    log.success('Scraping complete!');
    log.info('='.repeat(50));
    log.info(`Total products in DB: ${total}`);
    log.info('\nBy category:');
    byCategory.forEach(c => log.info(`  ${c.category}: ${c._count.id}`));

  } catch (error) {
    log.error(`Fatal: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
