/**
 * Performance Dashboard Page
 * Real-time monitoring and metrics visualization
 */

'use client'

import { useState, useEffect } from 'react'

interface Metrics {
    counters: Record<string, number>
    gauges: Record<string, number>
    histograms: Record<string, {
        count: number
        sum: number
        avg: number
    }>
}

interface Health {
    status: string
    timestamp: string
    version: string
    environment: string
}

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [health, setHealth] = useState<Health | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            const [metricsRes, healthRes] = await Promise.all([
                fetch('/api/metrics?format=json'),
                fetch('/api/health')
            ])

            if (metricsRes.ok) {
                setMetrics(await metricsRes.json())
            }
            if (healthRes.ok) {
                setHealth(await healthRes.json())
            }
            setError(null)
        } catch (err) {
            setError('Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [])

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms.toFixed(0)}ms`
        return `${(ms / 1000).toFixed(2)}s`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">📊 Performance Dashboard</h1>
                    <p className="text-gray-400">Real-time application monitoring</p>
                </header>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Health Status */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">🏥 Health Status</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className={`rounded-lg p-4 ${health?.status === 'healthy' ? 'bg-green-900/50 border border-green-500' : 'bg-red-900/50 border border-red-500'}`}>
                            <p className="text-sm text-gray-400">Status</p>
                            <p className="text-2xl font-bold">{health?.status || 'Unknown'}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Version</p>
                            <p className="text-2xl font-bold">{health?.version || '-'}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Environment</p>
                            <p className="text-2xl font-bold">{health?.environment || '-'}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Last Updated</p>
                            <p className="text-lg font-bold">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-'}</p>
                        </div>
                    </div>
                </section>

                {/* System Metrics */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">💻 System Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Heap Used</p>
                            <p className="text-2xl font-bold">{formatBytes(metrics?.gauges['nodejs_heap_used_bytes'] || 0)}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Heap Total</p>
                            <p className="text-2xl font-bold">{formatBytes(metrics?.gauges['nodejs_heap_total_bytes'] || 0)}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">RSS</p>
                            <p className="text-2xl font-bold">{formatBytes(metrics?.gauges['nodejs_rss_bytes'] || 0)}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Cache Keys</p>
                            <p className="text-2xl font-bold">{metrics?.gauges['cache_keys_count'] || 0}</p>
                        </div>
                    </div>
                </section>

                {/* Request Metrics */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">📈 Request Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Total HTTP Requests</p>
                            <p className="text-2xl font-bold">
                                {Object.entries(metrics?.counters || {})
                                    .filter(([k]) => k.startsWith('http_requests_total'))
                                    .reduce((sum, [, v]) => sum + v, 0)}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Avg Response Time</p>
                            <p className="text-2xl font-bold">
                                {formatDuration(metrics?.histograms['http_request_duration_ms']?.avg || 0)}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Cache Hit Rate</p>
                            <p className="text-2xl font-bold">
                                {(metrics?.gauges['cache_hit_rate'] || 0).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </section>

                {/* AI Metrics */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">🤖 AI Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">AI Operations</p>
                            <p className="text-2xl font-bold">
                                {Object.entries(metrics?.counters || {})
                                    .filter(([k]) => k.startsWith('ai_operations_total'))
                                    .reduce((sum, [, v]) => sum + v, 0)}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Total Tokens</p>
                            <p className="text-2xl font-bold">
                                {Object.entries(metrics?.counters || {})
                                    .filter(([k]) => k.startsWith('ai_tokens_total'))
                                    .reduce((sum, [, v]) => sum + v, 0)
                                    .toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Avg AI Duration</p>
                            <p className="text-2xl font-bold">
                                {formatDuration(metrics?.histograms['ai_operation_duration_ms']?.avg || 0)}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Total Cost (cents)</p>
                            <p className="text-2xl font-bold">
                                ${((Object.entries(metrics?.counters || {})
                                    .filter(([k]) => k.startsWith('ai_cost_total'))
                                    .reduce((sum, [, v]) => sum + v, 0)) / 10000).toFixed(4)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Database Metrics */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">🗄️ Database Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Total Queries</p>
                            <p className="text-2xl font-bold">
                                {Object.entries(metrics?.counters || {})
                                    .filter(([k]) => k.startsWith('db_queries_total'))
                                    .reduce((sum, [, v]) => sum + v, 0)}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Avg Query Time</p>
                            <p className="text-2xl font-bold">
                                {formatDuration(metrics?.histograms['db_query_duration_ms']?.avg || 0)}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400">Total Query Time</p>
                            <p className="text-2xl font-bold">
                                {formatDuration(metrics?.histograms['db_query_duration_ms']?.sum || 0)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Raw Counters */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">📊 All Counters</h2>
                    <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="pb-2">Metric</th>
                                    <th className="pb-2 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(metrics?.counters || {}).map(([key, value]) => (
                                    <tr key={key} className="border-b border-gray-700/50">
                                        <td className="py-2 font-mono text-sm">{key}</td>
                                        <td className="py-2 text-right">{value.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center text-gray-500 text-sm">
                    <p>Auto-refreshes every 10 seconds</p>
                    <p className="mt-2">
                        <a href="/api/metrics" className="text-blue-400 hover:underline">View Prometheus Metrics</a>
                        {' | '}
                        <a href="/api/docs" className="text-blue-400 hover:underline">View API Docs</a>
                    </p>
                </footer>
            </div>
        </div>
    )
}
