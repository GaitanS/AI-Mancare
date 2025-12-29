#!/usr/bin/env node

/**
 * Explore catalomat.ro structure to find catalog links
 */

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  console.log('Navigating to catalomat.ro/kaufland...');
  await page.goto('https://www.catalomat.ro/kaufland/', { waitUntil: 'networkidle2', timeout: 60000 });

  // Get page title and URL
  console.log('Current URL:', page.url());
  console.log('Title:', await page.title());

  // Find all catalog links
  const catalogLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      if (a.href && a.href.includes('kaufland')) {
        links.push({ href: a.href, text: a.textContent?.trim().substring(0, 80) });
      }
    });
    // Unique links
    const seen = new Set();
    return links.filter(l => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    }).slice(0, 20);
  });

  console.log('\nCatalog links found:');
  catalogLinks.forEach(l => console.log('  -', l.href));
  console.log('    Text:', l.text);

  // Try to find iframe or catalog viewer
  const iframes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe')).map(f => ({
      src: f.src,
      id: f.id,
      className: f.className
    }));
  });

  console.log('\nIframes found:', iframes.length);
  iframes.forEach(f => console.log('  -', f.src || 'no src', f.id, f.className));

  await browser.close();
})();
