/**
 * Rate Limiting Middleware
 * Protecție împotriva DDoS și abuse
 */

import { cache } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  /**
   * Maximum number of requests
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Custom identifier function (default: IP address)
   */
  identifier?: (req: NextRequest) => string;
}

/**
 * Default rate limit configs
 */
export const RATE_LIMITS = {
  // API routes - 60 requests/minute
  api: {
    maxRequests: 60,
    windowSeconds: 60,
  },

  // Search - 30 requests/minute
  search: {
    maxRequests: 30,
    windowSeconds: 60,
  },

  // AI generation - 5 requests/minute
  aiGeneration: {
    maxRequests: 5,
    windowSeconds: 60,
  },

  // Auth - 5 requests/5 minutes
  auth: {
    maxRequests: 5,
    windowSeconds: 300,
  },
} as const;

/**
 * Get client identifier (IP address)
 */
function getClientIdentifier(req: NextRequest): string {
  // Încearcă să ia IP-ul din headers (Hostinger/CloudFlare)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip');

  const ip = forwarded?.split(',')[0] || realIp || cfIp || 'unknown';

  return ip.trim();
}

/**
 * Rate limiting check
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const identifier = config.identifier
    ? config.identifier(req)
    : getClientIdentifier(req);

  const key = `ratelimit:${identifier}`;

  // Get current count from cache
  let count = cache.get<number>(key) || 0;

  // Check if limit exceeded
  if (count >= config.maxRequests) {
    const ttl = cache.getTtl(key);
    const resetAt = ttl ? new Date(ttl) : new Date(Date.now() + config.windowSeconds * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Increment counter
  count++;
  cache.set(key, count, config.windowSeconds);

  const ttl = cache.getTtl(key);
  const resetAt = ttl ? new Date(ttl) : new Date(Date.now() + config.windowSeconds * 1000);

  return {
    allowed: true,
    remaining: config.maxRequests - count,
    resetAt,
  };
}

/**
 * Rate limit middleware pentru API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await checkRateLimit(req, config);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toISOString(),
            'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(req);

    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

    return response;
  };
}

/**
 * Brute force protection pentru login
 */
export async function checkBruteForce(
  identifier: string,
  maxAttempts = 5,
  windowSeconds = 900 // 15 minutes
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const key = `bruteforce:${identifier}`;

  let attempts = cache.get<number>(key) || 0;

  if (attempts >= maxAttempts) {
    const ttl = cache.getTtl(key);
    const resetAt = ttl ? new Date(ttl) : new Date(Date.now() + windowSeconds * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Nu incrementăm aici, doar checkăm
  const ttl = cache.getTtl(key);
  const resetAt = ttl ? new Date(ttl) : new Date(Date.now() + windowSeconds * 1000);

  return {
    allowed: true,
    remaining: maxAttempts - attempts,
    resetAt,
  };
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(identifier: string): void {
  const key = `bruteforce:${identifier}`;
  const attempts = (cache.get<number>(key) || 0) + 1;

  cache.set(key, attempts, 900); // 15 minutes
}

/**
 * Clear failed login attempts (după login success)
 */
export function clearFailedLogins(identifier: string): void {
  const key = `bruteforce:${identifier}`;
  cache.del(key);
}
