#!/usr/bin/env node

/**
 * Recipe Generator Cron Job - Standalone JavaScript
 * Generates weekly recipes based on current offers using OpenRouter/Gemini
 *
 * KEY PRINCIPLE: The AI suggests REAL, WELL-KNOWN recipes that use
 * ingredients currently on sale. It does NOT invent new recipes.
 *
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
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.5-flash';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro';
const MAX_PROMPT_PRODUCTS = 500;

// ─── DIETARY FLAGS CALCULATOR (ported from src/lib/dietary.ts) ───
function containsWord(text, words) {
  return words.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

function calculateDietaryFlags(fullText) {
  const text = fullText.toLowerCase();
  let isGlutenFree = true, isDairyFree = true, isVegan = true, isVegetarian = true;

  const meats = ['pui', 'porc', 'vită', 'vita', 'carne', 'șuncă', 'sunca', 'slănină', 'slanina', 'cârnați', 'carnati', 'pește', 'peste', 'ton'];
  if (containsWord(text, meats)) { isVegan = false; isVegetarian = false; }

  const dairy = ['lapte', 'smântână', 'smantana', 'iaurt', 'brânză', 'branza', 'cașcaval', 'cascaval', 'unt', 'frișcă', 'frisca', 'parmezan'];
  if (containsWord(text, dairy)) { isDairyFree = false; isVegan = false; }

  if (text.includes('ouă') || text.includes('oua') || /\bou\b/.test(text)) { isVegan = false; }

  const gluten = ['pâine', 'paine', 'făină', 'faina', 'pesmet', 'paste', 'crutoane', 'grâu', 'grau', 'gluten'];
  if (containsWord(text, gluten)) { isGlutenFree = false; }

  return { isGlutenFree, isDairyFree, isVegan, isVegetarian };
}

// ─── DIFFICULTY NORMALIZATION (ported from src/lib/utils.ts) ───
function normalizeDifficulty(difficulty) {
  const stripped = (difficulty || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  switch (stripped) {
    case 'usor': return 'USOR';
    case 'mediu': return 'MEDIU';
    case 'dificil': return 'DIFICIL';
    default: return (difficulty || 'MEDIU').toUpperCase();
  }
}

// ─── NON-COOKING PRODUCT FILTER ───
// Products that should NOT be used as recipe ingredients
const NON_COOKING_KEYWORDS = [
  // Snacks & junk (not cooking ingredients)
  'chips', 'cipsu', 'pufuleți', 'pufuleti', 'covrig', 'sticks', 'nachos', 'popcorn',
  // Drinks (non-cooking)
  'cola', 'pepsi', 'fanta', 'sprite', '7up', 'redbull', 'red bull', 'energizant',
  'bere', 'vodka', 'whisky', 'rom ', 'gin ', 'lichior', 'cidru', 'radler',
  // Household / non-food
  'detergent', 'balsam rufe', 'înălbitor', 'inalbitor', 'dezinfectant',
  'șampon', 'sampon', 'gel de duș', 'gel de dus', 'săpun lichid', 'sapun lichid',
  'cremă de corp', 'crema de corp', 'deodorant', 'antiperspirant',
  'hârtie igienică', 'hartie igienica', 'șervețele', 'servetele',
  'periuță', 'periuta', 'pastă de dinți', 'pasta de dinti',
  'scutece', 'pampers', 'absorbante',
  'baterii', 'becuri', 'lumânări', 'lumanari',
  'hrană animale', 'hrana animale', 'pisici', 'câini', 'caini',
  // Candy / sweets (not cooking ingredients, unlike Nutella/chocolate which can be)
  'gumă de mestecat', 'guma de mestecat', 'bombone', 'acadele', 'jeleuri',
  // Tobacco
  'țigări', 'tigari', 'tutun',
];

/**
 * Filter out non-cooking products
 */
function isCookingIngredient(productName) {
  const nameLower = productName.toLowerCase();
  return !NON_COOKING_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

/**
 * Call OpenRouter API with Gemini
 */
async function callAI(prompt, systemPrompt = '', retryCount = 0) {
  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
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
    if (retryCount < 1) {
      log.error(`AI call failed (attempt ${retryCount + 1}): ${error.message}. Retrying in 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return callAI(prompt, systemPrompt, retryCount + 1);
    }
    log.error(`AI call failed after ${retryCount + 1} attempts: ${error.message}`);
    throw error;
  }
}

/**
 * Get ALL cooking products on sale from database (no arbitrary limit)
 */
async function getProductsOnSale() {
  try {
    const products = await prisma.product.findMany({
      where: {
        validUntil: { gte: new Date() }
      },
      orderBy: [
        { discountPercentage: 'desc' },
        { price: 'asc' }
      ]
    });

    // Filter to cooking ingredients only
    const cookingProducts = products.filter(p => isCookingIngredient(p.name));

    log.info(`Found ${products.length} total products, ${cookingProducts.length} are cooking ingredients`);

    if (cookingProducts.length > 0) {
      return cookingProducts;
    }

    // Fallback: any recent products
    const anyProducts = await prisma.product.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' }
    });

    return anyProducts.filter(p => isCookingIngredient(p.name));
  } catch (error) {
    log.error(`Failed to fetch products: ${error.message}`);
    return [];
  }
}

/**
 * Group products by rough category for better AI understanding
 */
function groupProductsByCategory(products) {
  const categories = {
    'Carne & Mezeluri': [],
    'Pește & Fructe de mare': [],
    'Lactate & Ouă': [],
    'Legume & Fructe': [],
    'Pâine & Panificație': [],
    'Paste, Orez & Cereale': [],
    'Conserve & Sosuri': [],
    'Condimente & Uleiuri': [],
    'Dulciuri & Deserturi': [],
    'Băuturi (pt gătit)': [],
    'Altele': [],
  };

  for (const p of products) {
    const name = p.name.toLowerCase();

    if (/pui|porc|vită|vita|curcan|miel|carne|cârnați|carnati|salam|șuncă|sunca|bacon|slănină|slanina|cârnăciori|carnaciori|pulpă|pulpa|piept|mușchiuleț|muschiulet|fleică|fleica|antricot|ceafă|ceafa|cotlet|crenvurști|crenvursti|parizer/.test(name)) {
      categories['Carne & Mezeluri'].push(p);
    } else if (/pește|peste|somon|ton |sardine|macrou|crevete|calmar|hering|cod |doradă|dorada|păstrăv|pastrav/.test(name)) {
      categories['Pește & Fructe de mare'].push(p);
    } else if (/lapte|iaurt|smântână|smantana|brânză|branza|cașcaval|cascaval|unt |ouă|oua|frișcă|frisca|cremă|crema|mascarpone|mozzarella|parmezan|telemea|ricotta/.test(name)) {
      categories['Lactate & Ouă'].push(p);
    } else if (/roșii|rosii|ceapă|ceapa|cartofi|morcov|ardei|salată|salata|castraveți|castraveti|varză|varza|dovlecel|vinete|spanac|usturoi|ciuperci|mazăre|mazare|fasole|lămâie|lamaie|portocal|măr |mar |banane|pere|struguri|căpșun|capsun|afine|zmeură|zmura|kiwi|mango|ananas|avocado|legume|fructe/.test(name)) {
      categories['Legume & Fructe'].push(p);
    } else if (/pâine|paine|baghetă|bagheta|chifle|cozonac|croissant|corn |franzelă|franzela|tortilla|lipie/.test(name)) {
      categories['Pâine & Panificație'].push(p);
    } else if (/paste |spaghete|penne|fusilli|macaroane|orez|bulgur|cuscus|făină|faina|mălai|malai|griș|gris|fulgi de ovăz|fulgi de ovaz|cereale|muesli/.test(name)) {
      categories['Paste, Orez & Cereale'].push(p);
    } else if (/conservă|conserva|sos |bulion|pastă de|pasta de|ketchup|muștar|mustar|maioneză|maioneza|hrean|oțet|otet/.test(name)) {
      categories['Conserve & Sosuri'].push(p);
    } else if (/ulei|măsline|masline|sare |piper|boia|oregano|cimbru|dafin|condiment|mirodenie|zahăr|zahar|miere|vanilie|scorțișoară|scortisoara/.test(name)) {
      categories['Condimente & Uleiuri'].push(p);
    } else if (/ciocolată|ciocolata|nutella|cacao|biscuiți|biscuiti|napolitane|prăjitură|prajitura|tort |înghețată|inghetata|budincă|budinca|cremă de|crema de|wafel/.test(name)) {
      categories['Dulciuri & Deserturi'].push(p);
    } else if (/apă|apa|suc |nectar|limonadă|limonada|vin |must|cidru/.test(name)) {
      categories['Băuturi (pt gătit)'].push(p);
    } else {
      categories['Altele'].push(p);
    }
  }

  return categories;
}

/**
 * Format products into a concise list for the AI prompt
 */
function formatProductsForPrompt(products) {
  // Deduplicate by name
  const unique = Array.from(new Map(products.map(p => [p.name, p])).values());

  // Limit to MAX_PROMPT_PRODUCTS to avoid token overflow
  const limited = unique
    .sort((a, b) => (Number(b.discountPercentage) || 0) - (Number(a.discountPercentage) || 0))
    .slice(0, MAX_PROMPT_PRODUCTS);

  if (unique.length > MAX_PROMPT_PRODUCTS) {
    log.info(`Truncated product list from ${unique.length} to ${MAX_PROMPT_PRODUCTS} (best deals first)`);
  }

  const grouped = groupProductsByCategory(limited);

  let text = '';
  for (const [category, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    text += `\n📦 ${category}:\n`;
    for (const p of items) {
      const discount = p.discountPercentage ? ` (-${p.discountPercentage}%)` : '';
      text += `  • ${p.name} — ${Number(p.price).toFixed(2)} lei${discount} [ID: ${p.id}]\n`;
    }
  }

  return text;
}

// ─── RECIPE CATEGORIES FOR VARIETY ───
const RECIPE_CATEGORIES = [
  'Supă sau ciorbă românească tradițională',
  'Mâncare gătită cu carne (tocăniță, friptură, gratar)',
  'Paste (italienești sau altă bucătărie)',
  'Rețetă vegetariană sau de post',
  'Desert sau prăjitură',
  'Mic dejun substanțial sau brunch',
  'Salată consistentă (de masă principală)',
  'Rețetă internațională populară (pizza, risotto, curry, stir-fry, tacos)',
  'Plăcintă, clătite sau foi (savuroase sau dulci)',
  'Mâncare rapidă sub 30 minute',
];

// ─── SEASONAL AWARENESS ───
function getSeasonHint() {
  const month = new Date().getMonth(); // 0-11
  if (month >= 11 || month <= 1) return 'iarnă (preferă supe, ciorbe, tocănițe, mâncăruri la cuptor, comfort food)';
  if (month >= 2 && month <= 4) return 'primăvară (preferă mâncăruri ușoare, legume proaspete de sezon, paste)';
  if (month >= 5 && month <= 7) return 'vară (preferă salate, grătare, mâncăruri reci, rețete rapide, deserturi răcoritoare)';
  return 'toamnă (preferă supe cremă, plăcinte, tocănițe, mâncăruri cu legume de toamnă)';
}

function getSeasonalCategories() {
  const month = new Date().getMonth();
  if (month >= 11 || month <= 1) {
    return [
      'Supă sau ciorbă românească tradițională',
      'Mâncare gătită cu carne (tocăniță, friptură, la cuptor)',
      'Paste (italienești sau altă bucătărie)',
      'Rețetă vegetariană sau de post',
      'Desert sau prăjitură',
      'Plăcintă, clătite sau foi (savuroase sau dulci)',
      'Rețetă internațională populară (pizza, risotto, curry, stir-fry)',
      'Mâncare rapidă sub 30 minute',
      'Supă cremă de legume de sezon',
      'Tocăniță sau mâncare la cuptor de iarnă',
    ];
  }
  if (month >= 5 && month <= 7) {
    return [
      'Salată consistentă (de masă principală)',
      'Mâncare rapidă sub 30 minute',
      'Rețetă internațională populară (pizza, risotto, tacos, stir-fry)',
      'Paste (italienești sau altă bucătărie)',
      'Desert răcoritor sau prăjitură de vară',
      'Mic dejun substanțial sau brunch',
      'Rețetă vegetariană sau de post',
      'Grătar sau mâncare ușoară de vară',
      'Plăcintă, clătite sau foi (savuroase sau dulci)',
      'Supă rece sau ciorbă ușoară de vară',
    ];
  }
  return RECIPE_CATEGORIES;
}

// ─── SMART DEDUPLICATION ───
function isSimilarTitle(newTitle, existingTitles) {
  const normalize = (t) => t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '').trim();

  const newWords = normalize(newTitle).split(/\s+/).filter(w => w.length > 2);
  if (newWords.length === 0) return false;

  for (const existing of existingTitles) {
    const existingWords = new Set(normalize(existing).split(/\s+/).filter(w => w.length > 2));
    if (existingWords.size === 0) continue;
    const overlap = newWords.filter(w => existingWords.has(w)).length;
    const similarity = overlap / Math.max(newWords.length, existingWords.size);
    if (similarity > 0.6) return true;
  }
  return false;
}

// ─── STORE CONCENTRATION ───
function getDominantStores(products) {
  const storeCounts = {};
  for (const p of products) {
    storeCounts[p.store] = (storeCounts[p.store] || 0) + 1;
  }
  return Object.entries(storeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([store]) => store);
}

// ─── RECIPE QUALITY VALIDATION ───
function validateRecipeQuality(recipeData) {
  const errors = [];

  if (!recipeData.title || recipeData.title.trim().length < 5) {
    errors.push('Title too short or missing');
  }

  const ingredients = recipeData.ingredients || [];
  if (ingredients.length < 3) {
    errors.push(`Too few ingredients: ${ingredients.length} (minimum 3)`);
  }

  const steps = recipeData.steps || recipeData.instructions || [];
  if (steps.length < 2) {
    errors.push(`Too few steps: ${steps.length} (minimum 2)`);
  }

  const cookTime = recipeData.cook_time || recipeData.cookingTime || 0;
  const prepTime = recipeData.prep_time || 0;
  if (cookTime + prepTime <= 0) {
    errors.push('Total time must be > 0');
  }

  if (errors.length > 0) {
    log.error(`Recipe quality check failed for "${recipeData.title || 'unknown'}": ${errors.join('; ')}`);
    return false;
  }
  return true;
}

// ─── SMART TAG GENERATION ───
function generateSmartTags(recipeData) {
  const tags = new Set();
  const title = (recipeData.title || '').toLowerCase();
  const allText = title + ' ' + (recipeData.description || '').toLowerCase();

  // Difficulty
  tags.add(recipeData.difficulty || 'mediu');

  // Always economic
  tags.add('economic');

  // Servings
  tags.add(`${recipeData.servings || 4} portii`);

  // Total time
  const totalTime = (recipeData.prep_time || 0) + (recipeData.cook_time || recipeData.cookingTime || 30);
  tags.add(`${totalTime} minute`);
  if (totalTime <= 30) tags.add('rapid');
  if (totalTime >= 60) tags.add('gatit lent');

  // Meal type detection
  if (/mic dejun|brunch|omletă|omleta|pancake|clătite|clatite/.test(allText)) tags.add('mic dejun');
  if (/supă|supa|ciorbă|ciorba|borș|bors/.test(allText)) tags.add('supa');
  if (/salată|salata/.test(allText)) tags.add('salata');
  if (/desert|prăjitură|prajitura|tort |cozonac|clătite|clatite|papanași|papanasi|budincă|budinca/.test(allText)) tags.add('desert');
  if (/paste |spaghete|penne|carbonara|bolognese|lasagna/.test(allText)) tags.add('paste');
  if (/pizza/.test(allText)) tags.add('pizza');
  if (/grătar|gratar|grill/.test(allText)) tags.add('gratar');

  // Cooking method detection
  if (/cuptor|la cuptor/.test(allText)) tags.add('la cuptor');
  if (/prăjit|prajit|tigaie/.test(allText)) tags.add('prajit');
  if (/fiert|fiarbe/.test(allText)) tags.add('fiert');

  // Cuisine detection
  if (/românesc|romanesc|tradițional|traditional|ciorbă|ciorba|sarmale|mici |mititei|papanași|papanasi|musaca|tocăniță|tocanita/.test(allText)) tags.add('romanesc');
  if (/italian|paste |pizza|risotto|carbonara|bolognese|lasagna/.test(allText)) tags.add('italian');
  if (/curry|tikka|masala|naan/.test(allText)) tags.add('indian');
  if (/stir-fry|wok|soia|noodles/.test(allText)) tags.add('asiatic');
  if (/tacos|burrito|quesadilla|guacamole/.test(allText)) tags.add('mexican');

  return Array.from(tags);
}

// ─── REAL COST CALCULATION ───
function calculateRealCost(matchedIngredients, allProducts) {
  let total = 0;
  let matchedCount = 0;
  for (const ing of matchedIngredients) {
    if (ing.id) {
      const product = allProducts.find(p => p.id === ing.id);
      if (product) {
        total += Number(product.price);
        matchedCount++;
      }
    }
  }
  if (matchedCount >= matchedIngredients.length * 0.4) {
    return Math.round(total * 100) / 100;
  }
  return 0;
}

/**
 * Generate a single REAL recipe using products on sale
 */
async function generateRecipe(allProducts, categoryHint, existingTitles = []) {
  const productList = formatProductsForPrompt(allProducts);
  const avoidList = existingTitles.length > 0
    ? `\nNU repeta aceste rețete deja generate: ${existingTitles.join(', ')}`
    : '';

  // Smart context: season + dominant stores
  const seasonHint = getSeasonHint();
  const dominantStores = getDominantStores(allProducts);
  const storeHint = dominantStores.length > 0
    ? `\n- Magazine cu cele mai multe oferte: ${dominantStores.join(', ')} (preferă ingrediente dintr-un singur magazin dacă posibil)`
    : '';

  const systemPrompt = `Ești un chef profesionist cu experiență în bucătăria românească și internațională.

ROLUL TĂU: Recomanzi rețete REALE, CUNOSCUTE, pe care oamenii le caută pe bloguri culinare (Jamila, Laura Laurențiu, Savori Urbane, Gina Bradea) sau în cărți de bucate. NU inventezi rețete noi.

STIL DE SCRIERE:
- Cald, prietenos, explicativ, ca o gospodină expertă
- Explică DE CE facem un pas ("călim ceapa ca să devină dulce")
- Folosește termeni românești: "călit", "înăbușit", "rumenit", "dres cu ou", "scăzut"
- NU folosi: "dressing" (zi "sos"), "confiat" (zi "gătit lent"), "topping" (zi "garnitură")

RETURNEAZĂ DOAR JSON VALID, fără text înainte sau după.`;

  const userPrompt = `PRODUSE LA OFERTĂ ÎN MAGAZINE ACUM:
${productList}

CATEGORIE CERUTĂ: ${categoryHint}
${avoidList}

CONTEXT SEZONIER: Suntem în ${seasonHint}

SARCINĂ:
Recomandă o rețetă REALĂ și CUNOSCUTĂ din categoria cerută, potrivită sezonului actual.

REGULI OBLIGATORII:
1. Rețeta trebuie să fie o rețetă pe care o găsești pe orice blog culinar sau carte de bucate. NU inventa rețete noi.
   - BINE: "Ciorbă de perișoare", "Paste Carbonara", "Clătite cu Nutella", "Papanași", "Musaca de cartofi"
   - RĂU: "Salată fusion de ton cu biscuiți", "Pui descompus tropical", "Mix exotic de cereale"
2. Folosește CÂT MAI MULTE ingrediente din lista de oferte de mai sus.${storeHint}
3. Dacă rețeta are nevoie de ingrediente de bază care NU sunt în lista de oferte (sare, piper, apă, ulei), include-le dar marchează-le.
4. Titlul trebuie să fie APETISANT și FAMILIAR (cum l-ai găsi pe Google).
5. Instrucțiunile trebuie să fie DETALIATE: temperaturi exacte, cantități în grame, timpi de gătit.

FORMAT JSON STRICT:
{
  "title": "Titlu apetisant și familiar (ex: Ciorbă de perișoare pufoase)",
  "description": "1-2 fraze care te fac să salivezi",
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "difficulty": "ușor",
  "estimatedCost": 25.00,
  "ingredients": [
    { "product_id": "ID-ul exact din lista de produse", "name": "Piept de pui", "quantity": "500", "unit": "g", "onSale": true },
    { "product_id": "pantry", "name": "Sare", "quantity": "1", "unit": "lingurită", "onSale": false }
  ],
  "steps": [
    "Pas 1 detaliat cu temperaturi și cantități...",
    "Pas 2..."
  ],
  "tips": ["Sfat practic util"],
  "tags": ["tradițional", "prânz", "economic"],
  "nutritionalInfo": {
    "calories": 450,
    "protein": 25,
    "carbs": 40,
    "fat": 15,
    "fiber": 5
  }
}

IMPORTANT: Referențiază produsele prin ID-ul lor exact din lista de oferte (marcat cu [ID: xxx]).
Dacă un ingredient NU e în lista de oferte (sare, piper, apă, ulei), pune product_id: "pantry".`;

  const response = await callAI(userPrompt, systemPrompt);

  try {
    let jsonStr = response;
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = response.substring(firstBrace, lastBrace + 1);
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
async function saveRecipe(recipeData, availableProducts = [], allExistingTitles = []) {
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

    // Smart deduplication: check title similarity (not just exact slug)
    if (isSimilarTitle(recipeData.title, allExistingTitles)) {
      log.info(`Recipe "${recipeData.title}" is too similar to an existing recipe, skipping`);
      return null;
    }

    // MATCHING LOGIC: Try to link AI ingredients to real Product IDs
    const matchedIngredients = (recipeData.ingredients || []).map(ing => {
      // 0. If product_id is "pantry", it's a basic ingredient not from stores
      if (ing.product_id === 'pantry') {
        return {
          name: ing.name || 'ingredient de bază',
          quantity: ing.quantity,
          unit: ing.unit || 'buc',
        };
      }

      // 1. Try exact product_id match first (AI was told to reference by ID)
      if (ing.product_id && ing.product_id !== 'pantry') {
        const idMatch = availableProducts.find(p => p.id === ing.product_id);
        if (idMatch) {
          return {
            id: idMatch.id,
            name: ing.name || idMatch.name,
            quantity: ing.quantity,
            unit: ing.unit || idMatch.unit || 'buc',
            matchedProduct: idMatch.name
          };
        }
      }

      const ingName = (ing.name || '').toLowerCase();

      // 2. Try exact name match
      let match = availableProducts.find(p =>
        p.name.toLowerCase() === ingName
      );

      // 3. Try fuzzy match: Product name contains ingredient name
      if (!match) {
        match = availableProducts.find(p =>
          p.name.toLowerCase().includes(ingName)
        );
      }

      // 4. Try reverse fuzzy: Ingredient name contains product name
      if (!match) {
        match = availableProducts.find(p =>
          ingName.includes(p.name.toLowerCase())
        );
      }

      if (match) {
        return {
          id: match.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          matchedProduct: match.name
        };
      }

      // No match - keep as plain ingredient
      return {
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      };
    });

    // Calculate dietary flags from recipe content
    const stepsArray = (recipeData.steps || recipeData.instructions || []);
    const stepsText = stepsArray.map(s => typeof s === 'string' ? s : (s.text || '')).join(' ');
    const dietaryText = recipeData.title + ' ' + stepsText + ' ' +
      matchedIngredients.map(i => i.name).join(' ');
    const dietaryFlags = calculateDietaryFlags(dietaryText);

    // Calculate real cost from matched product prices (fallback to AI estimate)
    const realCost = calculateRealCost(matchedIngredients, availableProducts);
    const finalCost = realCost > 0 ? realCost : (recipeData.estimatedCost || 25);
    if (realCost > 0) {
      log.info(`Real cost: ${realCost} lei (AI estimated: ${recipeData.estimatedCost || '?'} lei)`);
    }

    const recipe = await prisma.recipe.create({
      data: {
        title: recipeData.title,
        slug: slug,
        description: recipeData.description,
        cookTime: recipeData.cook_time || recipeData.cookingTime || 30,
        prepTime: recipeData.prep_time || 10,
        totalTime: (recipeData.cook_time || recipeData.cookingTime || 30) + (recipeData.prep_time || 10),
        servings: recipeData.servings || 4,
        difficulty: normalizeDifficulty(recipeData.difficulty || 'mediu'),
        estimatedCost: finalCost,
        ingredientIds: JSON.stringify(matchedIngredients),
        instructions: JSON.stringify(recipeData.steps || recipeData.instructions || []),
        tips: JSON.stringify(recipeData.tips || []),
        tags: JSON.stringify(generateSmartTags(recipeData)),
        metaDescription: (recipeData.description || '').substring(0, 160),
        nutritionPerServing: recipeData.nutritionalInfo ? JSON.stringify(recipeData.nutritionalInfo) : null,
        calories: recipeData.nutritionalInfo?.calories || null,
        isPublished: true,
        ...dietaryFlags,
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
 * Generate multiple recipes with category variety
 */
async function generateWeeklyRecipes(count = 10) {
  log.info(`Starting generation of ${count} REAL recipes`);

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

  // Get ALL cooking products on sale (no arbitrary limit)
  const products = await getProductsOnSale();
  log.info(`Found ${products.length} cooking products on sale`);

  if (products.length === 0) {
    writeStatus({
      running: false,
      current: 0,
      total: count,
      message: 'Nu s-au găsit produse la ofertă.',
      complete: true,
      generatedCount: 0,
      error: null
    });
    return [];
  }

  writeStatus({
    running: true,
    current: 0,
    total: count,
    message: `Găsite ${products.length} produse alimentare la ofertă`,
    complete: false,
    generatedCount: 0,
    error: null
  });

  // Get existing recipe titles to avoid duplicates
  const existingRecipes = await prisma.recipe.findMany({
    select: { title: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  const existingTitles = existingRecipes.map(r => r.title);

  const createdRecipes = [];

  for (let i = 0; i < count; i++) {
    try {
      // Use seasonal categories for variety
      const seasonCategories = getSeasonalCategories();
      const categoryHint = seasonCategories[i % seasonCategories.length];

      log.info(`Generating recipe ${i + 1}/${count} (${categoryHint})...`);

      writeStatus({
        running: true,
        current: i,
        total: count,
        message: `Generăm rețeta ${i + 1}/${count}: ${categoryHint}...`,
        complete: false,
        generatedCount: createdRecipes.length,
        error: null
      });

      // Pass ALL products - the AI sees everything available
      const recipeData = await generateRecipe(
        products,
        categoryHint,
        [...existingTitles, ...createdRecipes.map(r => r.title)]
      );

      if (recipeData) {
        // Quality validation before saving
        if (!validateRecipeQuality(recipeData)) {
          log.info(`Recipe "${recipeData.title}" failed quality check, skipping`);
          continue;
        }

        const allTitles = [...existingTitles, ...createdRecipes.map(r => r.title)];
        const saved = await saveRecipe(recipeData, products, allTitles);
        if (saved) {
          createdRecipes.push(saved);
        } else {
          // Dedup collision - retry once with a different category
          log.info(`Retrying with different category after dedup collision...`);
          const retryCategory = seasonCategories[(i + 5) % seasonCategories.length];
          await new Promise(resolve => setTimeout(resolve, 2000));
          const retryData = await generateRecipe(products, retryCategory, allTitles);
          if (retryData && validateRecipeQuality(retryData)) {
            const retrySaved = await saveRecipe(retryData, products, allTitles);
            if (retrySaved) createdRecipes.push(retrySaved);
          }
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      log.error(`Failed to generate recipe ${i + 1}: ${error.message}`);
    }
  }

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
  log.info('Starting Weekly Recipe Generation (REAL RECIPES MODE)');
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
