import { normalizeUnit, pricePerBaseUnit } from '../unit-normalize';

describe('normalizeUnit', () => {
  test('parses grams into kg', () => {
    expect(normalizeUnit('500g')).toEqual({ quantity: 0.5, baseUnit: 'kg' });
    expect(normalizeUnit('100 g')).toEqual({ quantity: 0.1, baseUnit: 'kg' });
    expect(normalizeUnit('250gr')).toEqual({ quantity: 0.25, baseUnit: 'kg' });
  });

  test('parses kilograms', () => {
    expect(normalizeUnit('1kg')).toEqual({ quantity: 1, baseUnit: 'kg' });
    expect(normalizeUnit('2.5 kg')).toEqual({ quantity: 2.5, baseUnit: 'kg' });
    expect(normalizeUnit('kg')).toEqual({ quantity: 1, baseUnit: 'kg' });
  });

  test('parses milliliters into liters', () => {
    expect(normalizeUnit('500ml')).toEqual({ quantity: 0.5, baseUnit: 'L' });
    expect(normalizeUnit('750 ml')).toEqual({ quantity: 0.75, baseUnit: 'L' });
  });

  test('parses liters', () => {
    expect(normalizeUnit('1L')).toEqual({ quantity: 1, baseUnit: 'L' });
    expect(normalizeUnit('2 l')).toEqual({ quantity: 2, baseUnit: 'L' });
    expect(normalizeUnit('L')).toEqual({ quantity: 1, baseUnit: 'L' });
  });

  test('parses pieces', () => {
    expect(normalizeUnit('10 buc')).toEqual({ quantity: 10, baseUnit: 'buc' });
    expect(normalizeUnit('buc')).toEqual({ quantity: 1, baseUnit: 'buc' });
    expect(normalizeUnit('6 bucati')).toEqual({ quantity: 6, baseUnit: 'buc' });
  });

  test('handles comma decimals (RO locale)', () => {
    expect(normalizeUnit('0,5 kg')).toEqual({ quantity: 0.5, baseUnit: 'kg' });
  });

  test('returns nulls on unparseable input', () => {
    expect(normalizeUnit('')).toEqual({ quantity: null, baseUnit: null });
    expect(normalizeUnit(null)).toEqual({ quantity: null, baseUnit: null });
    expect(normalizeUnit('some random string')).toEqual({ quantity: null, baseUnit: null });
  });
});

describe('pricePerBaseUnit', () => {
  test('computes lei/kg for a grams-packaged product', () => {
    const result = pricePerBaseUnit(3.5, '500g');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.baseUnit).toBe('kg');
      expect(result.value).toBeCloseTo(7, 5);
    }
  });

  test('computes lei/L for a ml-packaged product', () => {
    const result = pricePerBaseUnit(5, '500ml');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.baseUnit).toBe('L');
      expect(result.value).toBeCloseTo(10, 5);
    }
  });

  test('returns null for unparseable units', () => {
    expect(pricePerBaseUnit(10, 'pachet')).toBeNull();
    expect(pricePerBaseUnit(10, null)).toBeNull();
  });
});
