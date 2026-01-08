/**
 * Database Configuration & Connection Pooling
 * Optimized for VPS deployment (8GB RAM, 2 CPU cores)
 */

import { PrismaClient } from '@prisma/client';

// Connection pool configuration for VPS
const DATABASE_CONFIG = {
  // VPS allows more connections than shared hosting
  connectionLimit: 10, // 10 connections for VPS with 8GB RAM
  poolMin: 2, // Minimum 2 connections for better performance
  poolTimeout: 20000, // 20 seconds timeout for pool
  connectTimeout: 10000, // 10 seconds for connection

  // Query settings
  queryTimeout: 15000, // 15 seconds max per query

  // Logging (only errors in production)
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
};

// Construim DATABASE_URL cu parametrii de connection pooling
function buildOptimizedDatabaseUrl(baseUrl: string): string {
  if (!baseUrl || baseUrl.includes('placeholder')) return baseUrl;

  try {
    const url = new URL(baseUrl);
    const params = new URLSearchParams(url.search);

    // Adăugăm parametrii critici pentru MySQL connection pooling
    params.set('connection_limit', DATABASE_CONFIG.connectionLimit.toString());
    params.set('pool_timeout', (DATABASE_CONFIG.poolTimeout / 1000).toString());
    params.set('connect_timeout', (DATABASE_CONFIG.connectTimeout / 1000).toString());

    // MySQL optimizations
    params.set('statement_cache_size', '20'); // Enable statement cache on VPS
    params.set('max_allowed_packet', '67108864'); // 64MB - VPS has more resources

    url.search = params.toString();
    return url.toString();
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error);
    return baseUrl;
  }
}

// Prisma client singleton cu optimizări
const globalForPrisma = global as unknown as { prisma: PrismaClient | null };

// Fallback URL for when DATABASE_URL is not set - prevents crash
const DATABASE_URL_FALLBACK = 'mysql://placeholder:placeholder@localhost:3306/placeholder';
const baseUrl = process.env.DATABASE_URL || DATABASE_URL_FALLBACK;
const effectiveDatabaseUrl = buildOptimizedDatabaseUrl(baseUrl);

// Warn if using fallback
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set. Using fallback - database features will not work.');
} else {
  console.log('✅ Database connection pool configured:', {
    connectionLimit: DATABASE_CONFIG.connectionLimit,
    poolTimeout: `${DATABASE_CONFIG.poolTimeout}ms`,
    queryTimeout: `${DATABASE_CONFIG.queryTimeout}ms`,
  });
}

let prismaInstance: PrismaClient | null = null;

try {
  prismaInstance = globalForPrisma.prisma || new PrismaClient({
    log: DATABASE_CONFIG.log as any,
    datasources: {
      db: {
        url: effectiveDatabaseUrl,
      },
    },
  });
} catch (error) {
  console.error('❌ Failed to initialize Prisma client:', error);
  prismaInstance = null;
}

export const prisma = prismaInstance as PrismaClient;

// Enable query logging în development (doar queries slow)
if (process.env.NODE_ENV === 'development' && prisma) {
  prisma.$on('query' as never, (e: any) => {
    // Log doar queries lente (> 100ms)
    if (e.duration > 100) {
      console.warn(`⚠️ Slow Query (${e.duration}ms):`, e.query.substring(0, 100));
    }
  });
}

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

/**
 * Database health check cu timeout
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    if (!prisma) throw new Error('Prisma client not initialized');

    // Timeout de 5s pentru health check
    const healthCheckPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    );

    await Promise.race([healthCheckPromise, timeoutPromise]);
    const latency = Date.now() - start;

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Connection pool stats
 */
export async function getConnectionStats() {
  return {
    activeConnections: 'N/A', // Nu putem determina exact cu MySQL
    maxConnections: DATABASE_CONFIG.connectionLimit,
    configured: {
      connectionLimit: DATABASE_CONFIG.connectionLimit,
      poolTimeout: DATABASE_CONFIG.poolTimeout,
      queryTimeout: DATABASE_CONFIG.queryTimeout,
    },
  };
}

/**
 * Graceful shutdown cu timeout
 */
export async function disconnectDatabase() {
  if (!prisma) return;

  try {
    // Timeout de 3s pentru disconnect
    await Promise.race([
      prisma.$disconnect(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('⚠️ Error during database disconnect:', error);
  }
}

// Cleanup on process exit - cu protecție împotriva multiple calls
let isDisconnecting = false;

const gracefulShutdown = async (signal: string) => {
  if (isDisconnecting) return;
  isDisconnecting = true;

  console.log(`\n⚠️ ${signal} received, closing database connections...`);
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('beforeExit', async () => {
  if (!isDisconnecting) {
    await disconnectDatabase();
  }
});

/**
 * Query wrapper cu retry logic pentru connection errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Retry doar pentru connection errors
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes('connection') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('Too many connections'));

      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }

      console.warn(`⚠️ Database connection error, retry ${attempt}/${maxRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

export default prisma;
