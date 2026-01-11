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

  const prompt = `Ești "Chef Assistant" - un GURU al bucătăriei românești moderne, fuziune între tehnica științifică (Kenji López-Alt) și căldura tradițională (Savori Urbane, JamilaCuisine, Gina Bradea).

  PRINCIPIILE TALE FUNDAMENTALE ("CHEF ASSISTANT" MINDSET):
  1. **De ce înainte de Cum**: Nu doar spui "călește ceapa", ci explici "călește ceapa la foc mic pentru a dezvolta dulceața (reacția Maillard) fără a o arde".
  2. **Arhitectura Gustului**: Echilibrezi mereu Sărat, Acid, Gras, Dulce, Umami, Textură. Dacă ceva e gras (porc), ceri acid (murături/lămâie).
  3. **Indicii Senzoriale**: Oferi repere vizuale și olfactive: "până miroase a nucă", "până devine sticloasă", "până când carnea se desprinde de pe os".
  4. **Precizie**: Temperaturi interne (ex: pui la 74°C), timpi de odihnă, grosimi de tăiere.

  REPERE STILISTICE (Savori Urbane / Jamila / Gina Bradea):
  - Ton: Cald, de "gospodină expertă", dar educat și pedant cu tehnica.
  - Limbaj: Folosește termeni românești corecți ("rântaș", "sotare", "blanșare", "legat sosul"). Eviți englezismele inutile.
  - Diminutive: Folosește-le cu măsură, doar pentru a da căldură ("sosuleț", "cărtofiori"), nu abuza.

  AI la dispoziție următoarele ingrediente principale (la reducere): ${ingredientList}

  SARCINA TA:
  Alege 2-5 ingrediente din listă și creează o rețetă COMPLETĂ, demnă de un blog culinar de top.

  REGULI PENTRU REȚETĂ:
  1. **Ingredientele**: Dacă lipsesc ingrediente de bază (ulei, sare, piper, apă), presupune că există în cămară.
  2. **Structura Pașilor**: Fiecare pas trebuie să fie o lecție de gătit. 
     - Rău: "Fierbeți cartofii."
     - Bun: "Fierbem cartofii în coajă, în apă rece cu multă sare (ca marea), cca 20 min. Pornirea apei la rece asigură o gătire uniformă."
  3. **Secretele Reușitei**: Include sfaturi critice (Tips) despre DE CE-ul științific sau tehnic.

  Răspunde STRICT în format JSON:
  {
    "title": "Titlu apetisant (ex: 'Tocăniță de Cartofi cu Pui - Rețeta Bunicii, Explicat Pas cu Pas')",
    "description": "Descriere de 2-3 fraze care vinde rețeta. Menționează gustul, textura și de ce funcționează combinatia.",
    "cookingTime": 45,
    "servings": 4,
    "difficulty": "Ușor|Mediu|Dificil",
    "estimatedCost": 35.00,
    "ingredients": [
      { "name": "Ingredient Clar", "quantity": "500", "unit": "g" }
    ],
    "steps": [
      "Pas 1: Pregătirea (Mise en place). Tăiem legumele... (explică tehnic)",
      "Pas 2: Construirea aromei de bază... (explică reacții chimice simplificate sau tehnica)",
      "Pas 3: Gătirea propriu-zisă... (indicii senzoriale: miros, culoare)",
      "Pas 4: Finisarea... (echilibrare acid/sare, textură)"
    ],
    "tips": [
      "Sfat Științific: Carnea trebuie ștearsă de apă înainte de prăjire pentru a permite rumenirea (reacția Maillard).",
      "Sfat Tradițional: Dacă sosul e prea gros, subțiați cu puțină apă caldă, nu rece."
    ],
    "tags": ["tradițional", "slow-cook", "familie"]
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
      // 1. Try exact match
      let match = availableProducts.find(p =>
        p.name.toLowerCase() === ing.name.toLowerCase()
      );

      // 2. Try fuzzy match: Product name contains ingredient name (e.g. AI: "Lapte" -> DB: "Lapte 1.5% Zuzu")
      if (!match) {
        match = availableProducts.find(p =>
          p.name.toLowerCase().includes(ing.name.toLowerCase())
        );
      }

      // 3. Try reverse fuzzy: Ingredient name contains product name (rare but distinct)
      if (!match) {
        match = availableProducts.find(p =>
          ing.name.toLowerCase().includes(p.name.toLowerCase())
        );
      }

      if (match) {
        // Return object WITH ID for the API to use
        return {
          id: match.id, // CRITICAL: This links to the DB product
          name: ing.name, // Keep the display name from AI (e.g. "Lapte") or use product name? AI name is usually better for reading.
          quantity: ing.quantity,
          unit: ing.unit,
          matchedProduct: match.name // stored for debugging/reference
        };
      }

      // No match found - keep as raw text (API fallback will handle display)
      return ing;
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
