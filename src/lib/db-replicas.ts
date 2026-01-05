/**
 * Database Read Replicas Configuration
 * Skill: architecture-patterns → Database Scaling
 * 
 * Implementează pattern-ul Master-Replica pentru scalare orizontală:
 * - Master: pentru WRITE (INSERT, UPDATE, DELETE)
 * - Replicas: pentru READ (SELECT) - distribuit automat
 * 
 * SETUP:
 * 1. Creează replici MySQL pe hosting (sau folosește servicii ca PlanetScale)
 * 2. Adaugă URL-urile în .env:
 *    DATABASE_URL=mysql://user:pass@master:3306/db  (scrieri)
 *    DATABASE_REPLICA_1=mysql://user:pass@replica1:3306/db (citiri)
 *    DATABASE_REPLICA_2=mysql://user:pass@replica2:3306/db (citiri)
 */

import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

// Replica configuration
interface ReplicaConfig {
    url: string
    weight: number // Higher weight = more traffic
    healthy: boolean
    lastCheck: number
    latency: number
}

// Global singleton for replicas
const globalForReplicas = global as unknown as {
    masterClient: PrismaClient | undefined
    replicaClients: Map<string, PrismaClient>
    replicaConfigs: Map<string, ReplicaConfig>
}

/**
 * Database Manager with Read Replicas
 */
class DatabaseReplicaManager {
    private master: PrismaClient
    private replicas: Map<string, PrismaClient> = new Map()
    private replicaConfigs: Map<string, ReplicaConfig> = new Map()
    private healthCheckInterval: NodeJS.Timeout | null = null
    private roundRobinIndex = 0

    constructor() {
        const url = process.env.DATABASE_URL
        if (!url) {
            logger.error('DATABASE_URL not found in environment')
            // Don't throw here, allowing the app to start, but subsequent queries will fail gracefully
        }

        // Initialize master connection
        this.master = globalForReplicas.masterClient || this.createClient(
            url || 'file:./dev.db', // Fallback to avoid crash on init, though it won't work for real queries
            'master'
        )
        globalForReplicas.masterClient = this.master

        // Initialize replicas from environment
        this.initializeReplicas()

        // Start health checks (every 30 seconds)
        if (process.env.NODE_ENV !== 'test') {
            this.startHealthChecks()
        }
    }

    /**
     * Create Prisma client for a database URL
     */
    private createClient(url: string, name: string): PrismaClient {
        const client = new PrismaClient({
            datasources: {
                db: { url }
            },
            log: process.env.NODE_ENV === 'development'
                ? ['error', 'warn']
                : ['error']
        })

        logger.info(`Database client created: ${name}`)
        return client
    }

    /**
     * Initialize replica connections from environment
     */
    private initializeReplicas() {
        // Check for cached replicas
        if (globalForReplicas.replicaClients?.size > 0) {
            this.replicas = globalForReplicas.replicaClients
            this.replicaConfigs = globalForReplicas.replicaConfigs
            return
        }

        // Find all replica URLs in environment
        const replicaUrls: { name: string; url: string }[] = []

        // Support numbered replicas: DATABASE_REPLICA_1, DATABASE_REPLICA_2, etc.
        for (let i = 1; i <= 10; i++) {
            const url = process.env[`DATABASE_REPLICA_${i}`]
            if (url) {
                replicaUrls.push({ name: `replica_${i}`, url })
            }
        }

        // Also support named replicas
        if (process.env.DATABASE_READ_URL) {
            replicaUrls.push({ name: 'read', url: process.env.DATABASE_READ_URL })
        }

        // Create clients for each replica
        for (const { name, url } of replicaUrls) {
            const client = this.createClient(url, name)
            this.replicas.set(name, client)
            this.replicaConfigs.set(name, {
                url,
                weight: 1,
                healthy: true, // Assume healthy initially
                lastCheck: Date.now(),
                latency: 0
            })
        }

        // Cache globally
        globalForReplicas.replicaClients = this.replicas
        globalForReplicas.replicaConfigs = this.replicaConfigs

        logger.info(`Initialized ${this.replicas.size} read replicas`)
    }

    /**
     * Get the master client for write operations
     */
    getWriter(): PrismaClient {
        return this.master
    }

    /**
     * Get a replica client for read operations
     * Uses weighted round-robin with health checks
     */
    getReader(): PrismaClient {
        // If no replicas configured, use master
        if (this.replicas.size === 0) {
            return this.master
        }

        // Get healthy replicas
        const healthyReplicas: string[] = []
        for (const [name, config] of this.replicaConfigs) {
            if (config.healthy) {
                healthyReplicas.push(name)
            }
        }

        // If no healthy replicas, fallback to master
        if (healthyReplicas.length === 0) {
            logger.warn('No healthy replicas, using master for reads')
            return this.master
        }

        // Round-robin selection
        this.roundRobinIndex = (this.roundRobinIndex + 1) % healthyReplicas.length
        const selectedName = healthyReplicas[this.roundRobinIndex]

        return this.replicas.get(selectedName)!
    }

    /**
     * Execute a read query on replica
     */
    async read<T>(queryFn: (client: PrismaClient) => Promise<T>): Promise<T> {
        const client = this.getReader()
        try {
            return await queryFn(client)
        } catch (error) {
            // On replica failure, try master
            logger.warn('Replica read failed, trying master', { error })
            return await queryFn(this.master)
        }
    }

    /**
     * Execute a write query on master
     */
    async write<T>(queryFn: (client: PrismaClient) => Promise<T>): Promise<T> {
        return await queryFn(this.master)
    }

    /**
     * Start health check interval
     */
    private startHealthChecks() {
        this.healthCheckInterval = setInterval(async () => {
            await this.checkReplicaHealth()
        }, 30000) // Every 30 seconds
    }

    /**
     * Check health of all replicas
     */
    async checkReplicaHealth(): Promise<void> {
        for (const [name, client] of this.replicas) {
            const config = this.replicaConfigs.get(name)!
            const start = Date.now()

            try {
                await client.$queryRaw`SELECT 1`
                const latency = Date.now() - start

                config.healthy = true
                config.latency = latency
                config.lastCheck = Date.now()

                if (latency > 100) {
                    logger.warn(`Replica ${name} slow response`, { latency })
                }
            } catch (error) {
                config.healthy = false
                config.lastCheck = Date.now()
                logger.error(`Replica ${name} health check failed`, { error })
            }
        }
    }

    /**
     * Get replica statistics
     */
    getStats() {
        const stats: Record<string, any> = {
            master: { connected: true },
            replicas: {}
        }

        for (const [name, config] of this.replicaConfigs) {
            stats.replicas[name] = {
                healthy: config.healthy,
                latency: config.latency,
                lastCheck: new Date(config.lastCheck).toISOString()
            }
        }

        return stats
    }

    /**
     * Disconnect all clients
     */
    async disconnect(): Promise<void> {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
        }

        await this.master.$disconnect()

        for (const [name, client] of this.replicas) {
            await client.$disconnect()
            logger.info(`Disconnected replica: ${name}`)
        }
    }
}

// Singleton instance
export const dbReplicas = new DatabaseReplicaManager()

// Convenience exports
export const dbWriter = () => dbReplicas.getWriter()
export const dbReader = () => dbReplicas.getReader()

/**
 * Usage examples:
 * 
 * // For reads (uses replica if available)
 * const products = await dbReader().product.findMany({ ... })
 * 
 * // For writes (always uses master)
 * const product = await dbWriter().product.create({ ... })
 * 
 * // Using the manager directly
 * const data = await dbReplicas.read(async (db) => {
 *   return db.product.findMany({ ... })
 * })
 */
