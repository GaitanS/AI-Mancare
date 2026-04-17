/**
 * Unit normalization for product quantity strings.
 *
 * Converts free-form unit strings from the catalog (e.g. "500g", "1L", "2 buc",
 * "600 ml", "kg") into a canonical {quantity, baseUnit} pair, so that products
 * with different packaging can be compared on a per-kg / per-L / per-piece basis.
 */

export type BaseUnit = 'kg' | 'L' | 'buc' | null;

export interface NormalizedUnit {
  /** Quantity in the base unit. 500g → 0.5 (kg). Null when unparseable. */
  quantity: number | null;
  /** Canonical base unit this normalizes to. Null when unparseable. */
  baseUnit: BaseUnit;
}

const WEIGHT_MASS_RE = /([\d.,]+)\s*(kg|kilograme?)\b/i;
const WEIGHT_GRAM_RE = /([\d.,]+)\s*g(?:r|rame)?\b/i;
const VOLUME_LITER_RE = /([\d.,]+)\s*(l|litri?|litre)\b/i;
const VOLUME_ML_RE = /([\d.,]+)\s*ml\b/i;
const PIECE_RE = /([\d.,]+)\s*(buc|bucati|bucăți|buc\.|bucata|bucată)\b/i;

function num(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

/**
 * Parse a free-form unit string into a canonical base unit and quantity.
 *
 * Handles common patterns in RO catalogs: "500g", "1kg", "1L", "500 ml",
 * "2 buc", "10 bucati", plus bare unit strings like "kg" / "L" / "buc"
 * (assumed to mean 1 of that unit).
 */
export function normalizeUnit(raw: string | null | undefined): NormalizedUnit {
  if (!raw) return { quantity: null, baseUnit: null };

  const s = raw.trim();
  if (!s) return { quantity: null, baseUnit: null };

  // Weight: mass (kg)
  const kgMatch = s.match(WEIGHT_MASS_RE);
  if (kgMatch) {
    const q = num(kgMatch[1]);
    if (Number.isFinite(q) && q > 0) return { quantity: q, baseUnit: 'kg' };
  }

  // Weight: grams — convert to kg
  const gMatch = s.match(WEIGHT_GRAM_RE);
  if (gMatch) {
    const q = num(gMatch[1]);
    if (Number.isFinite(q) && q > 0) return { quantity: q / 1000, baseUnit: 'kg' };
  }

  // Volume: liters
  const lMatch = s.match(VOLUME_LITER_RE);
  if (lMatch) {
    const q = num(lMatch[1]);
    if (Number.isFinite(q) && q > 0) return { quantity: q, baseUnit: 'L' };
  }

  // Volume: ml — convert to L
  const mlMatch = s.match(VOLUME_ML_RE);
  if (mlMatch) {
    const q = num(mlMatch[1]);
    if (Number.isFinite(q) && q > 0) return { quantity: q / 1000, baseUnit: 'L' };
  }

  // Pieces
  const pcMatch = s.match(PIECE_RE);
  if (pcMatch) {
    const q = num(pcMatch[1]);
    if (Number.isFinite(q) && q > 0) return { quantity: q, baseUnit: 'buc' };
  }

  // Bare unit tokens (no quantity present) — assume quantity 1
  const lower = s.toLowerCase();
  if (/^kg$/.test(lower) || /^kilogram/.test(lower)) return { quantity: 1, baseUnit: 'kg' };
  if (/^l$/.test(lower) || /^litru$/.test(lower) || /^litri$/.test(lower)) return { quantity: 1, baseUnit: 'L' };
  if (/^(buc|bucata|bucată|bucati|bucăți)\.?$/.test(lower)) return { quantity: 1, baseUnit: 'buc' };

  return { quantity: null, baseUnit: null };
}

/**
 * Compute price per base unit. Returns null when the unit can't be normalized
 * (don't compare apples to unknowns — fall back to absolute price instead).
 */
export function pricePerBaseUnit(price: number, unit: string | null | undefined): {
  value: number;
  baseUnit: BaseUnit;
} | null {
  const { quantity, baseUnit } = normalizeUnit(unit);
  if (quantity === null || baseUnit === null || quantity <= 0) return null;
  return { value: price / quantity, baseUnit };
}

export function formatBaseUnit(base: BaseUnit): string {
  if (base === 'kg') return 'kg';
  if (base === 'L') return 'L';
  if (base === 'buc') return 'buc';
  return '';
}
