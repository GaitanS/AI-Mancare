/**
 * Database Configuration & Connection Pooling
 * Optimizat pentru Hostinger Cloud Startup (4GB RAM, 2 CPU)
 */

import { PrismaClient } from '@prisma/client';

// Connection pool configuration
const DATABASE_CONFIG = {
  // Connection pool settings (optimizat pentru 4GB RAM)
  connectionLimit: 10, // Max connections pentru MySQL
  poolTimeout: 30000, // 30 seconds

  // Query settings
  queryTimeout: 15000, // 15 seconds max per query

  // Logging (doar în development)
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
};

// Prisma client singleton cu optimizări
const globalForPrisma = global as unknown as { prisma: PrismaClient | null };

// Fallback URL for when DATABASE_URL is not set - prevents crash
const DATABASE_URL_FALLBACK = 'mysql://placeholder:placeholder@localhost:3306/placeholder';
const effectiveDatabaseUrl = process.env.DATABASE_URL || DATABASE_URL_FALLBACK;

// Warn if using fallback
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set. Using fallback - database features will not work.');
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
  console.error('Failed to initialize Prisma client:', error);
  // Create a minimal client that will fail gracefully on queries
  prismaInstance = null;
}

export const prisma = prismaInstance as PrismaClient;

// Enable query logging în development
if (process.env.NODE_ENV === 'development' && prisma) {
  prisma.$on('query' as never, (e: any) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
  });
}

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    if (!prisma) throw new Error('Prisma client not initialized');
    await prisma.$queryRaw`SELECT 1`;
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
 * Connection pool stats (SQLite - simplified)
 */
export async function getConnectionStats() {
  return {
    activeConnections: 1,
    maxConnections: DATABASE_CONFIG.connectionLimit,
  };
}

/**
 * Graceful shutdown
 */
export async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Cleanup on process exit
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

export default prisma;
