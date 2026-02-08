/**
 * Cross-Store Product Deduplication
 * Groups similar products across stores by normalized name,
 * showing the cheapest option first with alternatives.
 */

import { stripDiacritics } from '@/lib/utils';
import { levenshteinDistance } from './fuzzy';

interface ProductForDedup {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  store: string;
  unit: string | null;
  imageUrl?: string | null;
  [key: string]: any; // allow extra fields to pass through
}

export interface DedupGroup {
  /** Best-price product in the group */
  best: ProductForDedup;
  /** Alternative products from other stores, sorted by price ascending */
  alternatives: ProductForDedup[];
  /** Normalized canonical name for the group */
  canonicalName: string;
  /** Number of stores offering this product */
  storeCount: number;
}

// Common brand names to strip from product names for comparison
const BRAND_STRIP_PATTERNS = [
  /\b(mega\s*image|lidl|kaufland|carrefour|penny|profi|auchan|cora|metro|selgros)\b/gi,
];

// Unit variations to normalize
const UNIT_NORMALIZE: Record<string, string> = {
  'kilogram': 'kg',
  'grame': 'g',
  'gram': 'g',
  'litru': 'l',
  'litri': 'l',
  'mililitri': 'ml',
  'mililitru': 'ml',
  'bucata': 'buc',
  'bucati': 'buc',
};

/**
 * Normalize a product name for comparison.
 * Strips brand name, diacritics, store names, extra whitespace.
 */
export function normalizeProductName(name: string, brand?: string | null): string {
  let normalized = name.toLowerCase().trim();

  // Strip brand from name if present
  if (brand) {
    const brandLower = brand.toLowerCase();
    normalized = normalized.replace(new RegExp(`\\b${escapeRegex(brandLower)}\\b`, 'gi'), '');
  }

  // Strip store names
  for (const pattern of BRAND_STRIP_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  // Strip diacritics
  normalized = stripDiacritics(normalized);

  // Normalize units in the name
  for (const [from, to] of Object.entries(UNIT_NORMALIZE)) {
    normalized = normalized.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  }

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Remove trailing/leading punctuation
  normalized = normalized.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

  return normalized;
}

/**
 * Group similar products across stores.
 * Products are grouped if their normalized names are within Levenshtein distance 3.
 * Within each group, products are sorted by price ascending (best first).
 */
export function groupSimilarProducts(products: ProductForDedup[]): DedupGroup[] {
  if (products.length === 0) return [];

  // Build normalized name for each product
  const withNorm = products.map(p => ({
    product: p,
    norm: normalizeProductName(p.name, p.brand),
  }));

  // Sort by price ascending so cheapest gets picked as group leader
  withNorm.sort((a, b) => a.product.price - b.product.price);

  const groups: DedupGroup[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < withNorm.length; i++) {
    if (assigned.has(i)) continue;

    const leader = withNorm[i];
    const groupMembers: ProductForDedup[] = [leader.product];
    assigned.add(i);

    // Find all similar products
    for (let j = i + 1; j < withNorm.length; j++) {
      if (assigned.has(j)) continue;

      const candidate = withNorm[j];

      // Quick length check
      if (Math.abs(leader.norm.length - candidate.norm.length) > 5) continue;

      // Check similarity
      if (
        leader.norm === candidate.norm ||
        leader.norm.includes(candidate.norm) ||
        candidate.norm.includes(leader.norm) ||
        levenshteinDistance(leader.norm, candidate.norm, 3) <= 3
      ) {
        // Don't group products from the same store
        if (candidate.product.store !== leader.product.store) {
          groupMembers.push(candidate.product);
          assigned.add(j);
        }
      }
    }

    // Sort group by price (leader is already cheapest due to pre-sort)
    groupMembers.sort((a, b) => a.price - b.price);

    const stores = new Set(groupMembers.map(m => m.store));

    groups.push({
      best: groupMembers[0],
      alternatives: groupMembers.slice(1),
      canonicalName: leader.norm,
      storeCount: stores.size,
    });
  }

  return groups;
}

/**
 * Quick dedup that just returns the cheapest per group,
 * discarding alternatives. Useful for compact result sets.
 */
export function dedupCheapest(products: ProductForDedup[]): ProductForDedup[] {
  return groupSimilarProducts(products).map(g => g.best);
}

// Helper to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
