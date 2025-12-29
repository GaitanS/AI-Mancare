#!/usr/bin/env node

/**
 * Catalog Processor - Process pending catalogs with AI
 * Runs every Monday at 4 AM (after scraping)
 */

require('dotenv').config({ path: '.env.production' });
const { PrismaClient } = require('@prisma/client');
const { processCatalog } = require('../src/lib/ai/pdf-processor.ts');

const prisma = new PrismaClient();

const log = {
  info: (msg) => console.log(`[CATALOG PROCESSOR] [INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) =>
    console.error(`[CATALOG PROCESSOR] [ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) =>
    console.log(`[CATALOG PROCESSOR] [SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

async function processAllPendingCatalogs() {
  log.info('Starting catalog processing job');

  try {
    // Get all pending catalogs
    const pendingCatalogs = await prisma.catalog.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    log.info(`Found ${pendingCatalogs.length} pending catalogs`);

    if (pendingCatalogs.length === 0) {
      log.info('No pending catalogs to process');
      return 0;
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const catalog of pendingCatalogs) {
      log.info(`Processing catalog: ${catalog.title} (ID: ${catalog.id})`);

      try {
        const result = await processCatalog(catalog.id);

        if (result.success) {
          log.success(
            `Successfully processed catalog: ${catalog.title}. Extracted ${result.productsExtracted} products`
          );
          processedCount++;
        } else {
          log.error(
            `Failed to process catalog: ${catalog.title}. Errors: ${result.errors.join(', ')}`
          );
          failedCount++;
        }
      } catch (error) {
        log.error(`Fatal error processing catalog ${catalog.title}: ${error.message}`);
        failedCount++;
      }

      // Delay between catalogs to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    log.success(
      `Catalog processing completed. Processed: ${processedCount}, Failed: ${failedCount}`
    );
    return processedCount;
  } catch (error) {
    log.error(`Fatal error in catalog processing job: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  processAllPendingCatalogs()
    .then((count) => {
      log.success(`Job finished successfully. Processed ${count} catalogs`);
      process.exit(0);
    })
    .catch((error) => {
      log.error(`Job failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { processAllPendingCatalogs };
