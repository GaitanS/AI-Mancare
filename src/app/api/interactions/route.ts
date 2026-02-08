/**
 * User Interaction Tracking API
 * POST /api/interactions - Track user interactions (views, cart adds, etc.)
 *
 * Used for personalized recommendations (collaborative filtering).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, recipeId, productId, type, metadata } = body;

    if (!sessionId || !type) {
      return NextResponse.json(
        { success: false, error: 'sessionId and type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['view', 'cart_add', 'cook', 'search', 'plan_add', 'favorite'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Deduplicate: don't record same view twice within 5 minutes
    if (type === 'view' && (recipeId || productId)) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await prisma.userInteraction.findFirst({
        where: {
          sessionId,
          type: 'view',
          ...(recipeId ? { recipeId } : {}),
          ...(productId ? { productId } : {}),
          createdAt: { gte: fiveMinAgo },
        },
      });

      if (existing) {
        return NextResponse.json({ success: true, data: { deduplicated: true } });
      }
    }

    const interaction = await prisma.userInteraction.create({
      data: {
        sessionId,
        recipeId: recipeId || null,
        productId: productId || null,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: interaction.id },
    });
  } catch (error) {
    logger.error('Interaction tracking error', { error }, 'InteractionsAPI');
    return NextResponse.json(
      { success: false, error: 'Failed to track interaction' },
      { status: 500 }
    );
  }
}
