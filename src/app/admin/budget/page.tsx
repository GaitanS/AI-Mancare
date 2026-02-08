'use client';

import { useState, useEffect } from 'react';

interface BudgetEntry {
  id: string;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostCents: number;
  duration: number;
  recipeId: string | null;
  createdAt: string;
}

interface BudgetStats {
  totalCalls: number;
  totalCostCents: number;
  totalTokens: number;
  avgDurationMs: number;
  byOperation: Record<string, { calls: number; totalCostCents: number; totalTokens: number }>;
  recentEntries: BudgetEntry[];
}

const OP_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  recipe_generation: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: '🍳' },
  image_generation: { bg: 'bg-pink-500/10', text: 'text-pink-400', icon: '🖼️' },
  semantic_search: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '🔍' },
  pdf_processing: { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: '📄' },
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

export default function BudgetPage() {
  const [dashboard, setDashboard] = useState<{ today: any; week: any; month: any } | null>(null);
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, statsRes] = await Promise.all([
        fetch('/api/admin/budget?period=dashboard'),
        fetch('/api/admin/budget?period=custom'),
      ]);

      if (dashRes.ok) setDashboard(await dashRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading budget data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dashboard && (
          <>
            <PeriodCard label="Today" costCents={dashboard.today.costCents} calls={dashboard.today.calls} color="emerald" />
            <PeriodCard label="This Week" costCents={dashboard.week.costCents} calls={dashboard.week.calls} color="blue" />
            <PeriodCard label="This Month" costCents={dashboard.month.costCents} calls={dashboard.month.calls} color="purple" />
          </>
        )}
      </div>

      {/* By Operation Breakdown */}
      {stats && Object.keys(stats.byOperation).length > 0 && (
        <div className="bg-neutral-900 rounded-xl border border-white/5 p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-white mb-4">Cost by Operation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(stats.byOperation).map(([op, data]) => {
              const opStyle = OP_COLORS[op] || OP_COLORS.recipe_generation;
              return (
                <div key={op} className={`${opStyle.bg} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{opStyle.icon}</span>
                    <span className={`text-sm font-medium ${opStyle.text}`}>
                      {op.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCents(data.totalCostCents)}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {data.calls} calls · {formatTokens(data.totalTokens)} tokens
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aggregate Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="Total Calls" value={String(stats.totalCalls)} />
          <MiniStat label="Total Cost" value={formatCents(stats.totalCostCents)} />
          <MiniStat label="Total Tokens" value={formatTokens(stats.totalTokens)} />
          <MiniStat label="Avg Duration" value={`${(stats.avgDurationMs / 1000).toFixed(1)}s`} />
        </div>
      )}

      {/* Recent Entries Table */}
      {stats && stats.recentEntries.length > 0 && (
        <div className="bg-neutral-900 rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-base font-bold text-white">Recent API Calls</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Operation</th>
                  <th className="text-left p-3">Model</th>
                  <th className="text-right p-3">Tokens</th>
                  <th className="text-right p-3">Cost</th>
                  <th className="text-right p-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEntries.map((entry) => {
                  const opStyle = OP_COLORS[entry.operation] || OP_COLORS.recipe_generation;
                  return (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3">
                        <p className="text-white text-xs">
                          {new Date(entry.createdAt).toLocaleString('ro-RO')}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md text-xs ${opStyle.bg} ${opStyle.text}`}>
                          {entry.operation.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-400 text-xs font-mono truncate max-w-[150px]">
                        {entry.model}
                      </td>
                      <td className="p-3 text-right text-neutral-400 text-xs font-mono">
                        {formatTokens(entry.totalTokens)}
                      </td>
                      <td className="p-3 text-right text-white text-xs font-mono">
                        {formatCents(entry.estimatedCostCents)}
                      </td>
                      <td className="p-3 text-right text-neutral-400 text-xs">
                        {(entry.duration / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats && stats.recentEntries.length === 0 && (
        <div className="bg-neutral-900 rounded-xl border border-white/5 text-center py-16">
          <span className="text-4xl block mb-3">💰</span>
          <h3 className="text-lg font-bold text-white mb-1">No AI Usage Recorded</h3>
          <p className="text-neutral-500 text-sm">AI costs will appear here as recipes and images are generated.</p>
        </div>
      )}
    </div>
  );
}

function PeriodCard({
  label,
  costCents,
  calls,
  color,
}: {
  label: string;
  costCents: number;
  calls: number;
  color: 'emerald' | 'blue' | 'purple';
}) {
  const colorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-xl p-5">
      <p className="text-neutral-500 text-xs uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono ${colorClasses[color]}`}>
        {formatCents(costCents)}
      </p>
      <p className="text-neutral-500 text-sm mt-1">{calls} API calls</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-900 border border-white/5 rounded-xl p-4 text-center">
      <p className="text-neutral-500 text-xs mb-1">{label}</p>
      <p className="text-white font-bold font-mono">{value}</p>
    </div>
  );
}
