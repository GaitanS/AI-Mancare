'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  period: string;
  totalSessions: number;
  totalInteractions: number;
  interactionsByType: {
    view: number;
    cart_add: number;
    cook: number;
    search: number;
  };
  topRecipes: Array<{
    rank: number;
    recipeId: string | null;
    title: string;
    slug: string;
    count: number;
  }>;
  topProducts: Array<{
    rank: number;
    productId: string | null;
    name: string;
    store: string;
    count: number;
  }>;
  topSearches: Array<{
    rank: number;
    term: string;
    count: number;
  }>;
  dailyActivity: Array<{
    date: string;
    count: number;
  }>;
}

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

const TYPE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  view: { bar: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/10' },
  cart_add: { bar: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  cook: { bar: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/10' },
  search: { bar: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/10' },
};

const TYPE_LABELS: Record<string, string> = {
  view: 'Views',
  cart_add: 'Cart Adds',
  cook: 'Cooked',
  search: 'Searches',
};

const TYPE_ICONS: Record<string, string> = {
  view: '👁️',
  cart_add: '🛒',
  cook: '👨‍🍳',
  search: '🔍',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Analytics
          </h1>
          <p className="text-xs lg:text-sm text-neutral-500 mt-1">
            User interactions and engagement metrics
          </p>
        </div>
        {data && !loading && (
          <p className="text-xs text-neutral-600">
            Auto-refreshes every 30s
          </p>
        )}
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 bg-neutral-900 border border-white/5 rounded-xl p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
              period === p
                ? 'bg-white/10 text-white'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <AnalyticsSkeleton />
      ) : data ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            <StatCard
              title="Sessions"
              value={data.totalSessions}
              icon="👤"
              color="blue"
            />
            <StatCard
              title="Interactions"
              value={data.totalInteractions}
              icon="📊"
              color="emerald"
            />
            <StatCard
              title="Cart Adds"
              value={data.interactionsByType.cart_add}
              icon="🛒"
              color="orange"
            />
            <StatCard
              title="Searches"
              value={data.interactionsByType.search}
              icon="🔍"
              color="purple"
            />
          </div>

          {/* Interaction Breakdown */}
          <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-lg lg:text-xl">📊</span>
              Interaction Breakdown
            </h2>
            <InteractionBreakdown types={data.interactionsByType} total={data.totalInteractions} />
          </div>

          {/* Daily Activity Chart */}
          {data.dailyActivity.length > 0 && (
            <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-lg lg:text-xl">📅</span>
                Daily Activity
              </h2>
              <DailyActivityChart data={data.dailyActivity} />
            </div>
          )}

          {/* Two-Column: Top Recipes & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
            {/* Top Recipes */}
            <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-lg lg:text-xl">🍳</span>
                Top Recipes
              </h2>
              {data.topRecipes.length > 0 ? (
                <TopRecipesTable recipes={data.topRecipes} />
              ) : (
                <EmptyState message="No recipe views yet" />
              )}
            </div>

            {/* Top Products */}
            <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-lg lg:text-xl">📦</span>
                Top Products (Cart Adds)
              </h2>
              {data.topProducts.length > 0 ? (
                <TopProductsTable products={data.topProducts} />
              ) : (
                <EmptyState message="No cart additions yet" />
              )}
            </div>
          </div>

          {/* Top Searches */}
          <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-lg lg:text-xl">🔍</span>
              Top Searches
            </h2>
            {data.topSearches.length > 0 ? (
              <TopSearchesList searches={data.topSearches} />
            ) : (
              <EmptyState message="No searches recorded yet" />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: 'emerald' | 'orange' | 'blue' | 'purple';
}) {
  const colorClasses = {
    emerald: 'text-emerald-400',
    orange: 'text-orange-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-neutral-900 border border-white/5 p-3 lg:p-5 rounded-lg lg:rounded-xl flex items-center gap-2 lg:gap-4">
      <div className="text-2xl lg:text-3xl">{icon}</div>
      <div className="min-w-0">
        <p className="text-neutral-500 text-[10px] lg:text-xs uppercase font-bold tracking-wider truncate">
          {title}
        </p>
        <p className={`text-lg lg:text-2xl font-bold font-mono ${colorClasses[color]}`}>
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Interaction Breakdown
// ──────────────────────────────────────────────

function InteractionBreakdown({
  types,
  total,
}: {
  types: Record<string, number>;
  total: number;
}) {
  const entries = Object.entries(types).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {entries.map(([type, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        const colors = TYPE_COLORS[type] || TYPE_COLORS.view;
        return (
          <div key={type} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{TYPE_ICONS[type] || '?'}</span>
                <span className="text-sm font-medium text-neutral-300">
                  {TYPE_LABELS[type] || type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold font-mono ${colors.text}`}>
                  {count.toLocaleString()}
                </span>
                <span className="text-xs text-neutral-600 w-12 text-right">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                style={{ width: `${Math.max(pct, 0.5)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Daily Activity Chart
// ──────────────────────────────────────────────

function DailyActivityChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map((day) => {
        const pct = (day.count / maxCount) * 100;
        const dateStr = formatShortDate(day.date);
        return (
          <div key={day.date} className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 w-16 shrink-0 text-right font-mono">
              {dateStr}
            </span>
            <div className="flex-1 h-6 bg-neutral-800 rounded-md overflow-hidden relative">
              <div
                className="h-full bg-blue-500/30 rounded-md transition-all duration-500"
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-xs font-mono text-blue-300">
                {day.count > 0 ? day.count.toLocaleString() : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Top Recipes Table
// ──────────────────────────────────────────────

function TopRecipesTable({
  recipes,
}: {
  recipes: Array<{
    rank: number;
    title: string;
    slug: string;
    count: number;
  }>;
}) {
  const maxCount = Math.max(...recipes.map((r) => r.count), 1);

  return (
    <div className="space-y-2">
      {recipes.map((recipe) => {
        const pct = (recipe.count / maxCount) * 100;
        return (
          <div
            key={recipe.rank}
            className="flex items-center gap-3 p-2 lg:p-3 bg-neutral-800/50 rounded-lg lg:rounded-xl group hover:bg-neutral-800 transition-colors"
          >
            <span className="text-xs font-bold text-neutral-600 w-5 text-center shrink-0">
              {recipe.rank}
            </span>
            <div className="flex-1 min-w-0">
              {recipe.slug ? (
                <Link
                  href={`/retete/${recipe.slug}`}
                  target="_blank"
                  className="text-sm font-medium text-white truncate block hover:text-blue-400 transition-colors"
                >
                  {recipe.title}
                </Link>
              ) : (
                <span className="text-sm font-medium text-neutral-400 truncate block">
                  {recipe.title}
                </span>
              )}
              <div className="mt-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400/60 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-bold font-mono text-blue-400 shrink-0">
              {recipe.count.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Top Products Table
// ──────────────────────────────────────────────

function TopProductsTable({
  products,
}: {
  products: Array<{
    rank: number;
    name: string;
    store: string;
    count: number;
  }>;
}) {
  const storeColors: Record<string, string> = {
    kaufland: 'bg-red-500/10 text-red-400 border-red-500/20',
    lidl: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    penny: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    profi: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    mega: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    carrefour: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    auchan: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="space-y-2">
      {products.map((product) => {
        const storeLower = product.store.toLowerCase();
        const storeBadge =
          storeColors[storeLower] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
        return (
          <div
            key={product.rank}
            className="flex items-center gap-3 p-2 lg:p-3 bg-neutral-800/50 rounded-lg lg:rounded-xl"
          >
            <span className="text-xs font-bold text-neutral-600 w-5 text-center shrink-0">
              {product.rank}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white truncate block">
                {product.name}
              </span>
              {product.store && (
                <span
                  className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${storeBadge}`}
                >
                  {product.store}
                </span>
              )}
            </div>
            <span className="text-sm font-bold font-mono text-emerald-400 shrink-0">
              {product.count.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Top Searches List
// ──────────────────────────────────────────────

function TopSearchesList({
  searches,
}: {
  searches: Array<{
    rank: number;
    term: string;
    count: number;
  }>;
}) {
  const maxCount = Math.max(...searches.map((s) => s.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {searches.map((search) => {
        const pct = (search.count / maxCount) * 100;
        return (
          <div
            key={search.rank}
            className="flex items-center gap-3 p-2 lg:p-3 bg-neutral-800/50 rounded-lg lg:rounded-xl"
          >
            <span className="text-xs font-bold text-neutral-600 w-5 text-center shrink-0">
              {search.rank}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white truncate block">
                &ldquo;{search.term}&rdquo;
              </span>
              <div className="mt-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400/60 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-bold font-mono text-purple-400 shrink-0">
              {search.count.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Empty State
// ──────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-6 lg:py-8 text-neutral-500">
      <p className="text-sm lg:text-base">{message}</p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 animate-pulse">
      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-neutral-900 border border-white/5 p-3 lg:p-5 rounded-lg lg:rounded-xl"
          >
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-neutral-800" />
              <div className="flex-1">
                <div className="h-3 w-16 bg-neutral-800 rounded mb-2" />
                <div className="h-6 w-20 bg-neutral-800 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown Skeleton */}
      <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
        <div className="h-5 w-48 bg-neutral-800 rounded mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <div className="h-4 w-20 bg-neutral-800 rounded" />
                <div className="h-4 w-12 bg-neutral-800 rounded" />
              </div>
              <div className="h-2 bg-neutral-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart Skeleton */}
      <div className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6">
        <div className="h-5 w-36 bg-neutral-800 rounded mb-4" />
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-16 bg-neutral-800 rounded" />
              <div className="flex-1 h-6 bg-neutral-800 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Two-column Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5 p-4 lg:p-6"
          >
            <div className="h-5 w-32 bg-neutral-800 rounded mb-4" />
            <div className="space-y-2">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-14 bg-neutral-800/50 rounded-lg lg:rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}
