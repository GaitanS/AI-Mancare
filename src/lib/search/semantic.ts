/**
 * Lightweight Semantic Search via AI Keyword Expansion
 *
 * Used as Tier 3 fallback when FULLTEXT + fuzzy return < 2 results.
 * Makes a single budget API call to expand conceptual queries into food keywords.
 * Only triggered for searches that fail normal matching.
 */

import prisma from '@/lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Cache expanded queries to avoid duplicate API calls
const expansionCache = new Map<string, string[]>();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cacheTimestamps = new Map<string, number>();

/**
 * Expand a conceptual query into concrete food-related search terms.
 * Example: "ceva ușor de gătit" → ["omletă", "salată", "toast", "sandviș"]
 * Example: "mâncare sănătoasă" → ["salată", "supă legume", "pui grill", "quinoa"]
 *
 * Returns empty array if AI expansion is not available or fails.
 */
export async function expandQueryWithAI(query: string): Promise<string[]> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = expansionCache.get(cacheKey);
  const cachedTime = cacheTimestamps.get(cacheKey);

  if (cached && cachedTime && (Date.now() - cachedTime) < CACHE_TTL_MS) {
    return cached;
  }

  if (!OPENROUTER_API_KEY) {
    // Fallback to rule-based expansion if no API key
    return ruleBasedExpansion(query);
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'Ești un asistent care expandează căutări alimentare în română. Răspunde DOAR cu o listă JSON de 5-8 cuvinte-cheie concrete (ingrediente, rețete, categorii de produse). Fără explicații, doar array-ul JSON.',
          },
          {
            role: 'user',
            content: `Expandează căutarea "${query}" în cuvinte-cheie concrete pentru produse alimentare sau rețete românești. Răspunde doar cu un array JSON de stringuri.`,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      return ruleBasedExpansion(query);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) return ruleBasedExpansion(query);

    // Parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return ruleBasedExpansion(query);

    const keywords: string[] = JSON.parse(jsonMatch[0]);
    const result = keywords
      .filter((k): k is string => typeof k === 'string' && k.length > 1)
      .slice(0, 8);

    // Cache the result
    if (expansionCache.size >= CACHE_MAX_SIZE) {
      // Evict oldest entry
      const oldest = Array.from(cacheTimestamps.entries()).sort((a, b) => a[1] - b[1])[0];
      if (oldest) {
        expansionCache.delete(oldest[0]);
        cacheTimestamps.delete(oldest[0]);
      }
    }
    expansionCache.set(cacheKey, result);
    cacheTimestamps.set(cacheKey, Date.now());

    return result;
  } catch {
    return ruleBasedExpansion(query);
  }
}

/**
 * Rule-based fallback when AI is not available.
 * Maps common Romanian conceptual food queries to concrete terms.
 */
function ruleBasedExpansion(query: string): string[] {
  const q = query.toLowerCase();

  const CONCEPT_MAP: Record<string, string[]> = {
    'usor de gatit':  ['omletă', 'salată', 'sandviș', 'paste', 'toast'],
    'rapid':          ['omletă', 'sandviș', 'salată', 'wrap', 'smoothie'],
    'sanatos':        ['salată', 'supă legume', 'pui grill', 'pește', 'quinoa'],
    'sanatoasa':      ['salată', 'supă', 'legume', 'fructe', 'cereale'],
    'ieftin':         ['cartofi', 'paste', 'orez', 'fasole', 'ouă', 'mămăligă'],
    'copii':          ['paste', 'pizza', 'clătite', 'pui', 'cartofi prăjiți'],
    'desert':         ['prăjitură', 'tort', 'clătite', 'înghețată', 'biscuiți'],
    'mic dejun':      ['ouă', 'pâine', 'cereale', 'lapte', 'brânză', 'omletă'],
    'cina':           ['supă', 'ciorba', 'friptură', 'salată', 'paste'],
    'pranz':          ['supă', 'ciorbă', 'friptură', 'cartofi', 'orez'],
    'vegetarian':     ['legume', 'tofu', 'ciuperci', 'fasole', 'linte', 'mazăre'],
    'vegan':          ['legume', 'tofu', 'năut', 'linte', 'avocado', 'quinoa'],
    'fara gluten':    ['orez', 'cartofi', 'mălai', 'quinoa', 'hrișcă'],
    'romanesc':       ['ciorbă', 'sarmale', 'mici', 'mămăligă', 'tocană'],
    'traditional':    ['sarmale', 'ciorbă', 'mămăligă', 'cozonac', 'plăcintă'],
    'supa':           ['ciorbă', 'supă cremă', 'borș', 'supă pui'],
    'ciorba':         ['ciorbă', 'borș', 'supă'],
    'gratar':         ['mici', 'cârnați', 'pui grill', 'legume grill', 'ceafă'],
    'proteine':       ['pui', 'pește', 'ouă', 'brânză', 'carne vită', 'tofu'],
    'diet':           ['salată', 'pui grill', 'legume', 'pește', 'supă'],
  };

  const results: string[] = [];

  for (const [concept, keywords] of Object.entries(CONCEPT_MAP)) {
    if (q.includes(concept) || concept.includes(q)) {
      results.push(...keywords);
    }
  }

  // Deduplicate
  return [...new Set(results)].slice(0, 8);
}

/**
 * Search products and recipes using semantically expanded terms.
 * Returns product IDs and recipe IDs.
 */
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<{ productIds: string[]; recipeIds: string[] }> {
  const keywords = await expandQueryWithAI(query);

  if (keywords.length === 0) {
    return { productIds: [], recipeIds: [] };
  }

  const now = new Date();

  // Search products with expanded keywords
  const productOrConditions = keywords.flatMap(k => [
    { name: { contains: k } },
    { category: { contains: k } },
  ]);

  const recipeOrConditions = keywords.flatMap(k => [
    { title: { contains: k } },
    { description: { contains: k } },
  ]);

  const [products, recipes] = await Promise.all([
    prisma.product.findMany({
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
        OR: productOrConditions,
      },
      select: { id: true },
      take: limit,
    }),
    prisma.recipe.findMany({
      where: {
        isPublished: true,
        OR: recipeOrConditions,
      },
      select: { id: true },
      take: limit,
    }),
  ]);

  return {
    productIds: products.map(p => p.id),
    recipeIds: recipes.map(r => r.id),
  };
}
