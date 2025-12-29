#!/usr/bin/env node

/**
 * Cron Scraper - MonitorulPreturilor.info
 * Runs every Monday at 2 AM to scrape new catalogs
 */

require('dotenv').config({ path: '.env.production' });
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const prisma = new PrismaClient();
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../storage');

// Logging utilities
const log = {
  info: (msg) => console.log(`[SCRAPER] [INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[SCRAPER] [ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SCRAPER] [SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

/**
 * Download PDF file from URL
 */
async function downloadPDF(url, filename) {
  try {
    log.info(`Downloading PDF: ${filename}`);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 60000, // 60 seconds timeout
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const filePath = path.join(STORAGE_PATH, 'catalogs', filename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const writer = require('fs').createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        log.success(`Downloaded: ${filename}`);
        resolve(filePath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    log.error(`Failed to download PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Parse date range from Romanian format
 * Examples: "10.12 - 17.12.2024", "5-18.12.2024"
 */
function parseDateRange(dateString) {
  try {
    // Remove extra whitespace
    const cleaned = dateString.trim().replace(/\s+/g, ' ');

    // Pattern: DD.MM - DD.MM.YYYY or D.MM - DD.MM.YYYY
    const pattern1 = /(\d{1,2})\.(\d{2})\s*-\s*(\d{1,2})\.(\d{2})\.(\d{4})/;
    const match1 = cleaned.match(pattern1);

    if (match1) {
      const [_, startDay, startMonth, endDay, endMonth, year] = match1;
      return {
        start: new Date(`${year}-${startMonth}-${startDay.padStart(2, '0')}`),
        end: new Date(`${year}-${endMonth}-${endDay.padStart(2, '0')}`),
      };
    }

    // Pattern: DD-DD.MM.YYYY
    const pattern2 = /(\d{1,2})\s*-\s*(\d{1,2})\.(\d{2})\.(\d{4})/;
    const match2 = cleaned.match(pattern2);

    if (match2) {
      const [_, startDay, endDay, month, year] = match2;
      return {
        start: new Date(`${year}-${month}-${startDay.padStart(2, '0')}`),
        end: new Date(`${year}-${month}-${endDay.padStart(2, '0')}`),
      };
    }

    // Fallback: 7 days from now
    log.error(`Could not parse date: ${dateString}, using default 7 days`);
    return {
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    log.error(`Date parsing error: ${error.message}`);
    return {
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * Extract store name from title or other fields
 */
function extractStoreName(title, url) {
  const stores = [
    'Lidl',
    'Kaufland',
    'Penny',
    'Carrefour',
    'Auchan',
    'Mega Image',
    'Profi',
    'La Doi Pași',
    'Cora',
  ];

  // Check title first
  for (const store of stores) {
    if (title.toLowerCase().includes(store.toLowerCase())) {
      return store;
    }
  }

  // Check URL
  for (const store of stores) {
    if (url.toLowerCase().includes(store.toLowerCase())) {
      return store;
    }
  }

  // Default
  return 'Unknown';
}

/**
 * Scrape MonitorulPreturilor.info for new catalogs
 */
async function scrapeMonitorulPreturilor() {
  log.info('Starting scraping MonitorulPreturilor.info');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    log.info('Navigating to MonitorulPreturilor.info');
    await page.goto('https://monitorulpreturilor.info/', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    log.info('Extracting catalog links');

    // Extract catalog links
    const catalogs = await page.evaluate(() => {
      const items = document.querySelectorAll('article.brosura, .catalog-item, .brosura-item');
      return Array.from(items)
        .map((item) => {
          // Try to find PDF link
          const pdfLink = item.querySelector('a[href*=".pdf" i]');
          if (!pdfLink) return null;

          // Extract title
          const titleEl =
            item.querySelector('h2, h3, .title, .catalog-title') || pdfLink;
          const title = titleEl?.textContent?.trim() || pdfLink.href.split('/').pop();

          // Extract valid dates
          const datesEl = item.querySelector('.valid-dates, .perioada, time');
          const validPeriod = datesEl?.textContent?.trim() || '';

          return {
            title,
            pdfUrl: pdfLink.href,
            validPeriod,
          };
        })
        .filter((c) => c !== null);
    });

    log.info(`Found ${catalogs.length} potential catalogs`);

    let downloadedCount = 0;

    for (const catalog of catalogs) {
      try {
        // Extract store name
        const store = extractStoreName(catalog.title, catalog.pdfUrl);

        log.info(`Processing: ${catalog.title} (${store})`);

        // Check if already exists
        const existing = await prisma.catalog.findFirst({
          where: { pdfUrl: catalog.pdfUrl },
        });

        if (existing) {
          log.info(`Already exists, skipping: ${catalog.title}`);
          continue;
        }

        // Parse dates
        const dates = parseDateRange(catalog.validPeriod);
        log.info(`Valid from ${dates.start.toISOString()} to ${dates.end.toISOString()}`);

        // Download PDF
        const filename = `${store}_${Date.now()}.pdf`;
        const localPath = await downloadPDF(catalog.pdfUrl, filename);

        // Insert to database
        await prisma.catalog.create({
          data: {
            store,
            title: catalog.title,
            pdfUrl: catalog.pdfUrl,
            pdfLocalPath: localPath,
            validFrom: dates.start,
            validUntil: dates.end,
            status: 'PENDING',
          },
        });

        log.success(`Saved catalog: ${catalog.title}`);
        downloadedCount++;

        // Rate limiting - don't overwhelm the server
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        log.error(`Error processing catalog ${catalog.title}: ${error.message}`);
        // Continue with next catalog
      }
    }

    log.success(`Scraping completed. Downloaded ${downloadedCount} new catalogs`);
    return downloadedCount;
  } catch (error) {
    log.error(`Fatal scraping error: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  scrapeMonitorulPreturilor()
    .then((count) => {
      log.success(`Job finished successfully. Downloaded ${count} catalogs`);
      process.exit(0);
    })
    .catch((error) => {
      log.error(`Job failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { scrapeMonitorulPreturilor, parseDateRange };
