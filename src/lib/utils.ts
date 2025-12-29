// Utility Functions
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import slugify from 'slugify';

// Tailwind CSS class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// STRING UTILITIES
// ==========================================

// Generate SEO-friendly slug
export function generateSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'ro', // Romanian locale
    remove: /[*+~.()'"!:@]/g,
  });
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// ==========================================
// NUMBER UTILITIES
// ==========================================

// Format price in RON
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

// Format number
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ro-RO').format(num);
}

// Calculate discount percentage
export function calculateDiscount(original: number, current: number): number {
  if (original <= 0 || current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
}

// ==========================================
// DATE UTILITIES
// ==========================================

// Format date to Romanian format
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

// Format datetime
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Check if date is in range
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = date.getTime();
  return d >= start.getTime() && d <= end.getTime();
}

// Check if offer is valid now
export function isOfferValid(validFrom: Date, validUntil: Date): boolean {
  const now = new Date();
  return isDateInRange(now, validFrom, validUntil);
}

// Get relative time (e.g., "2 hours ago")
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'acum';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minut' : 'minute'} în urmă`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'oră' : 'ore'} în urmă`;
  if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'zi' : 'zile'} în urmă`;

  return formatDate(d);
}

// ==========================================
// VALIDATION UTILITIES
// ==========================================

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// ARRAY UTILITIES
// ==========================================

// Chunk array into smaller arrays
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Unique array values
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

// Group by property
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const group = String(item[key]);
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

// ==========================================
// FOOD/NUTRITION UTILITIES
// ==========================================

// Standardize unit names
export function standardizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    kg: 'kg',
    kilogram: 'kg',
    grame: 'g',
    g: 'g',
    litru: 'L',
    l: 'L',
    litri: 'L',
    ml: 'ml',
    mililitru: 'ml',
    buc: 'buc',
    bucata: 'buc',
    bucati: 'buc',
    pachet: 'pachet',
    '100g': '100g',
  };

  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || unit;
}

// Convert units to base unit for comparison
export function convertToBaseUnit(value: number, unit: string): number {
  const standardized = standardizeUnit(unit);

  switch (standardized) {
    case 'g':
      return value / 1000; // to kg
    case 'ml':
      return value / 1000; // to L
    case '100g':
      return (value * 100) / 1000; // to kg
    default:
      return value;
  }
}

// ==========================================
// SEO UTILITIES
// ==========================================

// Generate meta description
export function generateMetaDescription(text: string, maxLength: number = 160): string {
  return truncate(text, maxLength);
}

// Generate keywords from text
export function extractKeywords(text: string, count: number = 10): string[] {
  const stopWords = new Set([
    'și',
    'sau',
    'în',
    'de',
    'la',
    'cu',
    'pe',
    'din',
    'pentru',
    'un',
    'o',
    'este',
    'sunt',
    'a',
    'ai',
    'am',
    'ce',
    'care',
  ]);

  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

// ==========================================
// ERROR UTILITIES
// ==========================================

// Safe JSON parse
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// Error message extractor
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'A apărut o eroare necunoscută';
}

// ==========================================
// ASYNC UTILITIES
// ==========================================

// Sleep/delay
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError;
}
