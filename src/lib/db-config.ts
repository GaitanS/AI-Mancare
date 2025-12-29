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
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: DATABASE_CONFIG.log as any,

  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Enable query logging în development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
  });
}

if (process.env.NODE_ENV !== 'production') {
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
  await prisma.$disconnect();
}

// Cleanup on process exit
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

export default prisma;
