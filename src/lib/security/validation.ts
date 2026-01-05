/**
 * Input Validation & Sanitization
 * Protecție împotriva XSS, SQL Injection, și alte atacuri
 */

import { z } from 'zod';

/**
 * Validare string simplu (no HTML)
 */
export const safeString = z
  .string()
  .min(1)
  .max(255)
  .refine((val) => {
    // Nu permite HTML tags
    return !/<[^>]*>/g.test(val);
  }, 'HTML tags not allowed');

/**
 * Validare email
 */
export const safeEmail = z
  .string()
  .email()
  .toLowerCase()
  .trim();

/**
 * Validare URL
 */
export const safeURL = z
  .string()
  .url()
  .refine((url) => {
    try {
      const parsed = new URL(url);
      // Allow only http/https
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'Invalid URL protocol');

/**
 * Validare slug (pentru URLs)
 */
export const safeSlug = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Invalid slug format')
  .min(3)
  .max(255);

/**
 * Validare UUID
 */
export const safeUUID = z
  .string()
  .uuid();

/**
 * Validare number pozitiv
 */
export const positiveNumber = z
  .number()
  .positive()
  .finite();

/**
 * Validare price (2 decimale)
 */
export const safePrice = z
  .number()
  .positive()
  .finite()
  .multipleOf(0.01);

/**
 * Schema validare Product search
 */
export const productSearchSchema = z.object({
  query: safeString.optional(),
  category: safeString.optional(),
  store: safeString.optional(),
  minPrice: positiveNumber.optional(),
  maxPrice: positiveNumber.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Schema validare Recipe search
 */
export const recipeSearchSchema = z.object({
  query: safeString.optional(),
  difficulty: z.enum(['ușor', 'mediu', 'dificil']).optional(),
  maxCost: safePrice.optional(),
  maxTime: positiveNumber.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Schema validare Weekly Menu creation
 */
export const weeklyMenuSchema = z.object({
  budgetLimit: safePrice,
  peopleCount: z.number().int().min(1).max(20),
  preferredStores: z.array(safeString).max(10).optional(),
  dietaryRestrictions: z.array(safeString).max(20).optional(),
});

/**
 * Sanitize HTML (remove all tags and dangerous content)
 */
export function sanitizeHTML(input: string): string {
  return input
    // Remove script tags and their content entirely
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove all other HTML tags (but keep content)
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Sanitize filename (pentru storage)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // No multiple dots
    .replace(/^\./, '') // No leading dot
    .toLowerCase();
}

/**
 * Escape SQL pentru raw queries (folosește Prisma parametrizat!)
 */
export function escapeSQLString(str: string): string {
  return str
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0');
}

/**
 * Validate și sanitize user input
 */
export function sanitizeUserInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Check for dangerous patterns BEFORE sanitization
  // This ensures we catch and reject malicious input
  const dangerousPatterns = [
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
    /expression\(/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      throw new Error('Potentially dangerous input detected');
    }
  }

  // Input is safe, apply sanitization for any remaining HTML
  return sanitizeHTML(input);
}

/**
 * Rate limiting helper (împreună cu cache)
 */
export function createRateLimitKey(
  identifier: string,
  endpoint: string
): string {
  return `ratelimit:${endpoint}:${identifier}`;
}

/**
 * Validate pagination params
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).optional(),
});

/**
 * Type-safe query parameter parser
 */
export function parseQueryParams<T extends z.ZodTypeAny>(
  schema: T,
  params: URLSearchParams
): z.infer<T> {
  const obj: Record<string, any> = {};

  params.forEach((value, key) => {
    // Try to parse numbers
    if (!isNaN(Number(value))) {
      obj[key] = Number(value);
    } else {
      obj[key] = value;
    }
  });

  return schema.parse(obj);
}
