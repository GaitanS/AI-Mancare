/**
 * Database Client - Optimized Prisma Configuration
 * Re-export from db-config.ts with enhanced connection pooling
 */

export {
  prisma,
  checkDatabaseHealth,
  getConnectionStats,
  disconnectDatabase,
  withRetry
} from './db-config';

export { default } from './db-config';
