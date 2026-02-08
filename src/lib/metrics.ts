/**
 * Application Metrics Collector
 * Skill: observability-monitoring
 * 
 * Collects and exposes metrics for monitoring
 */

import { logger } from './logger'

interface MetricValue {
    value: number
    timestamp: number
}

interface HistogramBucket {
    le: number
    count: number
}

interface Histogram {
    buckets: HistogramBucket[]
    sum: number
    count: number
}

/**
 * Metrics collector singleton
 */
class MetricsCollector {
    private counters: Map<string, MetricValue> = new Map()
    private gauges: Map<string, MetricValue> = new Map()
    private histograms: Map<string, Histogram> = new Map()

    // Histogram bucket boundaries (in milliseconds for durations)
    private readonly DURATION_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

    constructor() {
        // Initialize default metrics
        this.initializeMetrics()
    }

    private initializeMetrics() {
        // Pre-initialize common histograms
        this.histograms.set('http_request_duration_ms', this.createHistogram())
        this.histograms.set('db_query_duration_ms', this.createHistogram())
        this.histograms.set('ai_operation_duration_ms', this.createHistogram())
    }

    private createHistogram(): Histogram {
        return {
            buckets: this.DURATION_BUCKETS.map(le => ({ le, count: 0 })),
            sum: 0,
            count: 0
        }
    }

    /**
     * Increment a counter
     */
    incCounter(name: string, value: number = 1, labels?: Record<string, string>) {
        const key = this.buildKey(name, labels)
        const existing = this.counters.get(key) || { value: 0, timestamp: Date.now() }
        existing.value += value
        existing.timestamp = Date.now()
        this.counters.set(key, existing)
    }

    /**
     * Set a gauge value
     */
    setGauge(name: string, value: number, labels?: Record<string, string>) {
        const key = this.buildKey(name, labels)
        this.gauges.set(key, {
            value,
            timestamp: Date.now()
        })
    }

    /**
     * Record a value in a histogram
     */
    observeHistogram(name: string, value: number) {
        let histogram = this.histograms.get(name)
        if (!histogram) {
            histogram = this.createHistogram()
            this.histograms.set(name, histogram)
        }

        histogram.sum += value
        histogram.count++

        // Update buckets
        for (const bucket of histogram.buckets) {
            if (value <= bucket.le) {
                bucket.count++
            }
        }
    }

    /**
     * Time an async function and record to histogram
     */
    async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = Date.now()
        try {
            return await fn()
        } finally {
            this.observeHistogram(name, Date.now() - start)
        }
    }

    /**
     * Build metric key with labels
     */
    private buildKey(name: string, labels?: Record<string, string>): string {
        if (!labels) return name
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        return `${name}{${labelStr}}`
    }

    /**
     * Get all metrics in Prometheus format
     */
    toPrometheusFormat(): string {
        const lines: string[] = []

        // Counters
        for (const [key, metric] of this.counters) {
            lines.push(`# TYPE ${key.split('{')[0]} counter`)
            lines.push(`${key} ${metric.value}`)
        }

        // Gauges
        for (const [key, value] of this.gauges) {
            lines.push(`# TYPE ${key.split('{')[0]} gauge`)
            lines.push(`${key} ${value.value}`)
        }

        // Histograms
        for (const [name, histogram] of this.histograms) {
            lines.push(`# TYPE ${name} histogram`)
            for (const bucket of histogram.buckets) {
                lines.push(`${name}_bucket{le="${bucket.le}"} ${bucket.count}`)
            }
            lines.push(`${name}_bucket{le="+Inf"} ${histogram.count}`)
            lines.push(`${name}_sum ${histogram.sum}`)
            lines.push(`${name}_count ${histogram.count}`)
        }

        return lines.join('\n')
    }

    /**
     * Get metrics as JSON
     */
    toJSON() {
        const counters: Record<string, number> = {}
        for (const [key, metric] of this.counters) {
            counters[key] = metric.value
        }

        const gauges: Record<string, number> = {}
        for (const [key, value] of this.gauges) {
            gauges[key] = value.value
        }

        const histograms: Record<string, any> = {}
        for (const [name, histogram] of this.histograms) {
            histograms[name] = {
                count: histogram.count,
                sum: histogram.sum,
                avg: histogram.count > 0 ? histogram.sum / histogram.count : 0,
                buckets: histogram.buckets
            }
        }

        return { counters, gauges, histograms }
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.counters.clear()
        this.gauges.clear()
        this.initializeMetrics()
        logger.info('Metrics reset')
    }
}

// Singleton instance
export const metrics = new MetricsCollector()

/**
 * Common metric helpers
 */
export const Metrics = {
    // HTTP metrics
    httpRequest(method: string, path: string, status: number, duration: number) {
        metrics.incCounter('http_requests_total', 1, { method, path, status: String(status) })
        metrics.observeHistogram('http_request_duration_ms', duration)
    },

    // Database metrics
    dbQuery(operation: string, table: string, duration: number) {
        metrics.incCounter('db_queries_total', 1, { operation, table })
        metrics.observeHistogram('db_query_duration_ms', duration)
    },

    // AI metrics
    aiOperation(operation: string, tokens: number, cost: number, duration: number) {
        metrics.incCounter('ai_operations_total', 1, { operation })
        metrics.incCounter('ai_tokens_total', tokens, { operation })
        metrics.incCounter('ai_cost_total', Math.round(cost * 10000), { operation }) // Store as integer (0.0001 cents)
        metrics.observeHistogram('ai_operation_duration_ms', duration)
    },

    // Cache metrics
    cacheHit(key: string) {
        metrics.incCounter('cache_hits_total', 1)
    },

    cacheMiss(key: string) {
        metrics.incCounter('cache_misses_total', 1)
    },

    // Business metrics
    productExtracted(store: string, count: number) {
        metrics.incCounter('products_extracted_total', count, { store })
    },

    recipeGenerated(difficulty: string) {
        metrics.incCounter('recipes_generated_total', 1, { difficulty })
    },

    // System metrics
    updateSystemMetrics(memoryUsage: NodeJS.MemoryUsage) {
        metrics.setGauge('nodejs_heap_used_bytes', memoryUsage.heapUsed)
        metrics.setGauge('nodejs_heap_total_bytes', memoryUsage.heapTotal)
        metrics.setGauge('nodejs_external_bytes', memoryUsage.external)
        metrics.setGauge('nodejs_rss_bytes', memoryUsage.rss)
    }
}

// Update system metrics every 30 seconds
if (typeof setInterval !== 'undefined' && process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        Metrics.updateSystemMetrics(process.memoryUsage())
    }, 30000)
}
