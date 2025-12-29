/**
 * Database Performance Monitoring API
 * GET /api/admin/db-performance
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  performanceMonitor,
  generatePerformanceReport,
  analyzeTableSizes,
  getCacheHitRatio,
  checkMissingIndexes,
  optimizeTables,
  getIndexUsageStats,
} from '@/lib/db-performance';
import { checkDatabaseHealth, getConnectionStats } from '@/lib/db-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        return NextResponse.json(await checkDatabaseHealth());

      case 'connections':
        return NextResponse.json(await getConnectionStats());

      case 'tables':
        return NextResponse.json(await analyzeTableSizes());

      case 'cache':
        return NextResponse.json(await getCacheHitRatio());

      case 'missing-indexes':
        return NextResponse.json(await checkMissingIndexes());

      case 'query-stats':
        return NextResponse.json({
          total: performanceMonitor.getStats().length,
          stats: performanceMonitor.getStats(),
          slow: performanceMonitor.getSlowQueries(),
        });

      case 'index-usage': {
        const table = searchParams.get('table');
        if (!table) {
          return NextResponse.json(
            { error: 'Table parameter required' },
            { status: 400 }
          );
        }
        return NextResponse.json(await getIndexUsageStats(table));
      }

      case 'full-report':
        return NextResponse.json(await generatePerformanceReport());

      default:
        // Return overview
        const [health, connections, cache] = await Promise.all([
          checkDatabaseHealth(),
          getConnectionStats(),
          getCacheHitRatio(),
        ]);

        return NextResponse.json({
          health,
          connections,
          cache,
          queries: {
            total: performanceMonitor.getStats().length,
            slow: performanceMonitor.getSlowQueries().length,
          },
        });
    }
  } catch (error) {
    console.error('Database performance API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve performance data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/db-performance
 * Actions: optimize, reset-stats
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'optimize':
        const results = await optimizeTables();
        return NextResponse.json({
          message: 'Tables optimized',
          results,
        });

      case 'reset-stats':
        performanceMonitor.reset();
        return NextResponse.json({
          message: 'Query statistics reset',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Database performance action error:', error);

    return NextResponse.json(
      {
        error: 'Failed to execute action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
