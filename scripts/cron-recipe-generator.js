#!/usr/bin/env node

/**
 * Recipe Generator Cron Job - Standalone JavaScript
 * Generates weekly recipes based on current offers using OpenRouter/Gemini
 * Runs every Monday at 6 AM via GitHub Actions
 */

// Load .env.production only if env vars not already set (e.g., by GitHub Actions)
require('dotenv').config({ path: '.env.production', override: false });
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const log = {
  info: (msg) => console.log(`[RECIPE GENERATOR] [INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[RECIPE GENERATOR] [ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[RECIPE GENERATOR] [SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

// Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.5-flash-preview';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro';

/**
 * Call OpenRouter API with Gemini
 */
async function callAI(prompt, systemPrompt = '') {
  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt || 'Ești un chef profesionist român specializat în rețete economice.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': SITE_URL,
          'X-Title': 'CatalogSmart Recipe Generator',
        },
        timeout: 60000,
      }
    );

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    log.error(`AI call failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get products on sale from database
 */
async function getProductsOnSale() {
  try {
    // Try to get products with discounts (field is discountPercentage in schema)
    const products = await prisma.product.findMany({
      where: {
        discountPercentage: { gt: 0 }
      },
      take: 50,
      orderBy: { discountPercentage: 'desc' }
    });

    if (products.length > 0) {
      return products;
    }

    // If no discounted products, get any products
    const anyProducts = await prisma.product.findMany({
      take: 30
    });

    if (anyProducts.length > 0) {
      return anyProducts;
    }

    // Fallback to defaults
    throw new Error('No products found');
  } catch (error) {
    log.error(`Failed to fetch products: ${error.message}`);
    // Return some default ingredients if DB fails
    return [
      { name: 'Carne de pui', category: 'Carne' },
      { name: 'Cartofi', category: 'Legume' },
      { name: 'Ceapă', category: 'Legume' },
      { name: 'Roșii', category: 'Legume' },
      { name: 'Orez', category: 'Cereale' },
      { name: 'Paste', category: 'Cereale' },
      { name: 'Ouă', category: 'Lactate' },
      { name: 'Brânză', category: 'Lactate' },
      { name: 'Lapte', category: 'Lactate' },
      { name: 'Unt', category: 'Lactate' },
    ];
  }
}

/**
 * Generate a single recipe
 */
async function generateRecipe(ingredients, existingTitles = []) {
  const ingredientList = ingredients.map(p => p.name).join(', ');

  const prompt = `Generează o rețetă românească economică folosind OBLIGATORIU cel puțin 3 din aceste ingrediente la reducere: ${ingredientList}

Titluri DE EVITAT (deja există): ${existingTitles.slice(-10).join(', ') || 'niciuna'}

Răspunde STRICT în format JSON:
{
    "title": "Numele rețetei (unic, creativ)",
    "description": "Descriere scurtă (50 cuvinte)",
    "cookingTime": 30,
    "servings": 4,
    "difficulty": "Ușor|Mediu|Dificil",
    "estimatedCost": 25.00,
    "ingredients": [
        {"name": "Ingredient", "quantity": "200", "unit": "g"}
    ],
    "steps": [
        "Pasul 1: ...",
        "Pasul 2: ..."
    ],
    "tips": "Sfaturi utile pentru economie",
    "tags": ["economic", "traditional", "rapid"]
}`;

  const response = await callAI(prompt);

  // Parse JSON from response
  try {
    // Extract JSON from markdown code blocks if present
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    return JSON.parse(jsonStr.trim());
  } catch (parseError) {
    log.error(`Failed to parse recipe JSON: ${parseError.message}`);
    return null;
  }
}

/**
 * Save recipe to database
 */
async function saveRecipe(recipeData) {
  try {
    const slug = recipeData.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const existing = await prisma.recipe.findUnique({
      where: { slug }
    });

    if (existing) {
      log.info(`Recipe "${recipeData.title}" already exists, skipping`);
      return null;
    }

    // Schema uses: instructions (LongText), ingredientIds (Text), cookTime, prepTime, tags (Text)
    const recipe = await prisma.recipe.create({
      data: {
        title: recipeData.title,
        slug: slug,
        description: recipeData.description,
        cookTime: recipeData.cookingTime || 30,
        prepTime: 10,
        totalTime: (recipeData.cookingTime || 30) + 10,
        servings: recipeData.servings || 4,
        difficulty: (recipeData.difficulty || 'mediu').toLowerCase(),
        estimatedCost: recipeData.estimatedCost || 25,
        // ingredientIds stores JSON array of ingredient objects
        ingredientIds: JSON.stringify(recipeData.ingredients || []),
        // instructions stores JSON array of steps
        instructions: JSON.stringify(recipeData.steps || []),
        tips: recipeData.tips || '',
        // tags is a Text field, store as comma-separated or JSON
        tags: JSON.stringify(recipeData.tags || ['economic']),
        isPublished: true,
      }
    });

    log.success(`Created recipe: ${recipe.title}`);
    return recipe;
  } catch (error) {
    log.error(`Failed to save recipe: ${error.message}`);
    return null;
  }
}

/**
 * Generate multiple recipes
 */
async function generateWeeklyRecipes(count = 10) {
  log.info(`Starting generation of ${count} recipes`);

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set!');
  }

  // Get products on sale
  const products = await getProductsOnSale();
  log.info(`Found ${products.length} products to use for recipes`);

  // Get existing recipe titles to avoid duplicates
  const existingRecipes = await prisma.recipe.findMany({
    select: { title: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  const existingTitles = existingRecipes.map(r => r.title);

  const createdRecipes = [];

  for (let i = 0; i < count; i++) {
    try {
      log.info(`Generating recipe ${i + 1}/${count}...`);

      // Shuffle products for variety
      const shuffled = [...products].sort(() => Math.random() - 0.5);
      const selectedProducts = shuffled.slice(0, 8);

      const recipeData = await generateRecipe(selectedProducts, [...existingTitles, ...createdRecipes.map(r => r.title)]);

      if (recipeData) {
        const saved = await saveRecipe(recipeData);
        if (saved) {
          createdRecipes.push(saved);
        }
      }

      // Rate limiting - wait 2 seconds between API calls
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      log.error(`Failed to generate recipe ${i + 1}: ${error.message}`);
    }
  }

  return createdRecipes;
}

/**
 * Main execution
 */
async function runRecipeGeneration() {
  log.info('========================================');
  log.info('Starting Weekly Recipe Generation');
  log.info('========================================');

  const startTime = Date.now();

  try {
    const RECIPES_TO_GENERATE = parseInt(process.env.WEEKLY_RECIPES_COUNT || '10', 10);

    const recipes = await generateWeeklyRecipes(RECIPES_TO_GENERATE);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success('========================================');
    log.success(`Generation completed in ${duration}s`);
    log.success(`Created ${recipes.length} new recipes`);
    log.success('========================================');

    return recipes.length;
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
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

module.exports = { runRecipeGeneration, generateWeeklyRecipes };
