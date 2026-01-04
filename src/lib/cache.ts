import NodeCache from 'node-cache'
import { logger } from './logger'

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number
  misses: number
  keys: number
  hitRate: number
}

/**
 * Multi-layer cache manager
 * Layer 1: In-memory cache (node-cache)
 * Layer 2: Redis (optional, for multi-instance deployments)
 */
class CacheManager {
  private cache: NodeCache
  private stats = { hits: 0, misses: 0 }

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default
      checkperiod: 60, // Check for expired keys every minute
      useClones: false, // Better performance (don't clone objects)
      maxKeys: 5000 // Prevent memory issues
    })

    // Log stats every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.logStats(), 300000)
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    const value = this.cache.get<T>(key)

    if (value !== undefined) {
      this.stats.hits++
      logger.cache('hit', key)
      return value
    }

    this.stats.misses++
    logger.cache('miss', key)
    return undefined
  }

  /**
   * Get value from cache synchronously
   */
  getSync<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key)

    if (value !== undefined) {
      this.stats.hits++
      logger.cache('hit', key)
      return value
    }

    this.stats.misses++
    logger.cache('miss', key)
    return undefined
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl || 300)
    logger.cache('set', key, { ttl: ttl || 300 })
  }

  /**
   * Get from cache or execute factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== undefined) return cached

    const value = await factory()
    await this.set(key, value, ttl)
    return value
  }

  /**
   * Delete single key
   */
  async del(key: string): Promise<void> {
    this.cache.del(key)
    logger.cache('invalidate', key)
  }

  /**
   * Delete keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = this.cache.keys()
    const matching = keys.filter(k => k.includes(pattern))

    if (matching.length > 0) {
      this.cache.del(matching)
      logger.cache('invalidate', pattern, { count: matching.length })
    }

    return matching.length
  }

  /**
   * Delete all keys with specific prefix
   */
  async invalidatePrefix(prefix: string): Promise<number> {
    const keys = this.cache.keys()
    const matching = keys.filter(k => k.startsWith(prefix))

    if (matching.length > 0) {
      this.cache.del(matching)
      logger.cache('invalidate', `${prefix}*`, { count: matching.length })
    }

    return matching.length
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.cache.flushAll()
    this.stats = { hits: 0, misses: 0 }
    logger.info('Cache cleared')
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Get remaining TTL for key
   */
  getTtl(key: string): number | undefined {
    return this.cache.getTtl(key)
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.cache.keys().length,
      hitRate: total > 0 ? this.stats.hits / total : 0
    }
  }

  /**
   * Log cache statistics
   */
  private logStats() {
    const stats = this.getStats()
    if (stats.keys > 0 || this.stats.hits > 0) {
      logger.info('Cache statistics', {
        ...stats,
        hitRate: `${(stats.hitRate * 100).toFixed(1)}%`
      })
    }
  }
}

// Singleton instance
export const cache = new CacheManager()

/**
 * Cache key builders for consistent key naming
 */
export const CacheKeys = {
  // Offers
  offers: (filters: Record<string, any>) =>
    `offers:list:${JSON.stringify(filters)}`,
  offer: (id: string) =>
    `offers:single:${id}`,
  offersTrending: () =>
    'offers:trending',
  offersByStore: (storeId: string) =>
    `offers:store:${storeId}`,
  offersByCategory: (category: string) =>
    `offers:category:${category}`,
  offersStats: () =>
    'offers:stats',

  // Recipes
  recipes: (filters: Record<string, any>) =>
    `recipes:list:${JSON.stringify(filters)}`,
  recipe: (id: string) =>
    `recipes:single:${id}`,
  recipesPopular: () =>
    'recipes:popular',
  recipesBudget: (maxCost: number) =>
    `recipes:budget:${maxCost}`,
  recipesStats: () =>
    'recipes:stats',

  // Stores
  stores: (filters: Record<string, any>) =>
    `stores:list:${JSON.stringify(filters)}`,
  store: (id: string) =>
    `stores:single:${id}`,
  storeBySlug: (slug: string) =>
    `stores:slug:${slug}`,
  storesActive: () =>
    'stores:active',
  storesStats: () =>
    'stores:stats',

  // AI/Catalogs
  catalog: (catalogId: string) =>
    `catalogs:${catalogId}`,
  catalogProducts: (catalogId: string) =>
    `catalogs:products:${catalogId}`,

  // Menus
  weeklyMenu: (userId: string, weekNumber: number) =>
    `menus:weekly:${userId}:${weekNumber}`
}

/**
 * Cache TTL values (in seconds)
 */
export const CacheTTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - default
  LONG: 900,        // 15 minutes - for stable data
  HOUR: 3600,       // 1 hour - for rarely changing data
  DAY: 86400        // 24 hours - for static data
}

/**
 * Decorator for caching method results
 */
export function Cached<T>(keyFn: (...args: any[]) => string, ttl: number = CacheTTL.MEDIUM) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyFn(...args)
      return cache.getOrSet(cacheKey, () => originalMethod.apply(this, args), ttl)
    }

    return descriptor
  }
}
