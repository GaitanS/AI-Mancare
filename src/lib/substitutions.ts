/**
 * Romanian Cooking Ingredient Substitution Engine
 * Provides fallback alternatives when an ingredient is unavailable,
 * including ratio adjustments, dietary benefits, and context notes.
 */

import { stripDiacritics } from '@/lib/utils';

export interface Substitution {
  /** Original ingredient name */
  original: string;
  /** Substitute ingredient name */
  substitute: string;
  /** Ratio: how much substitute per 1 unit of original (e.g. 0.5 = half) */
  ratio: number;
  /** When this substitution works best */
  context: string;
  /** Chef notes for the cook */
  notes: string;
  /** Dietary benefit of the substitute, if any */
  dietaryBenefit?: string;
}

// ========================================
// Static substitution map (~90 entries)
// Organized by food category
// ========================================
const SUBSTITUTION_DB: Substitution[] = [
  // ── Dairy ──
  { original: 'smântână', substitute: 'iaurt grecesc', ratio: 1, context: 'sosuri, supe', notes: 'Adaugă la final, nu fierbe', dietaryBenefit: 'Mai puține calorii' },
  { original: 'smântână', substitute: 'cremă de caju', ratio: 1, context: 'orice rețetă', notes: 'Înmoaie caju 4h, blendează cu apă', dietaryBenefit: 'Vegan' },
  { original: 'smântână', substitute: 'lapte de cocos', ratio: 0.75, context: 'curry, supe cremă', notes: 'Aromă ușor diferită, textura similară', dietaryBenefit: 'Vegan, fără lactoză' },
  { original: 'unt', substitute: 'ulei de măsline', ratio: 0.75, context: 'gătit, salate', notes: 'Nu merge la patiserie', dietaryBenefit: 'Vegan' },
  { original: 'unt', substitute: 'margarină', ratio: 1, context: 'patiserie, prăjituri', notes: 'Alege margarină cu >70% grăsime', dietaryBenefit: 'Fără lactoză' },
  { original: 'unt', substitute: 'ulei de cocos', ratio: 0.8, context: 'patiserie', notes: 'Solid la temperatura camerei, similar cu untul', dietaryBenefit: 'Vegan' },
  { original: 'lapte', substitute: 'lapte de ovăz', ratio: 1, context: 'orice rețetă', notes: 'Cel mai apropiat ca textură de laptele de vacă', dietaryBenefit: 'Vegan, fără lactoză' },
  { original: 'lapte', substitute: 'lapte de migdale', ratio: 1, context: 'smoothie, cereale', notes: 'Mai subțire decât laptele normal', dietaryBenefit: 'Vegan, fără lactoză' },
  { original: 'lapte', substitute: 'lapte de soia', ratio: 1, context: 'gătit, patiserie', notes: 'Bun pentru gătit, conținut proteic similar', dietaryBenefit: 'Vegan' },
  { original: 'brânză', substitute: 'tofu', ratio: 1, context: 'salate, paste', notes: 'Presează tofu și condimentează', dietaryBenefit: 'Vegan' },
  { original: 'brânză', substitute: 'drojdie nutrițională', ratio: 0.25, context: 'paste, sosuri', notes: 'Gust similar cu parmezanul', dietaryBenefit: 'Vegan' },
  { original: 'cașcaval', substitute: 'brânză topită', ratio: 1, context: 'sandwich, gratin', notes: 'Se topește similar', },
  { original: 'parmezan', substitute: 'cașcaval maturat', ratio: 1, context: 'paste, gratinate', notes: 'Gust mai blând dar textura similară' },
  { original: 'ricotta', substitute: 'brânză de vaci', ratio: 1, context: 'paste, deserturi', notes: 'Presează excesul de lichid' },
  { original: 'mascarpone', substitute: 'cremă de brânză', ratio: 1, context: 'tiramisu, cheesecake', notes: 'Adaugă puțină smântână pentru textură' },
  { original: 'iaurt', substitute: 'lapte bătut', ratio: 1, context: 'marinare, sosuri', notes: 'Textură mai lichidă' },
  { original: 'iaurt', substitute: 'kefir', ratio: 1, context: 'smoothie, marinare', notes: 'Mai acid, probiotice similare' },

  // ── Ouă ──
  { original: 'ou', substitute: 'banană zdrobită', ratio: 0.5, context: 'patiserie dulce', notes: '1/2 banană = 1 ou, adaugă gust de banană', dietaryBenefit: 'Vegan' },
  { original: 'ou', substitute: 'semințe de in + apă', ratio: 1, context: 'patiserie', notes: '1 lingură in + 3 linguri apă, lași 15 min', dietaryBenefit: 'Vegan' },
  { original: 'ou', substitute: 'apă de năut (aquafaba)', ratio: 3, context: 'bezele, mousse', notes: '3 linguri = 1 ou, bate ca albușul', dietaryBenefit: 'Vegan' },

  // ── Grăsimi & Uleiuri ──
  { original: 'ulei de măsline', substitute: 'ulei de floarea-soarelui', ratio: 1, context: 'gătit', notes: 'Gust neutru, bun la temperaturi înalte' },
  { original: 'ulei de floarea-soarelui', substitute: 'ulei de rapiță', ratio: 1, context: 'gătit, prăjit', notes: 'Punct de ardere similar' },

  // ── Legume ──
  { original: 'roșii', substitute: 'bulion de roșii', ratio: 0.25, context: 'sosuri, tocane', notes: '1 lingură bulion ≈ 2 roșii' },
  { original: 'roșii', substitute: 'roșii din conservă', ratio: 1, context: 'sosuri, supe', notes: 'Gust mai intens, perfecte pentru gătit' },
  { original: 'ceapă', substitute: 'ceapă verde', ratio: 2, context: 'salate, garnituri', notes: 'Gust mai blând, adaugă la final' },
  { original: 'ceapă', substitute: 'praz', ratio: 1.5, context: 'supe, tocane', notes: 'Folosește doar partea albă' },
  { original: 'usturoi', substitute: 'usturoi granulat', ratio: 0.25, context: 'orice rețetă', notes: '1/4 linguriță = 1 cățel' },
  { original: 'ardei gras', substitute: 'gogoșari', ratio: 1, context: 'salate, tocane', notes: 'Mai dulci, textura similară' },
  { original: 'spanac', substitute: 'urzici', ratio: 1, context: 'supe, plăcinte', notes: 'Opărește urzicile înainte', dietaryBenefit: 'Mai bogat în fier' },
  { original: 'spanac', substitute: 'kale (varză kale)', ratio: 0.75, context: 'smoothie, salate', notes: 'Mai fibros, gătește puțin mai mult' },
  { original: 'ciuperci', substitute: 'vinete', ratio: 1, context: 'tocane, paste', notes: 'Textură similară după gătit (umami)' },
  { original: 'dovlecei', substitute: 'vinete', ratio: 1, context: 'grătar, tocane', notes: 'Sare+scurge vinete 30 min înainte' },
  { original: 'cartof', substitute: 'cartof dulce', ratio: 1, context: 'piure, copt', notes: 'Mai dulce, mai nutritiv', dietaryBenefit: 'Index glicemic mai mic' },
  { original: 'cartof', substitute: 'țelină (rădăcină)', ratio: 1, context: 'piure, supe', notes: 'Mai puține carbohidrați', dietaryBenefit: 'Low-carb' },
  { original: 'varză', substitute: 'varză chinezească', ratio: 1, context: 'salate, wok', notes: 'Mai fragedă, gătire mai rapidă' },
  { original: 'fasole verde', substitute: 'mazăre', ratio: 1, context: 'garnituri, tocane', notes: 'Timp de gătire similar' },

  // ── Fructe ──
  { original: 'lămâie', substitute: 'oțet de mere', ratio: 0.5, context: 'sosuri, dressing', notes: 'Aciditate similară, gust diferit' },
  { original: 'lămâie', substitute: 'lime', ratio: 1, context: 'orice rețetă', notes: 'Practic interschimbabile' },
  { original: 'banane', substitute: 'piure de mere', ratio: 1, context: 'patiserie', notes: 'Mai puțin dulce, ajustează zahărul' },

  // ── Carne & Proteine ──
  { original: 'piept de pui', substitute: 'piept de curcan', ratio: 1, context: 'orice rețetă', notes: 'Textură și gust foarte similare' },
  { original: 'carne de vită', substitute: 'carne de porc', ratio: 1, context: 'tocane, mici', notes: 'Gust diferit, textură similară' },
  { original: 'carne de porc', substitute: 'carne de pui', ratio: 1, context: 'tocane', notes: 'Mai slab, necesită mai puțin timp de gătit' },
  { original: 'bacon', substitute: 'șuncă afumată', ratio: 1, context: 'paste, pizza', notes: 'Mai puțin gras dar aromă afumată similară' },
  { original: 'salam', substitute: 'cârnați uscați', ratio: 1, context: 'sandwich, pizza', notes: 'Texturi diferite, gusturi similare' },
  { original: 'ton conservă', substitute: 'sardine conservă', ratio: 1, context: 'salate, paste', notes: 'Zdrobește sardinele pentru textură similară' },
  { original: 'somon', substitute: 'păstrăv', ratio: 1, context: 'la cuptor, grătar', notes: 'Pește asemănător, preț mai mic' },

  // ── Pește → Vegan ──
  { original: 'somon', substitute: 'tofu afumat', ratio: 1, context: 'sushi, salate', notes: 'Marinează în nori pentru gust marin', dietaryBenefit: 'Vegan' },
  { original: 'ton conservă', substitute: 'năut pisat', ratio: 1, context: 'salate, sandwich', notes: 'Zdrobește năut cu ulei și lămâie', dietaryBenefit: 'Vegan' },

  // ── Făină & Cereale ──
  { original: 'făină', substitute: 'făină de migdale', ratio: 0.75, context: 'patiserie, prăjituri', notes: 'Fără gluten, mai umedă', dietaryBenefit: 'Fără gluten' },
  { original: 'făină', substitute: 'făină de orez', ratio: 0.9, context: 'patiserie, sos', notes: 'Textură mai fină, bună pentru sos', dietaryBenefit: 'Fără gluten' },
  { original: 'făină', substitute: 'făină integrală', ratio: 1, context: 'pâine, patiserie', notes: 'Mai multă fibră, textură mai densă', dietaryBenefit: 'Mai multe fibre' },
  { original: 'pesmet', substitute: 'fulgi de ovăz măcinați', ratio: 1, context: 'pane, chiftele', notes: 'Măcină fulgi de ovăz în blender' },
  { original: 'orez', substitute: 'quinoa', ratio: 1, context: 'garnituri', notes: 'Gătire similară, mai mult protein', dietaryBenefit: 'Mai mult protein' },
  { original: 'orez', substitute: 'cușcuș', ratio: 1, context: 'garnituri', notes: 'Se prepară în 5 min cu apă fierbinte' },
  { original: 'paste', substitute: 'paste din linte', ratio: 1, context: 'orice rețetă de paste', notes: 'Fără gluten, mai mult protein', dietaryBenefit: 'Fără gluten, high-protein' },
  { original: 'spaghete', substitute: 'noodles de orez', ratio: 1, context: 'stir-fry, supe', notes: 'Gătire mai rapidă', dietaryBenefit: 'Fără gluten' },

  // ── Condimente & Sosuri ──
  { original: 'sos de soia', substitute: 'tamari', ratio: 1, context: 'orice rețetă', notes: 'Fără gluten, gust similar', dietaryBenefit: 'Fără gluten' },
  { original: 'sos de soia', substitute: 'aminoacizi lichizi', ratio: 1, context: 'stir-fry, marinare', notes: 'Mai puțin sărat' },
  { original: 'vin alb', substitute: 'oțet de mere + apă', ratio: 1, context: 'sosuri, deglasare', notes: '1 lingură oțet + 3 linguri apă = 1/4 pahar vin' },
  { original: 'vin roșu', substitute: 'suc de struguri + oțet', ratio: 1, context: 'tocane, sosuri', notes: 'Mix 3:1 suc:oțet' },
  { original: 'boia', substitute: 'paprika', ratio: 1, context: 'orice rețetă', notes: 'Practic interschimbabile' },
  { original: 'boia dulce', substitute: 'boia afumată', ratio: 1, context: 'tocane, supe', notes: 'Adaugă notă afumată' },
  { original: 'muștar', substitute: 'hrean', ratio: 0.5, context: 'sosuri, marinare', notes: 'Mai picant, folosește mai puțin' },
  { original: 'ketchup', substitute: 'pastă de roșii + zahăr + oțet', ratio: 1, context: 'sosuri', notes: '2 linguri pastă + 1 linguriță zahăr + 1 linguriță oțet' },

  // ── Dulce ──
  { original: 'zahăr', substitute: 'miere', ratio: 0.75, context: 'patiserie, băuturi', notes: 'Reduce lichidele din rețetă cu 25%' },
  { original: 'zahăr', substitute: 'sirop de arțar', ratio: 0.75, context: 'clătite, patiserie', notes: 'Gust mai complex, reduce lichidele', dietaryBenefit: 'Vegan' },
  { original: 'zahăr', substitute: 'eritritol', ratio: 1, context: 'orice rețetă dulce', notes: 'Zero calorii, textură ușor diferită', dietaryBenefit: 'Fără calorii, diabetic-friendly' },
  { original: 'ciocolată', substitute: 'cacao + unt', ratio: 1, context: 'patiserie', notes: '3 linguri cacao + 1 lingură unt = 30g ciocolată' },
  { original: 'ciocolată neagră', substitute: 'cacao + ulei de cocos + zahăr', ratio: 1, context: 'patiserie, fondue', notes: 'Mix la cald, gust similar', dietaryBenefit: 'Vegan' },

  // ── Agenți de creștere ──
  { original: 'bicarbonat', substitute: 'praf de copt', ratio: 3, context: 'patiserie', notes: '3x cantitate praf de copt' },
  { original: 'praf de copt', substitute: 'bicarbonat + oțet', ratio: 0.33, context: 'patiserie', notes: '1/3 linguriță bicarbonat + puțin oțet' },
  { original: 'drojdie', substitute: 'bicarbonat + lămâie', ratio: 0.5, context: 'pâine rapidă', notes: 'Nu va crește la fel de mult' },

  // ── Diverse ──
  { original: 'gelatină', substitute: 'agar-agar', ratio: 0.5, context: 'jeleuri, panna cotta', notes: 'Se dizolvă la fiert, mai tare', dietaryBenefit: 'Vegan' },
  { original: 'bulion de pui', substitute: 'bulion de legume', ratio: 1, context: 'supe, risotto', notes: 'Gust mai blând', dietaryBenefit: 'Vegan, vegetarian' },
  { original: 'sos pesto', substitute: 'busuioc proaspăt + ulei + usturoi', ratio: 1, context: 'paste, bruschete', notes: 'Blendează 50g busuioc + 2 linguri ulei + 1 usturoi' },
  { original: 'cremă de smântână', substitute: 'cremă de caju', ratio: 1, context: 'sosuri cremă', notes: 'Înmoaie 200g caju 4h, blend cu 100ml apă', dietaryBenefit: 'Vegan' },
];

// Build lookup index for fast access
const _lookupCache = new Map<string, Substitution[]>();

function buildLookup() {
  if (_lookupCache.size > 0) return;

  for (const sub of SUBSTITUTION_DB) {
    const key = stripDiacritics(sub.original.toLowerCase());
    if (!_lookupCache.has(key)) {
      _lookupCache.set(key, []);
    }
    _lookupCache.get(key)!.push(sub);

    // Also index by the original with diacritics
    const keyWithDia = sub.original.toLowerCase();
    if (keyWithDia !== key) {
      if (!_lookupCache.has(keyWithDia)) {
        _lookupCache.set(keyWithDia, []);
      }
      _lookupCache.get(keyWithDia)!.push(sub);
    }
  }
}

/**
 * Find substitutions for a given ingredient.
 * Searches by exact match, then partial match on normalized names.
 */
export function getSubstitutions(ingredientName: string): Substitution[] {
  buildLookup();

  const normalized = stripDiacritics(ingredientName.toLowerCase().trim());

  // 1. Exact match
  const exact = _lookupCache.get(normalized);
  if (exact && exact.length > 0) return exact;

  // 2. Partial match: ingredient contains a known key or vice versa
  const partials: Substitution[] = [];
  for (const [key, subs] of _lookupCache.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      partials.push(...subs);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return partials.filter(s => {
    const k = `${s.original}|${s.substitute}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Get all unique ingredient names that have substitutions.
 */
export function getSubstitutableIngredients(): string[] {
  buildLookup();
  return Array.from(new Set(SUBSTITUTION_DB.map(s => s.original)));
}

/**
 * Search substitutions by dietary benefit.
 */
export function getSubstitutionsByDiet(diet: 'vegan' | 'gluten-free' | 'dairy-free' | 'low-carb'): Substitution[] {
  const keywords: Record<string, string[]> = {
    'vegan': ['vegan'],
    'gluten-free': ['gluten'],
    'dairy-free': ['lactoză', 'lactoza'],
    'low-carb': ['carb', 'low-carb'],
  };

  const terms = keywords[diet] || [];
  return SUBSTITUTION_DB.filter(s =>
    s.dietaryBenefit && terms.some(t =>
      s.dietaryBenefit!.toLowerCase().includes(t)
    )
  );
}
