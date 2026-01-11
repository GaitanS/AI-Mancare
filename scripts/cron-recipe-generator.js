#!/usr/bin/env node

/**
 * Recipe Generator Cron Job - Standalone JavaScript
 * Generates weekly recipes based on current offers using OpenRouter/Gemini
 * Runs every Monday at 6 AM via GitHub Actions
 */

// Load .env.production only if env vars not already set (e.g., by GitHub Actions)
require('dotenv').config({ path: '.env.production', override: false });
require('dotenv').config({ path: '.env', override: false });
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
const STATUS_FILE = path.join(STORAGE_PATH, 'recipes-status.json');
const LOGS_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOGS_DIR, `recipe-generator-${new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' }).replace(/[/:, ]/g, '-')}.log`);

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Write to log file
function writeLog(message) {
  try {
    fs.appendFileSync(LOG_FILE, message + '\n');
  } catch (e) {
    // Ignore log write errors
  }
}

// Write status to file for admin panel polling
function writeStatus(status) {
  try {
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
    }
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (e) {
    log.error(`Failed to write status: ${e.message}`);
  }
}

const getRoTime = () => new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
const log = {
  info: (msg) => { const line = `[${getRoTime()}] ${msg}`; console.log(line); writeLog(line); },
  error: (msg) => { const line = `[${getRoTime()}] ❌ ${msg}`; console.error(line); writeLog(line); },
  success: (msg) => { const line = `[${getRoTime()}] ✅ ${msg}`; console.log(line); writeLog(line); },
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
          { role: 'system', content: systemPrompt || 'Ești un chef profesionist român cu experiență în bucătăria tradițională. Dai instrucțiuni TEHNICE și PRECISE: temperaturi exacte (cu/fără ventilator), gramaje precise, tehnici de tăiere cu dimensiuni, timpi de gătire și semne vizuale de verificare. Rețetele tale sunt economice dar detaliate ca într-o carte de bucate profesională.' },
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
    // Get ANY products from the last 7 days (fresh data)
    // We don't rely only on discountPercentage because sometimes AI misses the original price
    // Fetch a large pool of ACTIVE products (not just recent ones) to ensure staples (flour, oil, vegetables) are included
    const products = await prisma.product.findMany({
      where: {
        // Only ensure they are still valid offers
        validUntil: { gte: new Date() }
      },
      take: 300, // Increased to 300 to give AI a rich pantry
      orderBy: [
        { discountPercentage: 'desc' }, // Deals first
        { price: 'asc' } // Then cheap staples
      ]
    });

    if (products.length > 0) {
      return products;
    }

    // If no valid-dated products, get ANY products (fallback)
    const anyProducts = await prisma.product.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' }
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

  const prompt = `Ești o bunică din România sau o gospodină cu experiență (stilul JamilaCuisine / Gina Bradea), care gătește SIMPLU, GUSTOS și TRADIȚIONAL.

  🛑 STOP RMEȚETE "FANCY" SAU INVENȚII CIUDATE!
  - NU folosi titluri pompoase gen "Mise en Place", "Infuzie", "Deconstructie", "Tehnica X".
  - NU folosi ingrediente ciudate în combinații greșite (fără "crustă de pufuleți", fără "infuzie de apă minerală").
  - Vrem mâncare REALĂ, pe care o mănâncă românii zi de zi.

  LISTA DE REȚETE ACCEPTATE (EXEMPLE DE STIL):
  - Cartofi prăjiți cu ou și cașcaval
  - Coaste la cuptor cu cartofi wedges
  - Bulz ciobănesc
  - Mămăligă cu brânză și smântână
  - Clătite clasice (cu dulceață sau brânză)
  - Salată orientală
  - Ciulama de pui cu ciuperci
  - Piept de pui la grătar cu piure
  - Tocăniță de ciuperci / cartofi
  - Gulaș de porc / vită
  - Ciorbă de perișoare / legume / văcuță
  - Cornulețe cu rahat / nucă
  - Sarmale, Ardei umpluți, Pilaf

  AI la dispoziție următoarele ingrediente (la reducere): ${ingredientList}

  SARCINA TA:
  Alege ingredientele și creează o rețetă CLASICĂ românească.
  Dacă ai "biscuiți" și "iaurt", nu face "Mousse cu infuzie", fă "Salam de biscuiți" sau "Prăjitură rapidă".
  Dacă ai "cartofi" și "ulei", fă "Cartofi Țărănești" sau "Tocăniță", nu "Gremolata".

  REGULI PENTRU TITLU:
  - Simplu și clar: "Ciorbă de Perișoare", nu "Elixir de Carne în Supă Clară".
  - Fără ghilimele sau epitete inutile în titlu.

  REGULI DE GĂTIT:
  - Explică simplu, ca pentru un om normal.
  - Folosește "călit", "fiert", "prăjit", "cuptor".
  - Gustul trebuie să fie cel de "acasă".

  Răspunde STRICT în format JSON:
  {
    "title": "Numele simplu al rețetei (ex: 'Cartofi Țărănești cu Cârnați')",
    "description": "O descriere simplă: 'O mâncare sățioasă, exact ca la bunica acasă, perfectă pentru prânz.'",
    "cookingTime": 45,
    "servings": 4,
    "difficulty": "Ușor|Mediu",
    "estimatedCost": 25.00,
    "ingredients": [
      { "name": "Cartofi", "quantity": "1", "unit": "kg" }
    ],
    "steps": [
      "Curățăm cartofii și îi tăiem cuburi...",
      "Călim ceapa în ulei până devine aurie...",
      "Adăugăm carnea și o lăsăm să se rumenească..."
    ],
    "tips": [
      "Folosiți cartofi roz pentru prăjit, se țin mai bine.",
      "Puneți puțină boia dulce pentru culoare."
    ],
    "tags": ["tradițional", "prânz", "ieftin"]
  }`;



  const response = await callAI(prompt);

  // Parse JSON from response
  try {
    // Extract JSON from markdown code blocks if present
    // Extract JSON string using robust bracket matching
    let jsonStr = response;
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = response.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(jsonStr.trim());
  } catch (parseError) {
    log.error(`Failed to parse recipe JSON: ${parseError.message} `);
    return null;
  }
}


/**
 * Save recipe to database
 */
async function saveRecipe(recipeData, availableProducts = []) {
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

    // MATCHING LOGIC: Try to link AI ingredients to real Product IDs
    const matchedIngredients = (recipeData.ingredients || []).map(ing => {
      // CLEANUP: Remove parenthetical explanations AI might have added
      // e.g. "Bere blondă (pentru aciditate)" -> "Bere blondă"
      const cleanName = ing.name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();

      // 1. Try exact match (using clean name)
      let match = availableProducts.find(p =>
        p.name.toLowerCase() === cleanName
      );

      // 2. Try fuzzy match: Product name contains ingredient name
      // DB: "Bere Blondă Ursus" contains Clean: "bere blondă" -> MATCH
      if (!match) {
        match = availableProducts.find(p =>
          p.name.toLowerCase().includes(cleanName)
        );
      }

      // 3. Try reverse fuzzy: Ingredient name contains product name
      // Clean: "piept de pui dezosat" contains DB: "piept de pui" -> MATCH
      if (!match) {
        match = availableProducts.find(p =>
          cleanName.includes(p.name.toLowerCase())
        );
      }

      // 4. Try word intersection (last resort for things like "Ciolan de porc")
      // If we match 3+ words, it's likely the same thing
      if (!match && cleanName.split(' ').length > 2) {
        match = availableProducts.find(p => {
          const pWords = p.name.toLowerCase().split(' ');
          const iWords = cleanName.split(' ');
          const intersection = pWords.filter(w => iWords.includes(w));
          return intersection.length >= 3; // e.g. "Ciolan", "de", "porc"
        });
      }

      if (match) {
        // Return object WITH ID for the API to use
        return {
          id: match.id, // CRITICAL: This links to the DB product
          name: ing.name.replace(/\s*\(.*?\)\s*/g, ''), // Store clean name for display too, looks better
          quantity: ing.quantity,
          unit: ing.unit,
          matchedProduct: match.name // stored for debugging/reference
        };
      }

      // No match found - keep as raw text (API fallback will handle display)
      // Also clean the display name even if no match, to avoid "(pentru aciditate)" cluttering the UI
      return {
        ...ing,
        name: ing.name.replace(/\s*\(.*?\)\s*/g, '').trim()
      };
    });

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
        // ingredientIds stores JSON array of ingredient objects (now with IDs!)
        ingredientIds: JSON.stringify(matchedIngredients),
        // instructions stores JSON array of steps
        instructions: JSON.stringify(recipeData.steps || recipeData.instructions || []),
        tips: JSON.stringify(recipeData.tips || []),
        // tags is a Text field, store as comma-separated or JSON
        tags: JSON.stringify(recipeData.tags || ['economic']),
        isPublished: true,
      }
    });

    log.success(`Created recipe: ${recipe.title} `);
    return recipe;
  } catch (error) {
    log.error(`Failed to save recipe: ${error.message} `);
    return null;
  }
}

/**
 * Generate multiple recipes
 */
async function generateWeeklyRecipes(count = 10) {
  log.info(`Starting generation of ${count} recipes`);

  // Write initial status
  writeStatus({
    running: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    current: 0,
    total: count,
    message: 'Se inițializează...',
    complete: false,
    generatedCount: 0,
    error: null
  });

  if (!OPENROUTER_API_KEY) {
    writeStatus({ running: false, error: 'OPENROUTER_API_KEY is not set!', complete: false });
    throw new Error('OPENROUTER_API_KEY is not set!');
  }

  // Get products on sale
  const products = await getProductsOnSale();
  log.info(`Found ${products.length} products to use for recipes`);

  writeStatus({
    running: true,
    current: 0,
    total: count,
    message: `Găsite ${products.length} produse cu reducere`,
    complete: false,
    generatedCount: 0,
    error: null
  });

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

      writeStatus({
        running: true,
        current: i,
        total: count,
        message: `Generăm rețeta ${i + 1}/${count}...`,
        complete: false,
        generatedCount: createdRecipes.length,
        error: null
      });

      // Deduplicate products by name to avoid "Wine, Wine, Wine" scenarios
      const uniqueProducts = Array.from(new Map(products.map(p => [p.name, p])).values());
      const shuffled = [...uniqueProducts].sort(() => Math.random() - 0.5);
      const selectedProducts = shuffled.slice(0, 12); // Give it more options (12 instead of 8)

      const recipeData = await generateRecipe(selectedProducts, [...existingTitles, ...createdRecipes.map(r => r.title)]);

      if (recipeData) {
        // Pass selectedProducts for matching logic
        const saved = await saveRecipe(recipeData, selectedProducts);
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

  // Write final status
  writeStatus({
    running: false,
    startedAt: null,
    completedAt: new Date().toISOString(),
    current: count,
    total: count,
    message: `Generare completă! ${createdRecipes.length} rețete noi.`,
    complete: true,
    generatedCount: createdRecipes.length,
    error: null
  });

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
