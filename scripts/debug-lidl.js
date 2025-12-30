#!/usr/bin/env node

/**
 * Debug Lidl catalog image URL capture
 */

const puppeteer = require('puppeteer');

async function explore() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1600,1000']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  const allUrls = new Set();

  page.on('response', async (response) => {
    const url = response.url();
    // Capture any potential image URLs
    if (url.match(/\.(jpg|jpeg|png|webp)/i)) {
      if (url.includes('leaflet') || url.includes('cdn') || url.includes('ipaper') || url.includes('/data/')) {
        allUrls.add(url);
      }
    }
  });

  console.log('Opening Lidl catalog...');
  await page.goto('https://www.catalomat.ro/lidl/catalog-nou-de-vineri-02-01-2026-52160/', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  await new Promise(r => setTimeout(r, 5000));

  // Accept cookies
  console.log('Accepting cookies...');
  try {
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('De acord')) {
        await btn.click();
        console.log('Cookie accepted');
        break;
      }
    }
  } catch(e) {}

  await new Promise(r => setTimeout(r, 3000));

  // Check frames
  const frames = page.frames();
  console.log('\n=== FRAMES (' + frames.length + ') ===');
  for (const frame of frames) {
    const url = frame.url();
    if (url && url.length > 10) {
      console.log('Frame:', url.substring(0, 150));
    }
  }

  // Look for iframe src in page
  const iframeSrcs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe')).map(f => f.src);
  });
  console.log('\n=== IFRAME SOURCES ===');
  iframeSrcs.forEach(src => console.log(src));

  // Navigate forward
  console.log('\n=== NAVIGATING FORWARD ===');

  // Click on catalog first
  await page.mouse.click(800, 500);
  await new Promise(r => setTimeout(r, 1000));

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 1500));
    console.log('Nav ' + (i+1) + ': ' + allUrls.size + ' image URLs captured');
  }

  // Print all captured URLs
  console.log('\n=== ALL CAPTURED IMAGE URLs ===');
  const sortedUrls = Array.from(allUrls).sort();
  sortedUrls.forEach(url => {
    // Show important parts of URL
    if (url.includes('52160') || url.includes('lidl')) {
      console.log('✓', url.substring(0, 180));
    } else {
      console.log(' ', url.substring(0, 100));
    }
  });

  console.log('\n=== URLS WITH CATALOG ID 52160 ===');
  sortedUrls.filter(u => u.includes('52160')).forEach(u => console.log(u));

  // Check for page number patterns
  console.log('\n=== PAGE NUMBER ANALYSIS ===');
  for (const url of sortedUrls) {
    const match = url.match(/\/(\d+)\.(jpg|webp)/);
    if (match) {
      console.log('Page', match[1], ':', url.substring(0, 120));
    }
  }

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
}

explore().catch(console.error);
