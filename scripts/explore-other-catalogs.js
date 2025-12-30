#!/usr/bin/env node

/**
 * Explore different supermarket catalog structures on Catalomat
 * Compare Kaufland, Lidl, Mega Image, Penny, Carrefour
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

const catalogs = [
  { name: 'Lidl', url: 'https://www.catalomat.ro/lidl/catalog-nou-de-vineri-02-01-2026-52160/' },
  { name: 'Mega Image', url: 'https://www.catalomat.ro/mega-image/catalog-nou-de-luni-29-12-2025-52274/' },
  { name: 'Penny', url: 'https://www.catalomat.ro/penny/' },
  { name: 'Carrefour', url: 'https://www.catalomat.ro/carrefour/' },
];

async function exploreCatalog(catalogInfo) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Exploring: ${catalogInfo.name}`);
  console.log(`URL: ${catalogInfo.url}`);
  console.log('='.repeat(60));

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1400, height: 900 });

  const imageUrls = new Set();
  const iframeUrls = new Set();

  // Listen to network requests
  page.on('response', async (response) => {
    const url = response.url();

    // Track image CDN URLs
    if (url.includes('leafletscdns.com') || url.includes('ipaper') || url.includes('cdn')) {
      if (url.match(/\.(jpg|jpeg|png|webp)/i)) {
        imageUrls.add(url.substring(0, 150));
      }
    }

    // Track iframe sources
    if (url.includes('viewer') || url.includes('catalog') || url.includes('leaflet')) {
      iframeUrls.add(url.substring(0, 150));
    }
  });

  try {
    await page.goto(catalogInfo.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Check for cookie consent
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('De acord') || text.includes('Accept'))) {
          await btn.click();
          console.log('✅ Cookie consent accepted');
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      }
    } catch (e) {}

    // Check page structure
    const pageInfo = await page.evaluate(() => {
      const info = {
        hasIframe: document.querySelectorAll('iframe').length > 0,
        iframeSrcs: Array.from(document.querySelectorAll('iframe')).map(f => f.src).filter(s => s),
        hasCanvas: document.querySelectorAll('canvas').length > 0,
        pageIndicator: null,
        catalogImages: [],
      };

      // Look for page indicator
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent.trim();
        if (text.match(/^\d+\s*\/\s*\d+$/)) {
          info.pageIndicator = text;
        }
      });

      // Look for catalog images
      document.querySelectorAll('img').forEach(img => {
        if (img.src && (img.src.includes('leaflet') || img.src.includes('catalog') || img.src.includes('cdn'))) {
          info.catalogImages.push(img.src.substring(0, 100));
        }
      });

      return info;
    });

    console.log('\n📊 Page Structure:');
    console.log(`   Has iframe: ${pageInfo.hasIframe}`);
    console.log(`   Has canvas: ${pageInfo.hasCanvas}`);
    console.log(`   Page indicator: ${pageInfo.pageIndicator || 'Not found'}`);

    if (pageInfo.iframeSrcs.length > 0) {
      console.log('\n📦 Iframe sources:');
      pageInfo.iframeSrcs.forEach(src => console.log(`   ${src.substring(0, 100)}`));
    }

    if (pageInfo.catalogImages.length > 0) {
      console.log('\n🖼️ Catalog images found:');
      pageInfo.catalogImages.slice(0, 5).forEach(src => console.log(`   ${src}`));
    }

    // Wait and collect more URLs
    await new Promise(r => setTimeout(r, 3000));

    // Try to navigate to get more image URLs
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 2000));
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n🌐 Network image URLs collected:');
    Array.from(imageUrls).slice(0, 5).forEach(url => console.log(`   ${url}`));

    if (iframeUrls.size > 0) {
      console.log('\n🔗 Viewer/catalog URLs:');
      Array.from(iframeUrls).slice(0, 5).forEach(url => console.log(`   ${url}`));
    }

    // Take a screenshot
    const screenshotPath = `C:\\Users\\Silviu\\Downloads\\AI Mancare\\public\\catalog-images\\explore-${catalogInfo.name.toLowerCase().replace(' ', '-')}.jpg`;
    await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 80 });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     EXPLORING SUPERMARKET CATALOG STRUCTURES                     ║');
  console.log('║     Comparing: Lidl, Mega Image, Penny, Carrefour               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // Just explore Lidl and Mega Image for now
  await exploreCatalog(catalogs[0]); // Lidl
  await exploreCatalog(catalogs[1]); // Mega Image

  console.log('\n\n✅ Exploration complete!');
}

main().catch(console.error);
