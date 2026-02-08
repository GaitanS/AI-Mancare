'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProcessRun {
  id: string;
  status: string;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  process: {
    name: string;
    icon: string;
  };
}

export default function LogsListPage() {
  const [runs, setRuns] = useState<ProcessRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/admin/queue?limit=50');
      if (res.ok) {
        const data = await res.json();
        const allRuns = [
          ...(data.running ? [data.running] : []),
          ...(data.queuedItems || []),
          ...(data.recentCompleted || []),
        ];
        setRuns(allRuns);
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter((run) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return run.status === 'completed';
    if (filter === 'failed') return ['failed', 'cancelled'].includes(run.status);
    return true;
  });

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return '-';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.floor((endTime - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const statusConfig: Record<string, { bg: string; text: string }> = {
    queued: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    running: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400' },
    cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'completed', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : 'Failed'}
          </button>
        ))}
      </div>

      {/* Runs List */}
      {filteredRuns.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-white/5">
          <span className="text-5xl block mb-4">📝</span>
          <h3 className="text-lg font-bold text-white mb-2">No Logs Found</h3>
          <p className="text-neutral-500">
            {filter === 'all'
              ? 'Run some processes to see logs here.'
              : `No ${filter} runs found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRuns.map((run) => {
            const config = statusConfig[run.status] || statusConfig.queued;
            return (
              <Link
                key={run.id}
                href={`/admin/logs/${run.id}`}
                className="block bg-neutral-900 rounded-xl border border-white/5 p-4 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{run.process.icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{run.process.name}</p>
                    <p className="text-xs text-neutral-500">
                      {run.startedAt
                        ? new Date(run.startedAt).toLocaleString('ro-RO')
                        : new Date(run.queuedAt).toLocaleString('ro-RO')}
                      {run.startedAt && run.completedAt && (
                        <span> • {formatDuration(run.startedAt, run.completedAt)}</span>
                      )}
                    </p>
                  </div>

                  <span className={`px-2 py-1 rounded-lg text-xs ${config.bg} ${config.text}`}>
                    {run.status}
                  </span>

                  <span className="text-neutral-500">→</span>
                </div>

                {run.error && (
                  <p className="mt-2 text-sm text-red-400 truncate">{run.error}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
