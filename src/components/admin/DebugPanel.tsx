'use client';

import { useState, useEffect } from 'react';

interface DebugInfo {
  timestamp: string;
  system: {
    memory: Record<string, string>;
    uptime: number;
    nodeVersion: string;
    platform: string;
    pid: number;
  };
  database: {
    status: string;
    stats: Record<string, number>;
  };
  errors: {
    stats: {
      total: number;
      byLevel: Record<string, number>;
      byContext: Record<string, number>;
    };
    recent: Array<{
      level: string;
      message: string;
      timestamp: string;
      context?: string;
      error?: {
        name: string;
        message: string;
      };
    }>;
  };
  logs: {
    files: Array<{
      name: string;
      size: number;
      date: string;
    }>;
    totalFiles: number;
  };
  storage: Record<string, string>;
  metrics: any;
}

export default function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchDebugInfo = async () => {
    try {
      const res = await fetch('/api/admin/debug');
      if (res.ok) {
        const data = await res.json();
        setDebugInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDebugInfo, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-neutral-400">Loading debug information...</p>
      </div>
    );
  }

  if (!debugInfo) {
    return (
      <div className="p-8 text-center text-red-400">
        Failed to load debug information
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">🔧 Debug & Monitoring</h2>
          <p className="text-neutral-400 text-sm">System health and diagnostics</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchDebugInfo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">💻 System Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Heap Used"
            value={debugInfo.system.memory.heapUsed}
            icon="💾"
          />
          <MetricCard
            label="Heap Total"
            value={debugInfo.system.memory.heapTotal}
            icon="📊"
          />
          <MetricCard
            label="RSS Memory"
            value={debugInfo.system.memory.rss}
            icon="🧠"
          />
          <MetricCard
            label="Uptime"
            value={formatUptime(debugInfo.system.uptime)}
            icon="⏱️"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between text-neutral-400">
            <span>Node Version:</span>
            <span className="text-white">{debugInfo.system.nodeVersion}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Platform:</span>
            <span className="text-white">{debugInfo.system.platform}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Process ID:</span>
            <span className="text-white">{debugInfo.system.pid}</span>
          </div>
        </div>
      </div>

      {/* Database Status */}
      <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">🗄️ Database Status</h3>
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              debugInfo.database.status === 'connected'
                ? 'bg-green-900/30 text-green-400 border border-green-500/20'
                : 'bg-red-900/30 text-red-400 border border-red-500/20'
            }`}
          >
            {debugInfo.database.status === 'connected' ? '✅ Connected' : '❌ Disconnected'}
          </span>
        </div>
        {debugInfo.database.status === 'connected' && (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(debugInfo.database.stats).map(([key, value]) => (
              <MetricCard
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={value.toLocaleString()}
                icon="📦"
              />
            ))}
          </div>
        )}
      </div>

      {/* Error Dashboard */}
      <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          🚨 Errors & Warnings ({debugInfo.errors.stats.total})
        </h3>

        {debugInfo.errors.stats.total > 0 ? (
          <>
            {/* Error Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {Object.entries(debugInfo.errors.stats.byLevel).map(([level, count]) => (
                <div
                  key={level}
                  className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
                >
                  <div className="text-xs text-neutral-400 uppercase">{level}</div>
                  <div className="text-2xl font-bold text-red-400">{count}</div>
                </div>
              ))}
            </div>

            {/* Recent Errors */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-neutral-400 mb-2">
                Recent Errors:
              </h4>
              {debugInfo.errors.recent.map((error, idx) => (
                <div
                  key={idx}
                  className="bg-red-950/20 border border-red-900/30 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-400 text-xs font-bold uppercase">
                          {error.level}
                        </span>
                        {error.context && (
                          <span className="text-neutral-500 text-xs">
                            [{error.context}]
                          </span>
                        )}
                      </div>
                      <p className="text-white text-sm">{error.message}</p>
                      {error.error && (
                        <p className="text-red-400/70 text-xs mt-1">
                          {error.error.name}: {error.error.message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500 whitespace-nowrap ml-4">
                      {new Date(error.timestamp).toLocaleString('ro-RO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            ✅ No errors today - All systems operational!
          </div>
        )}
      </div>

      {/* Log Files */}
      <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          📄 Log Files ({debugInfo.logs.totalFiles})
        </h3>
        <div className="space-y-2">
          {debugInfo.logs.files.slice(0, 10).map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between bg-neutral-800 rounded-lg p-3"
            >
              <span className="text-white font-mono text-sm">{file.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-neutral-400 text-xs">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <span className="text-neutral-500 text-xs">
                  {new Date(file.date).toLocaleDateString('ro-RO')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Storage Info */}
      <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">💾 Storage</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(debugInfo.storage).map(([key, value]) => (
            <MetricCard
              key={key}
              label={key.replace('Size', ' Size')}
              value={value}
              icon="📁"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-neutral-400 uppercase font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
