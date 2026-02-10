'use client';

import { useState, useEffect } from 'react';
import type { PriceTrend } from '@/types';

interface PriceHistoryEntry {
  price: number;
  validFrom: string;
  validUntil: string;
  recordedAt: string;
}

interface PriceHistoryData {
  normalizedName: string;
  store: string;
  currentPrice: number;
  trend: PriceTrend;
  history: PriceHistoryEntry[];
}

interface PriceHistoryChartProps {
  productId: string;
}

export default function PriceHistoryChart({ productId }: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/products/${productId}/price-history`);
        if (!res.ok) throw new Error('Eroare la incarcarea istoricului');
        const json = await res.json();
        if (!cancelled && json.success) {
          setData(json.data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }

  if (error || !data || data.history.length < 2) {
    return null; // Don't render if insufficient data
  }

  const prices = data.history.map((h) => h.price);
  const minPrice = Math.min(...prices, data.currentPrice);
  const maxPrice = Math.max(...prices, data.currentPrice);
  const range = maxPrice - minPrice || 1;

  // Build SVG sparkline points including current price
  const allPrices = [...prices, data.currentPrice];
  const width = 120;
  const height = 40;
  const padding = 2;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const points = allPrices.map((p, i) => {
    const x = padding + (i / (allPrices.length - 1)) * usableW;
    const y = padding + usableH - ((p - minPrice) / range) * usableH;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Color based on trend direction
  const isDown = data.currentPrice <= data.trend.avgPrice;
  const strokeColor = isDown ? '#16a34a' : '#dc2626';
  const fillColor = isDown ? '#dcfce7' : '#fee2e2';

  // Fill area under the line
  const areaPoints = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

  return (
    <div className="space-y-2">
      {/* Sparkline */}
      <div className="flex items-center gap-3">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="flex-shrink-0"
        >
          <polygon
            points={areaPoints}
            fill={fillColor}
            opacity="0.5"
          />
          <polyline
            points={polyline}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Current price dot */}
          {(() => {
            const lastX = padding + usableW;
            const lastY = padding + usableH - ((data.currentPrice - minPrice) / range) * usableH;
            return (
              <circle cx={lastX} cy={lastY} r="2.5" fill={strokeColor} />
            );
          })()}
        </svg>

        <div className="text-xs text-gray-500">
          {data.history.length} observatii
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-600">
        <span>
          Media: <strong className="text-gray-900">{data.trend.avgPrice.toFixed(2)} lei</strong>
        </span>
        <span>
          Min: <strong className="text-green-700">{data.trend.minPrice.toFixed(2)} lei</strong>
        </span>
        <span>
          Max: <strong className="text-red-700">{data.trend.maxPrice.toFixed(2)} lei</strong>
        </span>
      </div>
    </div>
  );
}
