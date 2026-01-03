import { NextRequest, NextResponse } from 'next/server';

// Web Vitals metric type
interface WebVitalMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
  url?: string;
  timestamp?: number;
}

// Thresholds for Web Vitals ratings
const thresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

// Get rating based on metric value
function getRating(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
  const threshold = thresholds[name];
  if (value <= threshold.good) return 'good';
  if (value > threshold.poor) return 'poor';
  return 'needs-improvement';
}

// In-memory storage for metrics (replace with database in production)
const metricsStore: WebVitalMetric[] = [];
const MAX_STORED_METRICS = 1000;

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json() as Partial<WebVitalMetric>;

    // Validate required fields
    if (!metric.name || metric.value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name and value' },
        { status: 400 }
      );
    }

    // Enrich metric with rating if not provided
    const enrichedMetric: WebVitalMetric = {
      id: metric.id || `${metric.name}-${Date.now()}`,
      name: metric.name,
      value: metric.value,
      rating: metric.rating || getRating(metric.name, metric.value),
      delta: metric.delta || metric.value,
      navigationType: metric.navigationType || 'unknown',
      url: metric.url || request.headers.get('referer') || undefined,
      timestamp: metric.timestamp || Date.now(),
    };

    // Store metric (in production, send to analytics service or database)
    metricsStore.push(enrichedMetric);

    // Keep only recent metrics
    if (metricsStore.length > MAX_STORED_METRICS) {
      metricsStore.shift();
    }

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${enrichedMetric.name}: ${enrichedMetric.value.toFixed(2)} (${enrichedMetric.rating})`);
    }

    return NextResponse.json({ success: true, metric: enrichedMetric });
  } catch (error) {
    console.error('[Web Vitals API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process metric' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  let filteredMetrics = [...metricsStore];

  // Filter by metric name if provided
  if (name) {
    filteredMetrics = filteredMetrics.filter(m => m.name === name);
  }

  // Get recent metrics
  const recentMetrics = filteredMetrics.slice(-limit);

  // Calculate aggregates
  const aggregates: Record<string, { avg: number; min: number; max: number; count: number; goodPercent: number }> = {};

  for (const metricName of ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'] as const) {
    const metrics = metricsStore.filter(m => m.name === metricName);
    if (metrics.length > 0) {
      const values = metrics.map(m => m.value);
      const goodCount = metrics.filter(m => m.rating === 'good').length;
      aggregates[metricName] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: metrics.length,
        goodPercent: (goodCount / metrics.length) * 100,
      };
    }
  }

  return NextResponse.json({
    metrics: recentMetrics,
    aggregates,
    totalCount: metricsStore.length,
    thresholds,
  });
}
