'use client';

import type { PriceTrend } from '@/types';

interface PriceTrendBadgeProps {
  trend: PriceTrend;
  compact?: boolean;
}

const BADGE_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  best_price: { bg: '#dcfce7', text: '#15803d', icon: '\u2193' },   // green, down arrow
  below_avg:  { bg: '#dbeafe', text: '#1d4ed8', icon: '\u2193' },   // blue, down arrow
  price_increased: { bg: '#fee2e2', text: '#dc2626', icon: '\u2191' }, // red, up arrow
  above_avg:  { bg: '#fef3c7', text: '#d97706', icon: '\u2191' },   // amber, up arrow
};

export default function PriceTrendBadge({ trend, compact = false }: PriceTrendBadgeProps) {
  if (!trend.badge || !trend.label) return null;

  const config = BADGE_CONFIG[trend.badge];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium ${
        compact ? 'text-[10px] px-1.5 py-0.5 rounded' : 'text-xs px-2 py-0.5 rounded-md'
      }`}
      style={{ backgroundColor: config.bg, color: config.text }}
      title={`Media: ${trend.avgPrice.toFixed(2)} lei | Min: ${trend.minPrice.toFixed(2)} lei | Max: ${trend.maxPrice.toFixed(2)} lei (${trend.dataPoints} observatii)`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {trend.label}
    </span>
  );
}
