/**
 * Performance Monitoring API
 * GET /api/admin/performance
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getWebVitalsStats,
  checkWebVitalsHealth,
  resetWebVitals,
} from '@/lib/performance/web-vitals';
import { checkDatabaseHealth } from '@/lib/db-config';
import { performanceMonitor } from '@/lib/db-performance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'web-vitals':
        return NextResponse.json(getWebVitalsStats());

      case 'web-vitals-health':
        return NextResponse.json(checkWebVitalsHealth());

      case 'database':
        return NextResponse.json(await checkDatabaseHealth());

      case 'queries':
        return NextResponse.json({
          stats: performanceMonitor.getStats(),
          slow: performanceMonitor.getSlowQueries(),
        });

      case 'full':
        const [webVitals, dbHealth, queries] = await Promise.all([
          Promise.resolve(checkWebVitalsHealth()),
          checkDatabaseHealth(),
          Promise.resolve({
            stats: performanceMonitor.getStats(),
            slow: performanceMonitor.getSlowQueries(),
          }),
        ]);

        return NextResponse.json({
          timestamp: new Date().toISOString(),
          webVitals,
          database: dbHealth,
          queries,
        });

      default:
        // Overview
        const health = checkWebVitalsHealth();
        const dbHealthCheck = await checkDatabaseHealth();

        return NextResponse.json({
          webVitals: {
            healthy: health.healthy,
            issueCount: health.issues.length,
          },
          database: {
            healthy: dbHealthCheck.healthy,
            latency: dbHealthCheck.latency,
          },
          queries: {
            total: performanceMonitor.getStats().length,
            slow: performanceMonitor.getSlowQueries().length,
          },
        });
    }
  } catch (error) {
    console.error('Performance API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve performance data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'reset-web-vitals':
        resetWebVitals();
        return NextResponse.json({
          message: 'Web Vitals data reset',
        });

      case 'reset-query-stats':
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
    console.error('Performance action error:', error);

    return NextResponse.json(
      {
        error: 'Failed to execute action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
