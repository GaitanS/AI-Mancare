#!/usr/bin/env node

/**
 * Explore Catalomat catalog structure to find image URLs
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

async function exploreCatalog() {
  console.log('Starting catalog exploration...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1600, height: 1000 });

  // Collect all image URLs from network
  const imageUrls = new Set();

  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    if (contentType.includes('image') || url.match(/\.(jpg|jpeg|png|webp)$/i)) {
      imageUrls.add(url);
    }
  });

  try {
    const catalogUrl = 'https://www.catalomat.ro/kaufland/catalog-nou-de-miercuri-24-12-2025-51887/';
    console.log(`Opening: ${catalogUrl}\n`);

    await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    // Accept cookies if dialog appears
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('De acord')) {
          await btn.click();
          console.log('Accepted cookies\n');
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      }
    } catch (e) {}

    // Print all collected image URLs
    console.log('\n=== ALL IMAGE URLS FOUND ===\n');
    for (const url of imageUrls) {
      if (url.length < 200) {
        console.log(url);
      }
    }

    // Find iframes
    console.log('\n=== IFRAMES FOUND ===\n');
    const iframes = await page.$$('iframe');
    for (const iframe of iframes) {
      const src = await page.evaluate(el => el.src, iframe);
      console.log(`Iframe: ${src}`);
    }

    // Check the page structure
    console.log('\n=== PAGE STRUCTURE ===\n');

    const structure = await page.evaluate(() => {
      const results = {
        images: [],
        iframes: [],
        canvases: [],
        divWithBackgroundImage: [],
      };

      // Find all images
      document.querySelectorAll('img').forEach(img => {
        if (img.src && img.width > 100) {
          results.images.push({
            src: img.src.substring(0, 150),
            width: img.width,
            height: img.height,
            class: img.className,
          });
        }
      });

      // Find iframes
      document.querySelectorAll('iframe').forEach(iframe => {
        results.iframes.push({
          src: iframe.src,
          id: iframe.id,
          class: iframe.className,
        });
      });

      // Find canvases
      document.querySelectorAll('canvas').forEach(canvas => {
        results.canvases.push({
          width: canvas.width,
          height: canvas.height,
          id: canvas.id,
          class: canvas.className,
        });
      });

      // Find divs with background images
      document.querySelectorAll('div').forEach(div => {
        const bg = window.getComputedStyle(div).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url')) {
          results.divWithBackgroundImage.push({
            bg: bg.substring(0, 150),
            class: div.className,
          });
        }
      });

      return results;
    });

    console.log('Images:', JSON.stringify(structure.images, null, 2));
    console.log('\nIframes:', JSON.stringify(structure.iframes, null, 2));
    console.log('\nCanvases:', JSON.stringify(structure.canvases, null, 2));
    console.log('\nDivs with BG:', JSON.stringify(structure.divWithBackgroundImage, null, 2));

    // Check if there's an iframe with catalog viewer
    if (structure.iframes.length > 0) {
      console.log('\n=== EXPLORING IFRAME ===\n');

      for (const frame of page.frames()) {
        const url = frame.url();
        if (url && url !== 'about:blank') {
          console.log(`Frame URL: ${url}`);

          try {
            const frameImages = await frame.evaluate(() => {
              const imgs = [];
              document.querySelectorAll('img').forEach(img => {
                if (img.src && img.width > 100) {
                  imgs.push({
                    src: img.src,
                    width: img.width,
                    height: img.height,
                  });
                }
              });
              return imgs;
            });

            if (frameImages.length > 0) {
              console.log('Frame images:', JSON.stringify(frameImages, null, 2));
            }
          } catch (e) {
            console.log('Cannot access frame content:', e.message);
          }
        }
      }
    }

    // Wait for user to see the browser
    console.log('\n=== BROWSER OPEN - INSPECT MANUALLY ===');
    console.log('Look at the Network tab in DevTools for image requests');
    console.log('Right-click on catalog page image -> "Open image in new tab"');
    console.log('Copy the URL pattern\n');

    // Keep browser open for manual inspection
    await new Promise(r => setTimeout(r, 60000)); // Wait 1 minute

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

exploreCatalog().catch(console.error);
