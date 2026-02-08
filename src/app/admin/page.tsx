'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  products: number;
  recipes: number;
  stores: number;
  categories: number;
}

interface BudgetSummary {
  today: { costCents: number; calls: number };
  week: { costCents: number; calls: number };
  month: { costCents: number; calls: number };
}

interface QueueSummary {
  running: ProcessRun | null;
  queued: number;
  recentCompleted: ProcessRun[];
}

interface ProcessRun {
  id: string;
  processId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  process?: {
    name: string;
    icon: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<QueueSummary | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, queueRes, budgetRes] = await Promise.all([
        fetch('/api/admin/db-stats'),
        fetch('/api/admin/queue?limit=5'),
        fetch('/api/admin/budget?period=dashboard'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData);
      }

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudget(budgetData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <StatCard
          title="Products"
          value={stats?.products ?? '...'}
          icon="📦"
          color="emerald"
          href="/admin/stores"
        />
        <StatCard
          title="Recipes"
          value={stats?.recipes ?? '...'}
          icon="🍳"
          color="orange"
          href="/admin/processes"
        />
        <StatCard
          title="Stores"
          value={stats?.stores ?? '...'}
          icon="🏪"
          color="blue"
          href="/admin/stores"
        />
        <StatCard
          title="Categories"
          value={stats?.categories ?? '...'}
          icon="🏷️"
          color="purple"
        />
      </div>

      {/* Quick Actions & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
        {/* Currently Running */}
        <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
            <span className="text-lg lg:text-xl">⚡</span>
            Current Activity
          </h2>

          {queue?.running ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg lg:rounded-xl p-3 lg:p-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <span className="text-xl lg:text-2xl">{queue.running.process?.icon || '⏳'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm lg:text-base truncate">
                    {queue.running.process?.name || 'Unknown Process'}
                  </p>
                  <p className="text-xs lg:text-sm text-amber-400 flex items-center gap-1.5 lg:gap-2">
                    <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="truncate">
                      Since {queue.running.startedAt
                        ? new Date(queue.running.startedAt).toLocaleTimeString('ro-RO')
                        : 'now'}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/admin/queue`}
                  className="px-2 lg:px-3 py-1 lg:py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs lg:text-sm hover:bg-amber-500/30 transition-colors shrink-0"
                >
                  View
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 lg:py-8 text-neutral-500">
              <span className="text-3xl lg:text-4xl block mb-2">😴</span>
              <p className="text-sm lg:text-base">No processes running</p>
              <Link
                href="/admin/processes"
                className="inline-block mt-3 lg:mt-4 px-3 lg:px-4 py-1.5 lg:py-2 bg-primary-500/10 text-primary-400 rounded-lg text-sm hover:bg-primary-500/20 transition-colors"
              >
                Start a Process
              </Link>
            </div>
          )}

          {/* Queued count */}
          {queue && queue.queued > 0 && (
            <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-white/5">
              <p className="text-neutral-400 text-xs lg:text-sm">
                <span className="text-white font-medium">{queue.queued}</span> process{queue.queued > 1 ? 'es' : ''} waiting in queue
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
            <span className="text-lg lg:text-xl">🚀</span>
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <QuickActionButton
              icon="📚"
              label="Scrape Catalogs"
              color="blue"
              href="/admin/processes"
            />
            <QuickActionButton
              icon="📦"
              label="Extract Products"
              color="emerald"
              href="/admin/processes"
            />
            <QuickActionButton
              icon="🍳"
              label="Generate Recipes"
              color="orange"
              href="/admin/processes"
            />
            <QuickActionButton
              icon="🖼️"
              label="Generate Images"
              color="pink"
              href="/admin/processes"
            />
          </div>
        </div>
      </div>

      {/* AI Budget Card */}
      {budget && (
        <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-lg lg:text-xl">💰</span>
              AI Budget
            </h2>
            <Link
              href="/admin/budget"
              className="text-xs lg:text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Details →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-neutral-800/50 rounded-xl">
              <p className="text-lg lg:text-xl font-bold font-mono text-emerald-400">
                ${(budget.today.costCents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] lg:text-xs text-neutral-500 mt-1">Today ({budget.today.calls} calls)</p>
            </div>
            <div className="text-center p-3 bg-neutral-800/50 rounded-xl">
              <p className="text-lg lg:text-xl font-bold font-mono text-blue-400">
                ${(budget.week.costCents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] lg:text-xs text-neutral-500 mt-1">This Week ({budget.week.calls})</p>
            </div>
            <div className="text-center p-3 bg-neutral-800/50 rounded-xl">
              <p className="text-lg lg:text-xl font-bold font-mono text-purple-400">
                ${(budget.month.costCents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] lg:text-xs text-neutral-500 mt-1">This Month ({budget.month.calls})</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <span className="text-lg lg:text-xl">📋</span>
            Recent Activity
          </h2>
          <Link
            href="/admin/queue"
            className="text-xs lg:text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            View All →
          </Link>
        </div>

        {queue?.recentCompleted && queue.recentCompleted.length > 0 ? (
          <div className="space-y-2">
            {queue.recentCompleted.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-2 lg:gap-4 p-2 lg:p-3 bg-neutral-800/50 rounded-lg lg:rounded-xl"
              >
                <span className="text-lg lg:text-xl">{run.process?.icon || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm lg:text-base truncate">
                    {run.process?.name || 'Unknown Process'}
                  </p>
                  <p className="text-[10px] lg:text-xs text-neutral-500">
                    {run.completedAt
                      ? new Date(run.completedAt).toLocaleString('ro-RO')
                      : 'In progress'}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 lg:py-8 text-neutral-500">
            <p className="text-sm lg:text-base">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  href,
}: {
  title: string;
  value: number | string;
  icon: string;
  color: 'emerald' | 'orange' | 'blue' | 'purple';
  href?: string;
}) {
  const colorClasses = {
    emerald: 'text-emerald-400',
    orange: 'text-orange-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  const content = (
    <div className="bg-neutral-900 border border-white/5 p-3 lg:p-5 rounded-lg lg:rounded-xl flex items-center gap-2 lg:gap-4 hover:bg-neutral-800/50 transition-colors">
      <div className="text-2xl lg:text-3xl">{icon}</div>
      <div className="min-w-0">
        <p className="text-neutral-500 text-[10px] lg:text-xs uppercase font-bold tracking-wider truncate">{title}</p>
        <p className={`text-lg lg:text-2xl font-bold font-mono ${colorClasses[color]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function QuickActionButton({
  icon,
  label,
  color,
  href,
}: {
  icon: string;
  label: string;
  color: 'blue' | 'emerald' | 'orange' | 'pink';
  href: string;
}) {
  const colorClasses = {
    blue: 'hover:bg-blue-500/10 hover:border-blue-500/30',
    emerald: 'hover:bg-emerald-500/10 hover:border-emerald-500/30',
    orange: 'hover:bg-orange-500/10 hover:border-orange-500/30',
    pink: 'hover:bg-pink-500/10 hover:border-pink-500/30',
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 lg:gap-3 p-3 lg:p-4 bg-neutral-800/50 border border-white/5 rounded-lg lg:rounded-xl transition-all ${colorClasses[color]}`}
    >
      <span className="text-xl lg:text-2xl">{icon}</span>
      <span className="font-medium text-xs lg:text-sm text-white truncate">{label}</span>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
    cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', label: 'Cancelled' },
    running: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Running' },
    queued: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Queued' },
  };

  const config = statusConfig[status] || statusConfig.queued;

  return (
    <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md lg:rounded-lg text-[10px] lg:text-xs font-medium ${config.bg} ${config.text} shrink-0`}>
      {config.label}
    </span>
  );
}
