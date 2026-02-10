import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { normalizeProductName } from '@/lib/search/dedup';
import { getPriceHistory, getPriceTrend } from '@/lib/price-history';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID produs invalid' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        store: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produs negasit' },
        { status: 404 }
      );
    }

    const normalizedName = normalizeProductName(product.name, product.brand);
    if (!normalizedName) {
      return NextResponse.json(
        { success: false, error: 'Nu se poate normaliza numele produsului' },
        { status: 400 }
      );
    }

    const currentPrice = Number(product.price);

    const [history, trend] = await Promise.all([
      getPriceHistory(normalizedName, product.store),
      getPriceTrend(normalizedName, product.store, currentPrice),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          normalizedName,
          store: product.store,
          currentPrice,
          trend,
          history: history.map((h) => ({
            price: Number(h.price),
            validFrom: h.validFrom,
            validUntil: h.validUntil,
            recordedAt: h.recordedAt,
          })),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: any) {
    logger.error('[API] Price history error', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Eroare la obtinerea istoricului de preturi' },
      { status: 500 }
    );
  }
}
