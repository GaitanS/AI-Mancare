/**
 * Recipe Generator using OpenRouter + Gemini
 *
 * KEY PRINCIPLE: The AI suggests REAL, WELL-KNOWN recipes that use
 * ingredients currently on sale. It does NOT invent new recipes.
 */

import OpenAI from 'openai';
import type { Product, GeneratedRecipe } from '@/types';
import { generateSlug, sleep, normalizeDifficulty } from '@/lib/utils';
import prisma from '@/lib/db';
import { calculateDietaryFlags } from '@/lib/dietary';
import { logger } from '@/lib/logger';
import { findMatchingArchivedRecipes, reactivateRecipe } from '@/lib/ai/weekly-archive';
import { trackAiUsage, checkBudgetLimit } from '@/lib/ai/budget-tracker';

// Max characters for the product list in the prompt (~1 token per 4 chars, keep under ~6000 tokens)
const MAX_PROMPT_PRODUCTS = 500;

// ─── SEASONAL AWARENESS ───
function getSeasonHint(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 11 || month <= 1) return 'iarnă (preferă supe, ciorbe, tocănițe, mâncăruri la cuptor, comfort food)';
  if (month >= 2 && month <= 4) return 'primăvară (preferă mâncăruri ușoare, legume proaspete de sezon, paste)';
  if (month >= 5 && month <= 7) return 'vară (preferă salate, grătare, mâncăruri reci, rețete rapide, deserturi răcoritoare)';
  return 'toamnă (preferă supe cremă, plăcinte, tocănițe, mâncăruri cu legume de toamnă)';
}

function getSeasonalCategories(): string[] {
  const month = new Date().getMonth();
  // Winter - more soups/stews, fewer salads
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
  // Summer - more salads/grills, fewer heavy stews
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
  // Spring/Autumn - balanced
  return RECIPE_CATEGORIES;
}

// ─── SMART DEDUPLICATION ───
function isSimilarTitle(newTitle: string, existingTitles: string[]): boolean {
  const normalize = (t: string) => t.toLowerCase()
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
function getDominantStores(products: Product[]): string[] {
  const storeCounts: Record<string, number> = {};
  for (const p of products) {
    storeCounts[p.store] = (storeCounts[p.store] || 0) + 1;
  }
  // Sort by product count descending, take top 3
  return Object.entries(storeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([store]) => store);
}

// ─── RECIPE QUALITY VALIDATION ───
function validateRecipeQuality(recipe: GeneratedRecipe): boolean {
  const errors: string[] = [];

  if (!recipe.title || recipe.title.trim().length < 5) {
    errors.push('Title too short or missing');
  }

  const ingredients = recipe.ingredients || [];
  if (ingredients.length < 3) {
    errors.push(`Too few ingredients: ${ingredients.length} (minimum 3)`);
  }

  const steps = recipe.instructions || [];
  if (steps.length < 2) {
    errors.push(`Too few steps: ${steps.length} (minimum 2)`);
  }

  const cookTime = recipe.cook_time || 0;
  const prepTime = recipe.prep_time || 0;
  if (cookTime + prepTime <= 0) {
    errors.push('Total time must be > 0');
  }

  if (errors.length > 0) {
    console.error(`[RECIPE GEN] Quality check failed for "${recipe.title || 'unknown'}": ${errors.join('; ')}`);
    return false;
  }
  return true;
}

// ─── SMART TAG GENERATION ───
function generateSmartTags(recipe: GeneratedRecipe): string[] {
  const tags = new Set<string>();
  const title = (recipe.title || '').toLowerCase();
  const allText = title + ' ' + (recipe.description || '').toLowerCase();

  // Difficulty
  tags.add(recipe.difficulty || 'mediu');

  // Always economic
  tags.add('economic');

  // Servings
  tags.add(`${recipe.servings || 4} portii`);

  // Total time
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
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
function calculateRealCost(matchedIngredients: any[], allProducts: Product[]): number {
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
  // If we matched at least half the ingredients, use real cost; otherwise fallback
  if (matchedCount >= matchedIngredients.length * 0.4) {
    return Math.round(total * 100) / 100;
  }
  return 0; // 0 means "use AI estimate"
}

// OpenRouter client (OpenAI-compatible API)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'CatalogSmart Recipe Generator',
  },
});

const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.5-flash';

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
function isCookingIngredient(productName: string): boolean {
  const nameLower = productName.toLowerCase();
  return !NON_COOKING_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

/**
 * Group products by rough category for better AI understanding
 */
function groupProductsByCategory(products: Product[]): Record<string, Product[]> {
  const categories: Record<string, Product[]> = {
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
    } else if (/apă|apa|suc |nectar|limonadă|limonada|vin |must/.test(name)) {
      categories['Băuturi (pt gătit)'].push(p);
    } else {
      categories['Altele'].push(p);
    }
  }

  return categories;
}

/**
 * Format products into a compact categorized list for the AI prompt
 * Uses compressed format: CATEGORY: Name price discount #id | ...
 * Saves ~30% tokens compared to verbose multi-line format
 */
function formatProductsForPrompt(products: Product[]): string {
  // Deduplicate by name
  const unique = Array.from(new Map(products.map(p => [p.name, p])).values());

  // Limit to MAX_PROMPT_PRODUCTS to avoid token overflow
  // Prioritize by discount (best deals first)
  const limited = unique
    .sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0))
    .slice(0, MAX_PROMPT_PRODUCTS);

  if (unique.length > MAX_PROMPT_PRODUCTS) {
    console.log(`[RECIPE GEN] Truncated product list from ${unique.length} to ${MAX_PROMPT_PRODUCTS} (best deals first)`);
  }

  const grouped = groupProductsByCategory(limited);

  // Map category names to short ALL CAPS labels
  const categoryShortNames: Record<string, string> = {
    'Carne & Mezeluri': 'CARNE',
    'Pește & Fructe de mare': 'PESTE',
    'Lactate & Ouă': 'LACTATE',
    'Legume & Fructe': 'LEGUME',
    'Pâine & Panificație': 'PAINE',
    'Paste, Orez & Cereale': 'PASTE/CEREALE',
    'Conserve & Sosuri': 'CONSERVE',
    'Condimente & Uleiuri': 'CONDIMENTE',
    'Dulciuri & Deserturi': 'DULCIURI',
    'Băuturi (pt gătit)': 'BAUTURI',
    'Altele': 'ALTELE',
  };

  let text = '';
  for (const [category, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    const shortName = categoryShortNames[category] || category.toUpperCase();
    const itemStrs = items.map(p => {
      const discount = p.discountPercentage ? ` -${p.discountPercentage}%` : '';
      return `${p.name} ${Number(p.price).toFixed(2)}lei${discount} #${p.id}`;
    });
    text += `\n${shortName}: ${itemStrs.join(' | ')}`;
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

interface RecipeConstraints {
  maxCost?: number;
  maxTime?: number;
  dietary?: string[];
  preferredStores?: string[];
  categoryHint?: string;
  existingTitles?: string[];
}

/**
 * Generate a single REAL recipe based on available products
 */
export async function generateRecipe(
  availableProducts: Product[],
  constraints: RecipeConstraints = {},
  retryCount: number = 0
): Promise<GeneratedRecipe> {
  try {
    const productList = formatProductsForPrompt(availableProducts);

    const avoidList = constraints.existingTitles && constraints.existingTitles.length > 0
      ? `\nNU repeta aceste rețete deja generate: ${constraints.existingTitles.join(', ')}`
      : '';

    const categoryLine = constraints.categoryHint
      ? `CATEGORIE CERUTĂ: ${constraints.categoryHint}`
      : 'CATEGORIE: Orice tip de rețetă';

    const systemPrompt = `Ești un chef profesionist cu experiență în bucătăria românească și internațională.

ROLUL TĂU: Recomanzi rețete REALE, CUNOSCUTE, pe care oamenii le caută pe bloguri culinare (Jamila, Laura Laurențiu, Savori Urbane, Gina Bradea) sau în cărți de bucate. NU inventezi rețete noi.

STIL DE SCRIERE:
- Cald, prietenos, explicativ, ca o gospodină expertă
- Explică DE CE facem un pas ("călim ceapa ca să devină dulce")
- Folosește termeni românești: "călit", "înăbușit", "rumenit", "dres cu ou", "scăzut"
- NU folosi: "dressing" (zi "sos"), "confiat" (zi "gătit lent"), "topping" (zi "garnitură")

RETURNEAZĂ DOAR JSON VALID, fără text explicativ înainte sau după!

Schema JSON obligatorie:
{
  "title": "string (titlul rețetei în română, familiar și apetisant)",
  "description": "string (1-2 fraze care te fac să salivezi)",
  "servings": number (nr porții),
  "prep_time": number (minute preparare),
  "cook_time": number (minute gătit),
  "difficulty": "ușor" | "mediu" | "dificil",
  "ingredients": [{"product_id": "string (ID din lista de produse, sau 'pantry' dacă nu e în listă)", "quantity": "string", "notes": "string optional"}],
  "instructions": [{"step": number, "text": "string detaliat cu temperaturi și cantități"}],
  "tips": ["string"],
  "estimated_cost": number (cost total în lei),
  "nutritionalInfo": {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number}
}`;

    // Smart context: season + dominant stores
    const seasonHint = getSeasonHint();
    const dominantStores = getDominantStores(availableProducts);
    const storeHint = dominantStores.length > 0
      ? `\n- Magazine cu cele mai multe oferte: ${dominantStores.join(', ')} (preferă ingrediente dintr-un singur magazin dacă posibil)`
      : '';

    const userPrompt = `PRODUSE DISPONIBILE LA OFERTĂ ÎN MAGAZINE:
${productList}

${categoryLine}
${avoidList}

CONTEXT SEZONIER: Suntem în ${seasonHint}

CONSTRÂNGERI:
- Cost maxim: ${constraints.maxCost || 50} lei
- Timp maxim preparare: ${constraints.maxTime || 60} minute
- Restricții dietetice: ${constraints.dietary?.join(', ') || 'fără restricții'}${storeHint}

SARCINĂ:
Recomandă o rețetă REALĂ și CUNOSCUTĂ, potrivită sezonului actual.

REGULI OBLIGATORII:
1. Rețeta trebuie să fie una pe care o găsești pe orice blog culinar sau carte de bucate. NU inventa rețete noi.
   - BINE: "Ciorbă de perișoare", "Paste Carbonara", "Clătite cu Nutella", "Papanași", "Musaca de cartofi"
   - RĂU: "Salată fusion de ton cu biscuiți", "Pui descompus tropical", "Mix exotic de cereale"
2. Folosește CÂT MAI MULTE ingrediente din lista de oferte de mai sus.
3. Dacă rețeta are nevoie de ingrediente de bază care NU sunt în oferte (sare, piper, apă, ulei), include-le cu product_id: "pantry".
4. Referențiază produsele prin ID-ul lor exact din lista de mai sus (marcat cu #id).
5. Instrucțiunile trebuie să fie DETALIATE: temperaturi exacte, cantități, timpi de gătit.
6. Returnează DOAR JSON valid!`;

    const startTime = Date.now();
    const response = await openrouter.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });
    const duration = Date.now() - startTime;

    // Track AI budget
    const usage = response.usage;
    if (usage) {
      trackAiUsage({
        operation: 'recipe_generation',
        model: AI_MODEL,
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        duration,
      }).catch(() => {}); // Fire and forget
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Clean potential markdown formatting and extract JSON
    let jsonContent = content;
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonContent = content.substring(firstBrace, lastBrace + 1);
    }

    const result = JSON.parse(jsonContent.trim());
    return result as GeneratedRecipe;
  } catch (error: any) {
    if (retryCount < 2) {
      const isRateLimit = error.status === 429 || error.message?.includes('rate');
      const delay = isRateLimit ? 5000 * (retryCount + 1) : 2000 * Math.pow(2, retryCount);
      console.warn(`[RECIPE GEN] Attempt ${retryCount + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
      return generateRecipe(availableProducts, constraints, retryCount + 1);
    }
    console.error('Error generating recipe:', error);
    throw new Error(`Failed to generate recipe: ${error.message}`);
  }
}

// Status Interface
interface RecipeStatus {
  running: boolean;
  current: number;
  total: number;
  message: string;
  complete?: boolean;
  error?: string;
  generatedCount?: number;
  updatedAt?: string;
}

// Helper to update status file
async function updateStatus(status: RecipeStatus) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const storagePath = path.join(process.cwd(), 'storage');
    const statusPath = path.join(storagePath, 'recipes-status.json');

    await fs.mkdir(storagePath, { recursive: true });

    // Atomic write: write to temp file, then rename
    const tempPath = path.join(storagePath, `.recipes-status.tmp.${Date.now()}`);
    await fs.writeFile(tempPath, JSON.stringify({
      ...status,
      updatedAt: new Date().toISOString()
    }, null, 2));
    await fs.rename(tempPath, statusPath);
  } catch (e) {
    console.error('Failed to update recipe status file:', e);
  }
}

/**
 * Get ALL cooking products on sale (no arbitrary limit)
 */
async function getCookingProductsOnSale(preferredStores?: string[]): Promise<Product[]> {
  const where: any = {
    validUntil: {
      gte: new Date(),
    },
  };

  if (preferredStores && preferredStores.length > 0) {
    where.store = { in: preferredStores };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [
      { discountPercentage: 'desc' },
      { price: 'asc' },
    ],
    take: 2000, // Cap memory usage
  });

  // Filter to cooking ingredients only
  const cookingProducts = products.filter(p => isCookingIngredient(p.name));

  console.log(`[RECIPE GEN] Found ${products.length} total products, ${cookingProducts.length} are cooking ingredients`);

  // Convert Prisma Decimal to number
  return cookingProducts.map(p => ({
    ...p,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
  }));
}

/**
 * Generate weekly recipes based on current offers
 */
export async function generateWeeklyRecipes(count: number = 10): Promise<string[]> {
  console.log('[RECIPE GEN] Starting weekly recipe generation (REAL RECIPES MODE)');

  await updateStatus({
    running: true,
    current: 0,
    total: count,
    message: 'Starting recipe generation...',
    generatedCount: 0
  });

  try {
    // Budget check - abort if daily limit exceeded
    const overBudget = await checkBudgetLimit('recipe_generation');
    if (overBudget) {
      console.warn('[RECIPE GEN] Daily AI budget exceeded, aborting generation');
      await updateStatus({
        running: false,
        current: 0,
        total: count,
        message: 'Daily AI budget limit exceeded. Stopping.',
        complete: true,
        generatedCount: 0
      });
      return [];
    }

    // Get ALL cooking products on sale (no arbitrary limit)
    const typedProducts = await getCookingProductsOnSale();

    if (typedProducts.length === 0) {
      console.warn('[RECIPE GEN] No cooking products found with active offers');
      await updateStatus({
        running: false,
        current: 0,
        total: count,
        message: 'No products found with offers. Stopping.',
        complete: true,
        generatedCount: 0
      });
      return [];
    }

    // Get existing recipe titles to avoid duplicates
    const existingRecipes = await prisma.recipe.findMany({
      select: { title: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    const existingTitles = existingRecipes.map(r => r.title);

    const recipeIds: string[] = [];
    const newTitles: string[] = [];

    // ── ARCHIVE REUSE: Try to reactivate archived recipes first ──
    let remainingCount = count;
    try {
      const productNames = typedProducts.map(p => p.name);
      const archivedMatches = await findMatchingArchivedRecipes(productNames, 0.7);
      const maxReactivate = Math.ceil(count / 2);
      let reactivated = 0;

      for (const match of archivedMatches) {
        if (reactivated >= maxReactivate) break;

        // Check slug doesn't already exist
        const existing = await prisma.recipe.findUnique({
          where: { slug: match.archive.slug }
        });
        if (existing) continue;
        if (isSimilarTitle(match.archive.title, [...existingTitles, ...newTitles])) continue;

        // Find matching products for this archived recipe
        const archiveIngredients: string[] = JSON.parse(match.archive.ingredientNames);
        const matchedProductIds = archiveIngredients
          .map(name => {
            const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return typedProducts.find(p =>
              p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalized) ||
              normalized.includes(p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
            );
          })
          .filter(Boolean)
          .map(p => p!.id);

        const reactivatedId = await reactivateRecipe(match.archive.id, matchedProductIds);
        if (reactivatedId) {
          recipeIds.push(reactivatedId);
          newTitles.push(match.archive.title);
          reactivated++;
          console.log(`[RECIPE GEN] Reactivated archived recipe: ${match.archive.title} (score: ${match.matchScore.toFixed(2)})`);
        }
      }

      if (reactivated > 0) {
        remainingCount = count - reactivated;
        console.log(`[RECIPE GEN] Reactivated ${reactivated} archived recipes, generating ${remainingCount} new ones`);
      }
    } catch (archiveError) {
      console.warn('[RECIPE GEN] Archive reuse failed:', archiveError);
      remainingCount = count; // Explicitly reset to full count on failure
    }

    // Helper function to generate and save a single recipe
    const generateAndSaveRecipe = async (
      index: number,
      products: Product[],
      allExistingTitles: string[],
      seasonCategories: string[],
      recipeConstraints: { count: number; remainingCount: number }
    ): Promise<{ id: string; title: string } | null> => {
      const categoryHint = seasonCategories[index % seasonCategories.length];
      console.log(`[RECIPE GEN] Generating recipe ${index + 1}/${recipeConstraints.remainingCount} (${categoryHint})`);

      const constraints: RecipeConstraints = {
        maxCost: 20 + index * 5,
        maxTime: 60,
        dietary: index % 4 === 0 ? ['vegetarian'] : [],
        categoryHint,
        existingTitles: allExistingTitles,
      };

      let recipe = await generateRecipe(products, constraints);

      // Quality validation before saving
      if (!validateRecipeQuality(recipe)) {
        console.log(`[RECIPE GEN] Recipe "${recipe.title}" failed quality check, skipping`);
        return null;
      }

      // Create slug
      let slug = generateSlug(recipe.title);

      // Check if recipe with this slug already exists or title is too similar
      const existing = await prisma.recipe.findUnique({ where: { slug } });
      const tooSimilar = isSimilarTitle(recipe.title, allExistingTitles);

      if (existing || tooSimilar) {
        console.log(`[RECIPE GEN] Recipe "${recipe.title}" collided (${existing ? 'slug exists' : 'similar title'}), retrying...`);
        const retryCategory = seasonCategories[(index + 5) % seasonCategories.length];
        await sleep(2000);
        try {
          const retryRecipe = await generateRecipe(products, { ...constraints, categoryHint: retryCategory, existingTitles: allExistingTitles });
          if (!validateRecipeQuality(retryRecipe)) return null;
          const retrySlug = generateSlug(retryRecipe.title);
          const retryExists = await prisma.recipe.findUnique({ where: { slug: retrySlug } });
          if (retryExists || isSimilarTitle(retryRecipe.title, allExistingTitles)) return null;
          recipe = retryRecipe;
          slug = retrySlug;
        } catch {
          return null;
        }
      }

      // Match AI ingredients to real product data
      const matchedIngredients = (recipe.ingredients || []).map((ing) => {
        if (ing.product_id === 'pantry') {
          return {
            name: ing.notes || ing.quantity || 'ingredient de baza',
            quantity: ing.quantity,
            unit: 'buc',
          };
        }

        const matchedProduct = products.find(p => p.id === ing.product_id);
        if (matchedProduct) {
          return {
            id: matchedProduct.id,
            name: matchedProduct.name,
            quantity: ing.quantity,
            unit: matchedProduct.unit || 'buc',
          };
        }

        const ingName = (ing.notes || ing.product_id || '').toLowerCase();
        const fuzzyMatch = products.find(p =>
          p.name.toLowerCase().includes(ingName) || ingName.includes(p.name.toLowerCase())
        );

        if (fuzzyMatch) {
          return {
            id: fuzzyMatch.id,
            name: fuzzyMatch.name,
            quantity: ing.quantity,
            unit: fuzzyMatch.unit || 'buc',
          };
        }

        return {
          name: ing.notes || ing.product_id || 'ingredient',
          quantity: ing.quantity,
          unit: 'buc',
        };
      });

      // Build dietary text for flag calculation
      const instructionTexts = (recipe.instructions || []).map((s: any) =>
        typeof s === 'string' ? s : s.text || ''
      );
      const dietaryText = recipe.title + ' ' +
        instructionTexts.join(' ') + ' ' +
        matchedIngredients.map(i => i.name).join(' ');

      const prepTime = recipe.prep_time || 0;
      const cookTime = recipe.cook_time || 0;

      // Calculate real cost from matched product prices (fallback to AI estimate)
      const realCost = calculateRealCost(matchedIngredients, products);
      const finalCost = realCost > 0 ? realCost : (recipe.estimated_cost || 0);
      if (realCost > 0) {
        console.log(`[RECIPE GEN] Real cost: ${realCost} lei (AI estimated: ${recipe.estimated_cost || '?'} lei)`);
      }

      // Save to database
      const saved = await prisma.recipe.create({
        data: {
          title: recipe.title,
          description: recipe.description || '',
          servings: recipe.servings || 4,
          prepTime,
          cookTime,
          totalTime: prepTime + cookTime,
          difficulty: normalizeDifficulty(recipe.difficulty || 'mediu'),
          isPublished: true,
          instructions: JSON.stringify(recipe.instructions || []),
          tips: JSON.stringify(recipe.tips || []),
          ingredientIds: JSON.stringify(matchedIngredients),
          estimatedCost: finalCost,
          slug,
          metaDescription: (recipe.description || '').substring(0, 160),
          tags: JSON.stringify(generateSmartTags(recipe)),
          nutritionPerServing: recipe.nutritionalInfo ? JSON.stringify(recipe.nutritionalInfo) : null,
          calories: recipe.nutritionalInfo?.calories || null,
          ...calculateDietaryFlags(dietaryText),
        },
      });

      console.log(`[RECIPE GEN] Created recipe: ${recipe.title} (ID: ${saved.id})`);
      return { id: saved.id, title: recipe.title };
    };

    // Process in batches of 3 for parallel generation
    const BATCH_SIZE = 3;
    const seasonCategories = getSeasonalCategories();

    for (let batchStart = 0; batchStart < remainingCount; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, remainingCount);
      const overallBase = count - remainingCount;

      await updateStatus({
        running: true,
        current: overallBase + batchStart + 1,
        total: count,
        message: `Generating recipes ${overallBase + batchStart + 1}-${overallBase + batchEnd}/${count}...`,
        generatedCount: recipeIds.length
      });

      // Snapshot current titles for this batch (shared read, collect after)
      const batchTitles = [...existingTitles, ...newTitles];

      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(
          generateAndSaveRecipe(
            i,
            typedProducts,
            batchTitles,
            seasonCategories,
            { count, remainingCount }
          ).catch(error => {
            console.error(`[RECIPE GEN] Error generating recipe ${i + 1}:`, error);
            return null;
          })
        );
      }

      const results = await Promise.allSettled(batchPromises);

      // Collect successful results and update shared title list
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          recipeIds.push(result.value.id);
          newTitles.push(result.value.title);
        }
      }

      // Rate limit between batches, not between individual recipes
      if (batchStart + BATCH_SIZE < remainingCount) {
        await sleep(3000);
      }
    }

    console.log(`[RECIPE GEN] Generated ${recipeIds.length} recipes successfully`);

    await updateStatus({
      running: false,
      current: count,
      total: count,
      message: `Complete! Generated ${recipeIds.length} new recipes.`,
      complete: true,
      generatedCount: recipeIds.length
    });

    return recipeIds;
  } catch (error: any) {
    console.error('[RECIPE GEN] Fatal error:', error);

    await updateStatus({
      running: false,
      current: 0,
      total: count,
      message: `Error: ${error.message}`,
      error: error.message,
      complete: false
    });

    throw error;
  }
}

/**
 * Generate a custom recipe based on user preferences
 */
export async function generateCustomRecipe(
  budget: number,
  servings: number = 4,
  dietaryRestrictions: string[] = [],
  preferredStores: string[] = []
): Promise<GeneratedRecipe> {
  console.log('[RECIPE GEN] Generating custom recipe (REAL RECIPES MODE)');

  try {
    // Get ALL cooking products on sale (no arbitrary limit)
    const typedProducts = await getCookingProductsOnSale(
      preferredStores.length > 0 ? preferredStores : undefined
    );

    if (typedProducts.length === 0) {
      throw new Error('No cooking products found matching criteria');
    }

    const recipe = await generateRecipe(typedProducts, {
      maxCost: budget,
      maxTime: 60,
      dietary: dietaryRestrictions,
      preferredStores,
    });

    return recipe;
  } catch (error) {
    console.error('[RECIPE GEN] Error generating custom recipe:', error);
    throw error;
  }
}

export default {
  generateRecipe,
  generateWeeklyRecipes,
  generateCustomRecipe,
};
