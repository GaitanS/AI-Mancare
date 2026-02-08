/**
 * Database Performance Monitoring & Optimization Utilities
 */

import { prisma } from './db-config';
import { logger } from '@/lib/logger';

/**
 * Monitorizare query performance
 */
export class QueryPerformanceMonitor {
  private queryLogs: Map<string, {
    count: number;
    totalDuration: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  }> = new Map();

  /**
   * Log query execution
   */
  logQuery(queryName: string, duration: number) {
    const existing = this.queryLogs.get(queryName);

    if (!existing) {
      this.queryLogs.set(queryName, {
        count: 1,
        totalDuration: duration,
        avgDuration: duration,
        maxDuration: duration,
        minDuration: duration,
      });
    } else {
      existing.count++;
      existing.totalDuration += duration;
      existing.avgDuration = existing.totalDuration / existing.count;
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.minDuration = Math.min(existing.minDuration, duration);
    }
  }

  /**
   * Get performance stats
   */
  getStats() {
    return Array.from(this.queryLogs.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Reset stats
   */
  reset() {
    this.queryLogs.clear();
  }

  /**
   * Get slow queries (peste 100ms)
   */
  getSlowQueries(threshold = 100) {
    return this.getStats().filter(q => q.avgDuration > threshold);
  }
}

export const performanceMonitor = new QueryPerformanceMonitor();

/**
 * Wrapper pentru query cu performance tracking
 */
export async function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    performanceMonitor.logQuery(queryName, duration);

    if (duration > 1000) {
      logger.warn(`Slow query detected: ${queryName} took ${duration}ms`, { queryName, duration }, 'DBPerformance');
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    performanceMonitor.logQuery(`${queryName}_ERROR`, duration);
    throw error;
  }
}

/**
 * Analyze database table sizes (PostgreSQL)
 */
export async function analyzeTableSizes() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        relname AS "tableName",
        ROUND(pg_total_relation_size(C.oid) / 1024.0 / 1024.0, 2) AS "sizeMB",
        C.reltuples::bigint AS "rowCount",
        ROUND(pg_indexes_size(C.oid) / 1024.0 / 1024.0, 2) AS "indexSizeMB"
      FROM pg_class C
      LEFT JOIN pg_namespace N ON N.oid = C.relnamespace
      WHERE nspname = 'public'
      AND C.relkind = 'r'
      ORDER BY pg_total_relation_size(C.oid) DESC
    `;

    return result;
  } catch (error) {
    logger.error('Failed to analyze table sizes', { error }, 'DBPerformance');
    return [];
  }
}

/**
 * Analyze slow queries from PostgreSQL pg_stat_statements
 */
export async function getSlowQueriesFromDB() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        total_exec_time AS query_time,
        rows AS rows_sent,
        calls,
        query AS sql_text
      FROM pg_stat_statements
      ORDER BY total_exec_time DESC
      LIMIT 20
    `;

    return result;
  } catch (error) {
    // pg_stat_statements extension might not be enabled
    return [];
  }
}

/**
 * Check for missing indexes (tables with seq scans but no index scans)
 */
export async function checkMissingIndexes() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        schemaname AS "dbName",
        relname AS "tableName",
        seq_scan,
        idx_scan
      FROM pg_stat_user_tables
      WHERE seq_scan > 0
      AND (idx_scan IS NULL OR idx_scan = 0)
      ORDER BY seq_scan DESC
      LIMIT 10
    `;

    return result;
  } catch (error) {
    logger.error('Failed to check missing indexes', { error }, 'DBPerformance');
    return [];
  }
}

/**
 * Get database cache hit ratio (PostgreSQL)
 */
export async function getCacheHitRatio() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        SUM(heap_blks_read) AS disk_reads,
        SUM(heap_blks_hit) AS cache_hits,
        CASE WHEN SUM(heap_blks_hit) + SUM(heap_blks_read) > 0
          THEN ROUND(SUM(heap_blks_hit)::numeric / (SUM(heap_blks_hit) + SUM(heap_blks_read)) * 100, 2)
          ELSE 0
        END AS hit_ratio
      FROM pg_statio_user_tables
    `;

    const row = result[0];

    return {
      hitRatio: (row?.hit_ratio || 0) + '%',
      readRequests: Number(row?.cache_hits || 0) + Number(row?.disk_reads || 0),
      diskReads: Number(row?.disk_reads || 0),
    };
  } catch (error) {
    logger.error('Failed to get cache hit ratio', { error }, 'DBPerformance');
    return null;
  }
}

/**
 * Optimize tables (PostgreSQL ANALYZE)
 */
export async function optimizeTables() {
  const tables = ['products', 'catalogs', 'recipes', 'weekly_menus', 'cache'];

  const results = [];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
      results.push({ table, status: 'optimized' });
    } catch (error) {
      results.push({
        table,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * Get index usage statistics (PostgreSQL)
 */
export async function getIndexUsageStats(tableName: string) {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        indexrelname AS "indexName",
        idx_scan AS "scanCount",
        idx_tup_read AS "tuplesRead",
        idx_tup_fetch AS "tuplesFetched",
        pg_size_pretty(pg_relation_size(indexrelid)) AS "indexSize"
      FROM pg_stat_user_indexes
      WHERE relname = ${tableName}
      ORDER BY idx_scan DESC
    `;

    return result;
  } catch (error) {
    logger.error(`Failed to get index stats for ${tableName}`, { error, tableName }, 'DBPerformance');
    return [];
  }
}

/**
 * Generate performance report
 */
export async function generatePerformanceReport() {
  const [
    tableSizes,
    cacheHitRatio,
    missingIndexes,
    queryStats,
  ] = await Promise.all([
    analyzeTableSizes(),
    getCacheHitRatio(),
    checkMissingIndexes(),
    Promise.resolve(performanceMonitor.getStats()),
  ]);

  return {
    timestamp: new Date().toISOString(),
    database: {
      tableSizes,
      cacheHitRatio,
      missingIndexes,
    },
    queries: {
      total: queryStats.length,
      slow: performanceMonitor.getSlowQueries().length,
      stats: queryStats.slice(0, 10), // Top 10
    },
  };
}
