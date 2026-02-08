/**
 * Rate Limiting Utility
 * Implements simple in-memory rate limiting for API endpoints
 * For production, consider using Redis or external rate limiter
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

interface RateLimitEntry {
  count: number
  resetAt: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup expired entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    }
  }

  /**
   * Check if request should be rate limited
   * @param key - Unique identifier (IP, user ID, etc.)
   * @param limit - Max requests per window
   * @param windowMs - Time window in milliseconds
   */
  check(key: string, limit: number, windowMs: number): {
    allowed: boolean
    remaining: number
    resetAt: number
  } {
    const now = Date.now()

    // Prevent memory exhaustion from too many unique IPs
    if (this.store.size > 100000) {
      this.cleanup() // Force cleanup of expired entries
      if (this.store.size > 50000) {
        // Instead of clearing ALL entries (nuclear option), deny new keys only
        const entry = this.store.get(key)
        if (!entry) {
          // This is a new key and we're over limit - deny it
          logger.warn(`Rate limiter denied new key due to size exceeding 50k entries`, { key }, 'RateLimit')
          return { allowed: false, remaining: 0, resetAt: now + windowMs }
        }
        // Existing key - continue to allow it (fall through)
      }
    }

    const entry = this.store.get(key)

    // No entry or expired - create new
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs
      this.store.set(key, { count: 1, resetAt })
      return { allowed: true, remaining: limit - 1, resetAt }
    }

    // Check limit
    if (entry.count >= limit) {
      logger.warn(`Rate limit exceeded for ${key}`, {
        count: entry.count,
        limit,
      }, 'RateLimit')
      return { allowed: false, remaining: 0, resetAt: entry.resetAt }
    }

    // Increment counter
    entry.count++
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string) {
    this.store.delete(key)
  }

  /**
   * Clear all rate limits
   */
  clear() {
    this.store.clear()
  }

  /**
   * Remove expired entries
   */
  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Very strict - for authentication endpoints (login, password)
  strict: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Strict for admin mutation routes (POST/PUT/DELETE)
  adminStrict: {
    limit: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  // Moderate - for admin read endpoints
  moderate: {
    limit: 30,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Generous - for public API endpoints
  generous: {
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Per-second limit for heavy operations
  perSecond: {
    limit: 1,
    windowMs: 1000, // 1 second
  },
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP (behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback to user agent hash (not ideal but better than nothing)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `ua-${hashString(userAgent)}`
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Rate limit middleware helper
 */
export function withRateLimit(
  options: {
    limit?: number
    windowMs?: number
    keyPrefix?: string
  } = {}
) {
  const { limit = 100, windowMs = 15 * 60 * 1000, keyPrefix = 'rl' } = options

  return async (request: NextRequest) => {
    const clientId = getClientIdentifier(request)
    const routePath = new URL(request.url).pathname
    // Composite key: prefix + IP + route for granular per-route-per-IP limiting
    const key = `${keyPrefix}:${clientId}:${routePath}`

    const result = rateLimiter.check(key, limit, windowMs)

    if (!result.allowed) {
      const resetDate = new Date(result.resetAt).toISOString()

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${resetDate}`,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
          },
        }
      )
    }

    return null // Allow request to proceed
  }
}
