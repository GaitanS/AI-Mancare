#!/usr/bin/env node

/**
 * Recipe Generator Cron Job
 * Generates weekly recipes based on current offers
 * Runs every Monday at 6 AM
 */

require('dotenv').config({ path: '.env.production' });
const { generateWeeklyRecipes } = require('../src/lib/ai/recipe-generator.ts');

const log = {
  info: (msg) =>
    console.log(`[RECIPE GENERATOR] [INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) =>
    console.error(`[RECIPE GENERATOR] [ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) =>
    console.log(`[RECIPE GENERATOR] [SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

async function runRecipeGeneration() {
  log.info('Starting weekly recipe generation job');

  try {
    const RECIPES_TO_GENERATE = parseInt(process.env.WEEKLY_RECIPES_COUNT || '10', 10);

    log.info(`Generating ${RECIPES_TO_GENERATE} new recipes`);

    const recipeIds = await generateWeeklyRecipes(RECIPES_TO_GENERATE);

    log.success(
      `Recipe generation completed successfully. Created ${recipeIds.length} recipes`
    );
    return recipeIds.length;
  } catch (error) {
    log.error(`Fatal error in recipe generation: ${error.message}`);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  runRecipeGeneration()
    .then((count) => {
      log.success(`Job finished successfully. Generated ${count} recipes`);
      process.exit(0);
    })
    .catch((error) => {
      log.error(`Job failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runRecipeGeneration };
