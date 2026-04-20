/**
 * Cron: refresh the Price Index.
 *
 * Invoked hourly by Vercel Cron. Invalidates the cached standard-basket
 * computation and warms it so the next user request is instant.
 * Also runs a staleness check against active catalog products and logs a
 * warning when the freshest product is older than STALE_HOURS.
 *
 * Auth: Vercel Cron adds an `Authorization: Bearer $CRON_SECRET` header
 * automatically when CRON_SECRET is set in project env vars.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { getPriceIndex } from '@/lib/price-index';

const STALE_HOURS = 36;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev / no secret configured → allow
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    await cache.del('price-index:standard-basket');

    const now = new Date();
    const freshest = await prisma.product.findFirst({
      where: { validFrom: { lte: now }, validUntil: { gte: now } },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const activeCount = await prisma.product.count({
      where: { validFrom: { lte: now }, validUntil: { gte: now } },
    });

    const hoursSinceUpdate = freshest
      ? (now.getTime() - new Date(freshest.updatedAt).getTime()) / 3_600_000
      : null;

    const stale = hoursSinceUpdate === null || hoursSinceUpdate > STALE_HOURS;
    if (stale) {
      logger.warn('Price Index data is stale', {
        hoursSinceUpdate,
        activeCount,
        threshold: STALE_HOURS,
      }, 'PriceIndexCron');
    }

    const index = await getPriceIndex();

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startedAt,
      stale,
      hoursSinceUpdate,
      activeProducts: activeCount,
      stores: index.stores.length,
      cheapest: index.cheapest?.store ?? null,
      cheapestTotal: index.cheapest?.total ?? null,
      generatedAt: index.generatedAt,
    });
  } catch (error) {
    logger.error('Price Index cron failed', { error }, 'PriceIndexCron');
    return NextResponse.json(
      { success: false, error: 'refresh failed' },
      { status: 500 }
    );
  }
}
