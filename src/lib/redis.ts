/**
 * Redis Cache Client
 * Skill: application-performance → Distributed Caching
 * 
 * Provides Redis caching with automatic fallback to in-memory cache
 * when Redis is unavailable.
 */

import { createClient, RedisClientType } from 'redis'
import { logger } from './logger'

interface RedisCacheConfig {
    url?: string
    host?: string
    port?: number
    password?: string
    db?: number
    keyPrefix?: string
    defaultTtl?: number
    connectTimeout?: number
    maxRetries?: number
}

interface CacheStats {
    hits: number
    misses: number
    errors: number
    connected: boolean
}

/**
 * Redis Cache Manager
 * Handles connection, reconnection, and graceful fallback
 */
class RedisCacheManager {
    private client: RedisClientType | null = null
    private config: RedisCacheConfig
    private stats: CacheStats = { hits: 0, misses: 0, errors: 0, connected: false }
    private connecting = false
    private fallbackCache: Map<string, { value: any; expiry: number }> = new Map()

    constructor(config: RedisCacheConfig = {}) {
        this.config = {
            url: process.env.REDIS_URL,
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0', 10),
            keyPrefix: config.keyPrefix || 'retete:',
            defaultTtl: config.defaultTtl || 300, // 5 minutes
            connectTimeout: config.connectTimeout || 5000,
            maxRetries: config.maxRetries || 3,
            ...config
        }
    }

    /**
     * Connect to Redis server
     */
    async connect(): Promise<boolean> {
        if (this.client?.isOpen) return true
        if (this.connecting) return false

        this.connecting = true

        try {
            const connectionUrl = this.config.url ||
                `redis://${this.config.password ? `:${this.config.password}@` : ''}${this.config.host}:${this.config.port}/${this.config.db}`

            this.client = createClient({
                url: connectionUrl,
                socket: {
                    connectTimeout: this.config.connectTimeout,
                    reconnectStrategy: (retries) => {
                        if (retries > this.config.maxRetries!) {
                            logger.warn('Redis max retries reached, using fallback cache')
                            return false
                        }
                        return Math.min(retries * 100, 3000)
                    }
                }
            })

            this.client.on('error', (err) => {
                logger.error('Redis error', { error: err.message })
                this.stats.errors++
                this.stats.connected = false
            })

            this.client.on('connect', () => {
                logger.info('Redis connected')
                this.stats.connected = true
            })

            this.client.on('disconnect', () => {
                logger.warn('Redis disconnected')
                this.stats.connected = false
            })

            await this.client.connect()
            this.stats.connected = true
            this.connecting = false
            return true
        } catch (error) {
            logger.warn('Redis connection failed, using in-memory fallback', {
                error: error instanceof Error ? error.message : 'Unknown error'
            })
            this.stats.connected = false
            this.connecting = false
            return false
        }
    }

    /**
     * Check if Redis is available
     */
    isConnected(): boolean {
        return this.client?.isOpen === true
    }

    /**
     * Build cache key with prefix
     */
    private buildKey(key: string): string {
        return `${this.config.keyPrefix}${key}`
    }

    /**
     * Get value from cache (Redis or fallback)
     */
    async get<T>(key: string): Promise<T | null> {
        const fullKey = this.buildKey(key)

        // Try Redis first
        if (this.isConnected()) {
            try {
                const value = await this.client!.get(fullKey)
                if (value) {
                    this.stats.hits++
                    logger.debug('Redis cache hit', { key })
                    return JSON.parse(value) as T
                }
                this.stats.misses++
                return null
            } catch (error) {
                this.stats.errors++
                logger.warn('Redis get error, trying fallback', { key, error })
            }
        }

        // Fallback to in-memory
        const cached = this.fallbackCache.get(fullKey)
        if (cached && cached.expiry > Date.now()) {
            this.stats.hits++
            logger.debug('Fallback cache hit', { key })
            return cached.value as T
        }

        this.stats.misses++
        return null
    }

    /**
     * Set value in cache (Redis and fallback)
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const fullKey = this.buildKey(key)
        const expiry = (ttl || this.config.defaultTtl!) * 1000

        // Always set in fallback (for Redis failures)
        this.fallbackCache.set(fullKey, {
            value,
            expiry: Date.now() + expiry
        })

        // Try Redis
        if (this.isConnected()) {
            try {
                await this.client!.setEx(
                    fullKey,
                    ttl || this.config.defaultTtl!,
                    JSON.stringify(value)
                )
                logger.debug('Redis cache set', { key, ttl: ttl || this.config.defaultTtl })
            } catch (error) {
                this.stats.errors++
                logger.warn('Redis set error', { key, error })
            }
        }

        // Cleanup old fallback entries periodically
        if (Math.random() < 0.01) {
            this.cleanupFallback()
        }
    }

    /**
     * Delete value from cache
     */
    async delete(key: string): Promise<void> {
        const fullKey = this.buildKey(key)

        this.fallbackCache.delete(fullKey)

        if (this.isConnected()) {
            try {
                await this.client!.del(fullKey)
                logger.debug('Redis cache delete', { key })
            } catch (error) {
                this.stats.errors++
                logger.warn('Redis delete error', { key, error })
            }
        }
    }

    /**
     * Delete all keys matching pattern
     */
    async invalidatePattern(pattern: string): Promise<number> {
        const fullPattern = this.buildKey(pattern)
        let deleted = 0

        // Cleanup fallback
        for (const key of this.fallbackCache.keys()) {
            if (key.includes(pattern)) {
                this.fallbackCache.delete(key)
                deleted++
            }
        }

        // Cleanup Redis
        if (this.isConnected()) {
            try {
                const keys = await this.client!.keys(fullPattern + '*')
                if (keys.length > 0) {
                    deleted = await this.client!.del(keys)
                    logger.info('Redis pattern invalidation', { pattern, deleted })
                }
            } catch (error) {
                this.stats.errors++
                logger.warn('Redis invalidatePattern error', { pattern, error })
            }
        }

        return deleted
    }

    /**
     * Get or set with factory function
     */
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = await this.get<T>(key)
        if (cached !== null) return cached

        const value = await factory()
        await this.set(key, value, ttl)
        return value
    }

    /**
     * Clear all cache
     */
    async flush(): Promise<void> {
        this.fallbackCache.clear()

        if (this.isConnected()) {
            try {
                const keys = await this.client!.keys(this.config.keyPrefix + '*')
                if (keys.length > 0) {
                    await this.client!.del(keys)
                }
                logger.info('Redis cache flushed')
            } catch (error) {
                this.stats.errors++
                logger.warn('Redis flush error', { error })
            }
        }
    }

    /**
     * Cleanup expired fallback entries
     */
    private cleanupFallback(): void {
        const now = Date.now()
        let cleaned = 0

        for (const [key, entry] of this.fallbackCache.entries()) {
            if (entry.expiry < now) {
                this.fallbackCache.delete(key)
                cleaned++
            }
        }

        if (cleaned > 0) {
            logger.debug('Fallback cache cleanup', { cleaned })
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats & { fallbackSize: number } {
        return {
            ...this.stats,
            fallbackSize: this.fallbackCache.size
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.client?.isOpen) {
            await this.client.quit()
            this.stats.connected = false
            logger.info('Redis disconnected')
        }
    }
}

// Singleton instance
export const redisCache = new RedisCacheManager()

// Auto-connect if REDIS_URL is set
if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
    redisCache.connect().catch(() => {
        logger.info('Redis not available, using in-memory fallback')
    })
}

/**
 * Cache TTL constants for Redis
 */
export const RedisTTL = {
    SHORT: 60,        // 1 minute
    MEDIUM: 300,      // 5 minutes
    LONG: 900,        // 15 minutes
    HOUR: 3600,       // 1 hour
    DAY: 86400,       // 24 hours
    WEEK: 604800      // 7 days
}

/**
 * Helper to create typed cache keys
 */
export const RedisKeys = {
    offers: (filters: string) => `offers:${filters}`,
    offersTrending: () => 'offers:trending',
    offersStats: () => 'offers:stats',
    recipe: (id: string) => `recipe:${id}`,
    recipeBySlug: (slug: string) => `recipe:slug:${slug}`,
    catalog: (id: string) => `catalog:${id}`,
    user: (id: string) => `user:${id}`,
    session: (token: string) => `session:${token}`,
    rateLimit: (ip: string, path: string) => `ratelimit:${ip}:${path}`
}
