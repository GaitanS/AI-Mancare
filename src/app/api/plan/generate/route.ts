/**
 * Weekly Menu Planner API
 * POST /api/plan/generate
 *
 * Uses DB-based meal planner (no external AI calls).
 * Selects published recipes respecting budget, dietary, and variety constraints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateMealPlan } from '@/lib/ai/meal-planner';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

const MenuPlanSchema = z.object({
  budget: z.number().positive().default(200),
  servings: z.number().int().min(1).max(12).default(4),
  daysCount: z.number().int().min(1).max(7).default(7),
  mealsPerDay: z.number().int().min(1).max(4).default(3),
  dietary: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free', 'dairy-free'])).optional(),
  preferredStores: z.array(z.string()).optional(),
  excludeIngredients: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = await request.json();
    const options = MenuPlanSchema.parse(body);

    const result = await generateMealPlan({
      budget: options.budget,
      servings: options.servings,
      daysCount: options.daysCount,
      mealsPerDay: options.mealsPerDay,
      dietary: options.dietary,
      preferredStores: options.preferredStores,
      excludeIngredients: options.excludeIngredients,
    });

    const duration = Date.now() - start;
    logger.apiRequest(request, duration, 200);

    return NextResponse.json({
      success: true,
      data: result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - start;
    logger.apiRequest(request, duration, 500);
    return handleApiError(error);
  }
}
