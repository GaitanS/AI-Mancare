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
    const products = await prisma.product.findMany({
      where: {
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      take: 50,
      orderBy: { createdAt: 'desc' }
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

  const prompt = `Ești un Chef Expert. Ai la dispoziție o listă de ingrediente la reducere: ${ingredientList}
 
Sarcina ta:
Alege 2-3 ingrediente principale din listă CARE SE POTRIVESC BINE ÎMPREUNĂ și creează o rețetă delicioasă, coerentă și realistă.

🚨 REGULI CRITICE:
1. NU ești obligat să folosești toate ingredientele. Ignoră-le pe cele care nu se potrivesc (ex: nu combina vin cu croissante într-o tocană).
2. PRIORITATE: Gustul și logica culinară. Dacă ai doar "Vin" și "Croissant", NU le combina. Mai bine inventezi o rețetă de "Croissant cu unt și gem" (presupunând ingrediente de bază) decât "Supă de croissant în vin".
3. Evită titlurile care există deja: ${existingTitles.slice(-10).join(', ') || 'niciuna'}

TITLURI INTERZISE:
- Orice combinație forțată tip "X cu aromă de Y" dacă nu e clasic.
- "Pere în vin cu croissant" (deja e prea mult).

REȚETA TREBUIE SĂ FIE:
- Realistă (oamenii chiar o gătesc acasă)
- gustoasă
- Economică

CATEGORII SUGERATE:
- Mâncare gătită (Tocănițe, Paste, Orez, Cartofi la cuptor)
- Mic dejun (Omlete, Bruschete)
- Desert (Doar dacă ai ingrediente de desert: făină, zahăr, fructe, lactate)

CATEGORII ACCEPTATE (orice rețetă REALĂ din aceste categorii):

✓ Bucătărie românească tradițională:
  - sarmale, mici, mămăligă, tocană, ciorbă, papricaș, gulaș, papanași, cozonac, plăcintă

✓ Bucătărie mediteraneană:
  - musaca, tzatziki, souvlaki, moussaka, falafel, hummus, bruschetta

✓ Bucătărie turcească/balcanică:
  - kebab, börek, dolma, baklava, pilaf, imam bayildi

✓ Mâncăruri simple de zi cu zi (FOARTE IMPORTANTE):
  - cartofi prăjiți cu ou, omletă cu brânză, paste cu unt și parmezan
  - spaghete carbonara/bolognese/aglio e olio, pizza simplă
  - orez fiert cu legume, piure de cartofi, salată de roșii cu brânză

✓ Deserturi clasice și populare:
  - tiramisu, panna cotta, salam de biscuiți, negresă, brownie
  - orez cu lapte, griș cu lapte, budincă de vanilie, clătite
  - prăjitură cu mere, cheesecake, pavlova

✓ Brunch/Mic dejun modern:
  - avocado toast cu ou, pancakes, french toast
  - smoothie bowl, granola cu iaurt, ouă Benedict

✓ Fast food/Comfort food:
  - burger de casă, quesadilla, burrito simplu, sandwich-uri
  - supă cremă de legume, wrap-uri, nachos cu brânză

IMPORTANT - Instrucțiunile trebuie să fie TEHNICE și DETALIATE:
- Specifică EXACT cantitățile în grame (ex: "200g piept de pui")
- Indică tehnici de tăiere (ex: "tăiați cubulețe de 2cm", "felii subțiri de 3mm")
- Pentru cuptor: temperatura exactă, cu/fără ventilator (ex: "180°C cu ventilator" sau "200°C fără ventilator")
- Timp de gătit precis pentru fiecare pas (ex: "prăjiți 3-4 minute până se rumenesc")
- Semne vizuale de gătire (ex: "până capătă o crustă aurie", "până sosul se reduce la jumătate")
- Grosimea și dimensiunile ingredientelor (ex: "cartofi tăiați cuburi de 1.5cm")

Răspunde STRICT în format JSON:
{
    "title": "Numele rețetei (unic, creativ)",
    "description": "Descriere scurtă (50 cuvinte)",
    "cookingTime": 30,
    "servings": 4,
    "difficulty": "Ușor|Mediu|Dificil",
    "estimatedCost": 25.00,
    "ingredients": [
        {"name": "Piept de pui", "quantity": "500", "unit": "g"},
        {"name": "Cartofi", "quantity": "800", "unit": "g"}
    ],
    "steps": [
        "Preîncălziți cuptorul la 180°C cu ventilator (sau 200°C fără ventilator).",
        "Tăiați pieptul de pui în cuburi de aproximativ 3cm. Cartofii îi tăiați felii de 5mm grosime.",
        "Într-o tigaie încinsă cu 2 linguri ulei, rumetiți carnea 4-5 minute pe foc mare, amestecând, până capătă o crustă aurie.",
        "Adăugați cartofii și gătiți încă 8-10 minute, amestecând ocazional, până sunt aurii și crocante la exterior.",
        "Transferați într-un vas termorezistent și coaceți 20-25 minute până carnea atinge temperatura internă de 74°C."
    ],
    "tips": "Sfaturi utile pentru economie și tehnici de gătit",
    "tags": ["economic", "traditional", "detaliat"]
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
