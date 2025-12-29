/**
 * Core Web Vitals Monitoring
 * Tracking pentru Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
 */

import { cache } from '@/lib/cache';

export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

/**
 * Core Web Vitals thresholds (conform Google)
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FID: { good: 100, poor: 300 },        // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte
  INP: { good: 200, poor: 500 },        // Interaction to Next Paint
};

/**
 * Get rating pentru metric
 */
function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];

  if (value <= threshold.good) {
    return 'good';
  }

  if (value <= threshold.poor) {
    return 'needs-improvement';
  }

  return 'poor';
}

/**
 * Store Web Vitals metric
 */
export function reportWebVitals(metric: WebVitalsMetric) {
  // Add rating
  const metricWithRating = {
    ...metric,
    rating: getRating(metric.name, metric.value),
    timestamp: new Date().toISOString(),
  };

  // Log în console (development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metricWithRating);
  }

  // Store în cache pentru agregare
  const key = `webvitals:${metric.name}`;
  const existing = cache.get<WebVitalsMetric[]>(key) || [];

  existing.push(metricWithRating);

  // Keep only last 100 metrics per type
  if (existing.length > 100) {
    existing.shift();
  }

  cache.set(key, existing, 3600); // 1 hour

  // Send to analytics (când va fi implementat)
  // sendToAnalytics(metricWithRating);
}

/**
 * Get aggregated Web Vitals stats
 */
export function getWebVitalsStats() {
  const metrics = ['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP'] as const;

  const stats = metrics.map((name) => {
    const key = `webvitals:${name}`;
    const data = cache.get<WebVitalsMetric[]>(key) || [];

    if (data.length === 0) {
      return {
        name,
        count: 0,
        avg: 0,
        p75: 0,
        p95: 0,
        good: 0,
        needsImprovement: 0,
        poor: 0,
      };
    }

    const values = data.map((d) => d.value).sort((a, b) => a - b);

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p75 = values[Math.floor(values.length * 0.75)] || 0;
    const p95 = values[Math.floor(values.length * 0.95)] || 0;

    const ratings = data.reduce(
      (acc, d) => {
        acc[d.rating]++;
        return acc;
      },
      { good: 0, 'needs-improvement': 0, poor: 0 }
    );

    return {
      name,
      count: data.length,
      avg: Math.round(avg),
      p75: Math.round(p75),
      p95: Math.round(p95),
      good: ratings.good,
      needsImprovement: ratings['needs-improvement'],
      poor: ratings.poor,
    };
  });

  return stats;
}

/**
 * Check if Web Vitals meet targets
 */
export function checkWebVitalsHealth() {
  const stats = getWebVitalsStats();

  const issues = stats
    .filter((stat) => {
      const threshold = THRESHOLDS[stat.name as keyof typeof THRESHOLDS];
      return stat.p75 > threshold.good || stat.p95 > threshold.poor;
    })
    .map((stat) => ({
      metric: stat.name,
      p75: stat.p75,
      p95: stat.p95,
      issue:
        stat.p95 > THRESHOLDS[stat.name as keyof typeof THRESHOLDS].poor
          ? 'critical'
          : 'warning',
    }));

  return {
    healthy: issues.length === 0,
    issues,
    stats,
  };
}

/**
 * Reset Web Vitals data
 */
export function resetWebVitals() {
  const metrics = ['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP'];

  metrics.forEach((name) => {
    cache.del(`webvitals:${name}`);
  });
}
