/**
 * Fuzzy Search Engine
 * - Diacritics stripping for Romanian text
 * - Common Romanian food misspelling corrections
 * - Levenshtein distance with bounded early-cutoff
 * - Query expansion: original + stripped + corrections
 */

import { stripDiacritics } from '@/lib/utils';

// Common Romanian food misspellings and alternative spellings
const CORRECTION_MAP: Record<string, string[]> = {
  // Dairy
  'parmezan': ['parmesan', 'parmigiano'],
  'parmesan': ['parmezan', 'parmigiano'],
  'smantana': ['smântână', 'smintina'],
  'smântână': ['smantana', 'smintina'],
  'cascaval': ['cașcaval', 'cascaval'],
  'cașcaval': ['cascaval'],
  'branza': ['brânză'],
  'brânză': ['branza'],
  'lapte': ['lapte batut'],
  'iaurt': ['iogurt', 'yogurt'],
  'iogurt': ['iaurt', 'yogurt'],

  // Vegetables
  'rosii': ['roșii', 'tomate'],
  'roșii': ['rosii', 'tomate'],
  'tomate': ['rosii', 'roșii'],
  'cartofi': ['cartof'],
  'ceapa': ['ceapă'],
  'ceapă': ['ceapa'],
  'ardei': ['ardei gras', 'ardei iute'],
  'usturoi': ['usturoiu'],
  'vinete': ['vânătă', 'vanata'],
  'varza': ['varză'],
  'varză': ['varza'],
  'morcovi': ['morcov'],
  'castraveti': ['castraveți', 'castravete'],
  'castraveți': ['castraveti', 'castravete'],
  'dovlecei': ['dovlecel', 'zucchini'],
  'zucchini': ['dovlecei', 'dovlecel'],
  'spanac': ['spanac baby'],
  'ciuperci': ['ciupercă', 'champignon'],
  'champignon': ['ciuperci'],
  'mazare': ['mazăre'],
  'fasole': ['fasole boabe', 'fasole verde'],
  'patrunjel': ['pătrunjel'],
  'marar': ['mărar'],
  'busuioc': ['bazilico', 'basilic'],

  // Fruits
  'mere': ['mar', 'măr'],
  'banane': ['banana'],
  'portocale': ['portocala'],
  'lamai': ['lămâi', 'lamaie', 'lămâie'],
  'lămâi': ['lamai', 'lamaie'],
  'capsuni': ['căpșuni', 'capsune', 'fragi'],
  'căpșuni': ['capsuni', 'capsune', 'fragi'],
  'piersici': ['piersică', 'piersica'],
  'caise': ['caisă'],

  // Meat
  'pui': ['piept de pui', 'carne de pui'],
  'vita': ['vită', 'carne de vită'],
  'vită': ['vita', 'carne de vita'],
  'porc': ['carne de porc'],
  'sunca': ['șuncă'],
  'șuncă': ['sunca', 'jambon'],
  'salam': ['salami'],
  'carnati': ['cârnați', 'carnat'],
  'cârnați': ['carnati', 'carnat'],
  'bacon': ['beicon', 'slanina'],
  'beicon': ['bacon', 'slanina'],
  'slanina': ['slănină', 'bacon'],

  // Fish
  'somon': ['salmon'],
  'salmon': ['somon'],
  'ton': ['tuna'],
  'pastrav': ['păstrăv'],
  'păstrăv': ['pastrav'],

  // Bakery
  'paine': ['pâine'],
  'pâine': ['paine'],
  'faina': ['făină'],
  'făină': ['faina'],
  'drojdie': ['drojdie uscata'],
  'cozonac': ['kozunak'],

  // Condiments & Spices
  'sare': ['sare de mare', 'sare iodata'],
  'piper': ['piper negru', 'piper alb'],
  'boia': ['boia dulce', 'boia iute', 'paprika'],
  'paprika': ['boia', 'boia dulce'],
  'scortisoara': ['scorțișoară'],
  'scorțișoară': ['scortisoara'],
  'cuisoare': ['cuișoare'],
  'otet': ['oțet'],
  'oțet': ['otet'],
  'mustar': ['muștar'],
  'muștar': ['mustar'],
  'ketchup': ['kechap'],
  'maioneza': ['maioneză', 'mayo'],
  'maioneză': ['maioneza', 'mayo'],

  // Pantry
  'ulei': ['ulei de masline', 'ulei de floarea soarelui'],
  'zahar': ['zahăr'],
  'zahăr': ['zahar'],
  'orez': ['orez basmati', 'orez brun'],
  'paste': ['macaroane', 'spaghete', 'penne'],
  'macaroane': ['paste', 'macaroni'],
  'spaghete': ['spaghetti', 'paste'],
  'spaghetti': ['spaghete', 'paste'],

  // Common typos
  'brinza': ['brânză', 'branza'],
  'masline': ['măsline'],
  'măsline': ['masline'],
  'telina': ['țelină'],
  'țelină': ['telina'],
};

/**
 * Levenshtein distance with bounded early-cutoff.
 * Returns maxDist+1 if actual distance exceeds maxDist (saves computation).
 */
export function levenshteinDistance(a: string, b: string, maxDist: number = 3): number {
  const la = a.length;
  const lb = b.length;

  // Quick reject if length difference already exceeds max
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;

  // Use single-row DP with early cutoff
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
      rowMin = Math.min(rowMin, curr[j]);
    }

    // Early cutoff: if entire row exceeds maxDist, bail
    if (rowMin > maxDist) return maxDist + 1;

    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Expand a search query into multiple variants for broader matching.
 * Returns: [original, stripped diacritics, corrections...]
 */
export function expandQuery(query: string): string[] {
  const variants = new Set<string>();
  const lower = query.toLowerCase().trim();

  // 1. Original query
  variants.add(lower);

  // 2. Diacritics-stripped version
  const stripped = stripDiacritics(lower);
  variants.add(stripped);

  // 3. Direct correction map lookup
  const corrections = CORRECTION_MAP[lower] || CORRECTION_MAP[stripped];
  if (corrections) {
    corrections.forEach(c => variants.add(c.toLowerCase()));
  }

  // 4. Multi-word queries: expand each word
  const words = lower.split(/\s+/);
  if (words.length > 1) {
    words.forEach(word => {
      const wordStripped = stripDiacritics(word);
      const wordCorrections = CORRECTION_MAP[word] || CORRECTION_MAP[wordStripped];
      if (wordCorrections) {
        wordCorrections.forEach(c => {
          // Replace the word in the original query
          const expanded = lower.replace(word, c.toLowerCase());
          variants.add(expanded);
        });
      }
    });
  }

  // 5. Fuzzy lookup in correction map keys (Levenshtein <= 2)
  for (const key of Object.keys(CORRECTION_MAP)) {
    const keyStripped = stripDiacritics(key.toLowerCase());
    if (levenshteinDistance(stripped, keyStripped, 2) <= 2) {
      variants.add(key.toLowerCase());
      CORRECTION_MAP[key].forEach(c => variants.add(c.toLowerCase()));
    }
  }

  return Array.from(variants);
}

/**
 * Check if two product names are similar enough to be considered the same product.
 * Used for cross-store deduplication.
 */
export function areSimilarNames(a: string, b: string, maxDist: number = 3): boolean {
  const normA = stripDiacritics(a.toLowerCase().trim());
  const normB = stripDiacritics(b.toLowerCase().trim());

  if (normA === normB) return true;

  // Check if one contains the other
  if (normA.includes(normB) || normB.includes(normA)) return true;

  return levenshteinDistance(normA, normB, maxDist) <= maxDist;
}
