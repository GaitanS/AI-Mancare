'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';

interface ProcessRun {
  id: string;
  status: string;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progress: { current?: number; total?: number; message?: string } | null;
  result: Record<string, unknown> | null;
  error: string | null;
  triggeredBy: string;
  process: {
    name: string;
    icon: string;
    type: string;
  };
}

export default function LogsPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params);
  const [run, setRun] = useState<ProcessRun | null>(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();

    // Poll for updates if still running
    const interval = setInterval(() => {
      if (run?.status === 'running' || run?.status === 'queued') {
        fetchLogs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runId, run?.status]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/logs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setRun(data.run);
        setLogs(data.logs || '');
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return '-';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.floor((endTime - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
    queued: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '⏳' },
    running: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '⚡' },
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✅' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400', icon: '❌' },
    cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', icon: '⏹️' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading logs...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">❓</span>
        <h3 className="text-lg font-bold text-white mb-2">Run Not Found</h3>
        <Link href="/admin/queue" className="text-primary-400 hover:text-primary-300">
          ← Back to Queue
        </Link>
      </div>
    );
  }

  const config = statusConfig[run.status] || statusConfig.queued;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/queue"
        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        ← Back to Queue
      </Link>

      {/* Header */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{run.process.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{run.process.name}</h1>
              <p className="text-sm text-neutral-500">
                {run.process.type} • Triggered {run.triggeredBy}
              </p>
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-lg ${config.bg} ${config.text} flex items-center gap-2`}>
            <span>{config.icon}</span>
            <span className="capitalize">{run.status}</span>
            {run.status === 'running' && (
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            )}
          </div>
        </div>

        {/* Timing & Progress */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase">Queued</p>
            <p className="text-sm text-white">
              {new Date(run.queuedAt).toLocaleString('ro-RO')}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Started</p>
            <p className="text-sm text-white">
              {run.startedAt
                ? new Date(run.startedAt).toLocaleString('ro-RO')
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Duration</p>
            <p className="text-sm text-white">
              {formatDuration(run.startedAt, run.completedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Progress</p>
            <p className="text-sm text-white">
              {run.progress?.total
                ? `${run.progress.current || 0} / ${run.progress.total}`
                : '-'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {run.progress?.total && run.progress.total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>{run.progress.message}</span>
              <span>
                {Math.round(((run.progress.current || 0) / run.progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  run.status === 'running'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${((run.progress.current || 0) / run.progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {run.error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{run.error}</p>
          </div>
        )}

        {/* Result */}
        {run.result && Object.keys(run.result).length > 0 && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-xs text-neutral-500 uppercase mb-2">Result</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(run.result).map(([key, value]) => (
                <div key={key}>
                  <span className="text-emerald-400 font-medium">{String(value)}</span>
                  <span className="text-neutral-500 ml-1">{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-bold text-white">Logs</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            <button
              onClick={() => navigator.clipboard.writeText(logs)}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4 bg-neutral-950 font-mono text-sm">
          {logs ? (
            <pre className="whitespace-pre-wrap text-neutral-300">{logs}</pre>
          ) : (
            <p className="text-neutral-500">No logs yet...</p>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
