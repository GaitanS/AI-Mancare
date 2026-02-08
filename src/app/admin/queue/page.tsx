'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProcessRun {
  id: string;
  processId: string;
  status: string;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progress: string | null;
  result: string | null;
  error: string | null;
  triggeredBy: string;
  process: {
    name: string;
    icon: string;
    type: string;
  };
}

interface QueueData {
  running: ProcessRun | null;
  queued: number;
  queuedItems: ProcessRun[];
  recentCompleted: ProcessRun[];
}

export default function QueuePage() {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/admin/queue?limit=20');
      if (res.ok) {
        const data = await res.json();
        setQueueData(data);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (runId: string) => {
    setCancellingId(runId);
    try {
      const res = await fetch(`/api/admin/queue/${runId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchQueue();
      }
    } catch (error) {
      console.error('Failed to cancel run:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const parseProgress = (progressStr: string | null) => {
    if (!progressStr) return null;
    try {
      return JSON.parse(progressStr);
    } catch {
      return null;
    }
  };

  const parseResult = (resultStr: string | null) => {
    if (!resultStr) return null;
    try {
      return JSON.parse(resultStr);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading queue...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Currently Running */}
      <section>
        <h2 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
          <span className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-amber-400 animate-pulse" />
          Currently Running
        </h2>

        {queueData?.running ? (
          <RunningProcessCard
            run={queueData.running}
            progress={parseProgress(queueData.running.progress)}
            onCancel={() => handleCancel(queueData.running!.id)}
            cancelling={cancellingId === queueData.running.id}
          />
        ) : (
          <div className="bg-neutral-900 rounded-xl border border-white/5 p-6 lg:p-8 text-center">
            <span className="text-3xl lg:text-4xl block mb-2">😴</span>
            <p className="text-neutral-500 text-sm lg:text-base">No process currently running</p>
            <Link
              href="/admin/processes"
              className="inline-block mt-3 lg:mt-4 text-primary-400 hover:text-primary-300 text-sm lg:text-base"
            >
              Go to Processes →
            </Link>
          </div>
        )}
      </section>

      {/* Queue */}
      {queueData && queueData.queuedItems.length > 0 && (
        <section>
          <h2 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
            <span className="text-lg lg:text-xl">📋</span>
            Queued ({queueData.queued})
          </h2>

          <div className="space-y-2">
            {queueData.queuedItems.map((run, index) => (
              <QueuedItemCard
                key={run.id}
                run={run}
                position={index + 1}
                onCancel={() => handleCancel(run.id)}
                cancelling={cancellingId === run.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <h2 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
          <span className="text-lg lg:text-xl">📜</span>
          Recent History
        </h2>

        {queueData?.recentCompleted && queueData.recentCompleted.length > 0 ? (
          <div className="space-y-2">
            {queueData.recentCompleted.map((run) => (
              <HistoryItemCard
                key={run.id}
                run={run}
                result={parseResult(run.result)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-neutral-900 rounded-xl border border-white/5 p-6 lg:p-8 text-center">
            <p className="text-neutral-500 text-sm lg:text-base">No history yet</p>
          </div>
        )}
      </section>
    </div>
  );
}

function RunningProcessCard({
  run,
  progress,
  onCancel,
  cancelling,
}: {
  run: ProcessRun;
  progress: { current?: number; total?: number; message?: string } | null;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const startTime = run.startedAt ? new Date(run.startedAt) : new Date();
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  const progressPercent = progress?.total
    ? Math.round(((progress.current || 0) / progress.total) * 100)
    : 0;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 p-4 lg:p-6">
      <div className="flex items-start justify-between mb-3 lg:mb-4 gap-3">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <span className="text-2xl lg:text-3xl shrink-0">{run.process.icon}</span>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base lg:text-lg truncate">{run.process.name}</h3>
            <p className="text-xs lg:text-sm text-amber-400">Running for {elapsedStr}</p>
          </div>
        </div>

        <button
          onClick={onCancel}
          disabled={cancelling}
          className="px-2.5 lg:px-4 py-1.5 lg:py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 text-xs lg:text-sm shrink-0"
        >
          {cancelling ? '...' : '🛑 Stop'}
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div className="space-y-2">
          {progress.message && (
            <p className="text-xs lg:text-sm text-neutral-400 truncate">{progress.message}</p>
          )}

          {progress.total && progress.total > 0 && (
            <>
              <div className="flex items-center justify-between text-xs lg:text-sm">
                <span className="text-neutral-500">Progress</span>
                <span className="text-amber-400">
                  {progress.current || 0} / {progress.total} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 lg:h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* View Logs Link */}
      <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-amber-500/20">
        <Link
          href={`/admin/logs/${run.id}`}
          className="text-xs lg:text-sm text-amber-400 hover:text-amber-300"
        >
          View Live Logs →
        </Link>
      </div>
    </div>
  );
}

function QueuedItemCard({
  run,
  position,
  onCancel,
  cancelling,
}: {
  run: ProcessRun;
  position: number;
  onCancel: () => void;
  cancelling: boolean;
}) {
  return (
    <div className="bg-neutral-900 rounded-xl border border-white/5 p-3 lg:p-4 flex items-center gap-2 lg:gap-4">
      <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs lg:text-sm shrink-0">
        {position}
      </div>

      <span className="text-xl lg:text-2xl shrink-0">{run.process.icon}</span>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm lg:text-base truncate">{run.process.name}</p>
        <p className="text-[10px] lg:text-xs text-neutral-500 truncate flex items-center gap-1.5">
          Queued {new Date(run.queuedAt).toLocaleString('ro-RO')}
          {run.triggeredBy && run.triggeredBy !== 'manual' && (
            <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[9px] font-medium">
              {run.triggeredBy}
            </span>
          )}
        </p>
      </div>

      <button
        onClick={onCancel}
        disabled={cancelling}
        className="px-2 lg:px-3 py-1 lg:py-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 shrink-0"
      >
        {cancelling ? '...' : '✕'}
      </button>
    </div>
  );
}

function HistoryItemCard({
  run,
  result,
}: {
  run: ProcessRun;
  result: Record<string, unknown> | null;
}) {
  const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✅' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400', icon: '❌' },
    cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', icon: '⏹️' },
  };

  const config = statusConfig[run.status] || statusConfig.completed;

  // Calculate duration
  let duration = '';
  if (run.startedAt && run.completedAt) {
    const start = new Date(run.startedAt).getTime();
    const end = new Date(run.completedAt).getTime();
    const seconds = Math.floor((end - start) / 1000);
    duration = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  return (
    <div className={`rounded-xl border p-3 lg:p-4 ${config.bg} border-white/5`}>
      <div className="flex items-center gap-2 lg:gap-4">
        <span className="text-xl lg:text-2xl shrink-0">{run.process.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <p className="font-medium text-white text-sm lg:text-base truncate">{run.process.name}</p>
            <span className={`text-[10px] lg:text-xs ${config.text}`}>{config.icon}</span>
          </div>
          <p className="text-[10px] lg:text-xs text-neutral-500 flex items-center gap-1.5">
            <span>
              {run.completedAt
                ? new Date(run.completedAt).toLocaleString('ro-RO')
                : 'In progress'}
              {duration && ` • ${duration}`}
            </span>
            {run.triggeredBy && run.triggeredBy !== 'manual' && (
              <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[9px] font-medium">
                {run.triggeredBy}
              </span>
            )}
          </p>
        </div>

        {/* Quick Stats */}
        {result && (
          <div className="hidden lg:flex items-center gap-4 text-sm text-neutral-400">
            {typeof result.productsFound === 'number' && (
              <span>{result.productsFound} products</span>
            )}
            {typeof result.recipesGenerated === 'number' && (
              <span>{result.recipesGenerated} recipes</span>
            )}
            {typeof result.catalogsProcessed === 'number' && (
              <span>{result.catalogsProcessed} catalogs</span>
            )}
          </div>
        )}

        {/* View Logs */}
        <Link
          href={`/admin/logs/${run.id}`}
          className="px-2 lg:px-3 py-1 lg:py-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-xs lg:text-sm shrink-0"
        >
          Logs
        </Link>
      </div>

      {/* Error Display */}
      {run.error && (
        <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-red-500/20">
          <p className="text-xs lg:text-sm text-red-400 truncate">{run.error}</p>
        </div>
      )}
    </div>
  );
}
