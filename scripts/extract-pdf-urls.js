#!/usr/bin/env node

/**
 * Extract PDF URLs from Kimbino pages for existing catalogs
 */

require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');

const prisma = new PrismaClient();

async function extractPdfFromKimbinoPage(sourceUrl, browser) {
  const page = await browser.newPage();

  try {
    console.log(`  Navigating to: ${sourceUrl}`);
    await page.goto(sourceUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    // Try multiple selectors to find PDF link
    const pdfUrl = await page.evaluate(() => {
      // Method 1: Direct PDF link
      const pdfLink = document.querySelector('a[href*=".pdf"]');
      if (pdfLink) return pdfLink.href;

      // Method 2: Download button
      const downloadBtn = document.querySelector('[data-testid="download-button"], .download-pdf, button[title*="Download"]');
      if (downloadBtn && downloadBtn.href) return downloadBtn.href;

      // Method 3: Look in window.__INITIAL_STATE__ or similar
      if (window.__INITIAL_STATE__?.catalog?.pdfUrl) {
        return window.__INITIAL_STATE__.catalog.pdfUrl;
      }

      // Method 4: Search in all links for PDF pattern
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      for (const link of allLinks) {
        if (link.href.includes('.pdf') || link.href.includes('/pdf/')) {
          return link.href;
        }
      }

      return null;
    });

    await page.close();
    return pdfUrl;

  } catch (error) {
    console.error(`  Error extracting PDF: ${error.message}`);
    await page.close();
    return null;
  }
}

async function extractPdfUrls() {
  console.log('Starting PDF URL extraction...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Get catalogs with empty or null pdf_url
    const catalogs = await prisma.catalog.findMany({
      where: {
        OR: [
          { pdfUrl: '' },
          { pdfUrl: null }
        ],
        sourceUrl: { not: null }
      },
      select: {
        id: true,
        title: true,
        store: true,
        sourceUrl: true
      }
    });

    console.log(`Found ${catalogs.length} catalogs without PDF URLs\n`);

    let successCount = 0;
    let failCount = 0;

    for (const catalog of catalogs) {
      console.log(`Processing: ${catalog.title} (${catalog.store})`);

      const pdfUrl = await extractPdfFromKimbinoPage(catalog.sourceUrl, browser);

      if (pdfUrl) {
        console.log(`  ✓ Found PDF: ${pdfUrl}`);

        await prisma.catalog.update({
          where: { id: catalog.id },
          data: { pdfUrl: pdfUrl }
        });

        successCount++;
      } else {
        console.log(`  ✗ No PDF found`);
        failCount++;
      }

      console.log('');

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n✅ Extraction complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);

  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

// Run
extractPdfUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
