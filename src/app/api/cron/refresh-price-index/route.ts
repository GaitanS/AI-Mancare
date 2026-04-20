/**
 * Cron: refresh the Price Index.
 *
 * Invoked hourly by Vercel Cron. Invalidates the cached standard-basket
 * computation and warms it so the next user request is instant.
 * Also runs a staleness check against active catalog products and logs a
 * warning when the freshest product is older than STALE_HOURS.
 *
 * Auth (checked in order):
 *   1. `x-vercel-cron: 1` header — set by Vercel's cron runner.
 *   2. `Authorization: Bearer $CRON_SECRET` — for manual / external triggers.
 *
 * In production, CRON_SECRET MUST be set — otherwise all non-Vercel-cron
 * calls are rejected. In development, missing secret allows any call.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { getPriceIndex, STALE_HOURS_THRESHOLD } from '@/lib/price-index';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const CACHE_KEY = 'price-index:standard-basket';

function isAuthorized(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  // Vercel Cron sets this header on every scheduled invocation.
  if (req.headers.get('x-vercel-cron') === '1') return { ok: true };

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'CRON_SECRET not configured' };
    }
    return { ok: true }; // dev convenience
  }

  const header = req.headers.get('authorization');
  if (header === `Bearer ${secret}`) return { ok: true };
  return { ok: false, reason: 'bad token' };
}

async function runRefresh() {
  const startedAt = Date.now();
  const now = new Date();

  await cache.del(CACHE_KEY);

  const activeCount = await prisma.product.count({
    where: { validFrom: { lte: now }, validUntil: { gte: now } },
  });

  const index = await getPriceIndex();

  if (index.stale) {
    logger.warn(
      'Price Index data is stale',
      {
        hoursSinceUpdate: index.hoursSinceUpdate,
        activeCount,
        threshold: STALE_HOURS_THRESHOLD,
      },
      'PriceIndexCron'
    );
  }

  return {
    success: true as const,
    durationMs: Date.now() - startedAt,
    stale: index.stale,
    hoursSinceUpdate: index.hoursSinceUpdate,
    activeProducts: activeCount,
    stores: index.stores.length,
    cheapest: index.cheapest?.store ?? null,
    cheapestTotal: index.cheapest?.total ?? null,
    generatedAt: index.generatedAt,
  };
}

export async function GET(req: NextRequest) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 });
  }

  try {
    const result = await runRefresh();
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Price Index cron failed', { error }, 'PriceIndexCron');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'refresh failed' },
      { status: 500 }
    );
  }
}

// HEAD for external uptime checks (no body, no auth needed).
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
