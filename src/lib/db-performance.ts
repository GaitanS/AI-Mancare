/**
 * Database Performance Monitoring & Optimization Utilities
 */

import { prisma } from './db-config';

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
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    performanceMonitor.logQuery(`${queryName}_ERROR`, duration);
    throw error;
  }
}

/**
 * Analyze database table sizes
 */
export async function analyzeTableSizes() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        table_name AS tableName,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS sizeMB,
        table_rows AS rowCount,
        ROUND((index_length / 1024 / 1024), 2) AS indexSizeMB
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `;

    return result;
  } catch (error) {
    console.error('Failed to analyze table sizes:', error);
    return [];
  }
}

/**
 * Analyze slow queries from MySQL slow query log
 */
export async function getSlowQueriesFromDB() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        query_time,
        lock_time,
        rows_sent,
        rows_examined,
        sql_text
      FROM mysql.slow_log
      ORDER BY query_time DESC
      LIMIT 20
    `;

    return result;
  } catch (error) {
    // Slow query log might not be enabled
    return [];
  }
}

/**
 * Check for missing indexes
 */
export async function checkMissingIndexes() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        object_schema as dbName,
        object_name as tableName,
        index_name as indexName
      FROM performance_schema.table_io_waits_summary_by_index_usage
      WHERE index_name IS NULL
      AND count_star > 0
      AND object_schema = DATABASE()
      ORDER BY count_star DESC
      LIMIT 10
    `;

    return result;
  } catch (error) {
    console.error('Failed to check missing indexes:', error);
    return [];
  }
}

/**
 * Get database cache hit ratio
 */
export async function getCacheHitRatio() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SHOW GLOBAL STATUS WHERE
        Variable_name IN (
          'Innodb_buffer_pool_read_requests',
          'Innodb_buffer_pool_reads'
        )
    `;

    const readRequests = result.find(r => r.Variable_name === 'Innodb_buffer_pool_read_requests')?.Value || 0;
    const reads = result.find(r => r.Variable_name === 'Innodb_buffer_pool_reads')?.Value || 0;

    const hitRatio = readRequests > 0
      ? ((readRequests - reads) / readRequests) * 100
      : 0;

    return {
      hitRatio: hitRatio.toFixed(2) + '%',
      readRequests: Number(readRequests),
      diskReads: Number(reads),
    };
  } catch (error) {
    console.error('Failed to get cache hit ratio:', error);
    return null;
  }
}

/**
 * Optimize tables (ANALYZE TABLE)
 */
export async function optimizeTables() {
  const tables = ['products', 'catalogs', 'recipes', 'weekly_menus', 'cache'];

  const results = [];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ANALYZE TABLE ${table}`);
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
 * Get index usage statistics
 */
export async function getIndexUsageStats(tableName: string) {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT
        INDEX_NAME as indexName,
        CARDINALITY as cardinality,
        SEQ_IN_INDEX as seqInIndex,
        COLUMN_NAME as columnName
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;

    return result;
  } catch (error) {
    console.error(`Failed to get index stats for ${tableName}:`, error);
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
