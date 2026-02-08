import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSubstitutions, getSubstitutionsByDiet, type Substitution } from '@/lib/substitutions';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cart/substitutions?ingredient=smântână
 * GET /api/cart/substitutions?ingredient=smântână&diet=vegan
 *
 * Returns substitution suggestions with available products.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ingredient = searchParams.get('ingredient');
    const diet = searchParams.get('diet') as 'vegan' | 'gluten-free' | 'dairy-free' | 'low-carb' | null;

    if (!ingredient) {
      return NextResponse.json(
        { success: false, error: 'Missing "ingredient" query parameter' },
        { status: 400 }
      );
    }

    // Get substitution suggestions
    let substitutions: Substitution[];

    if (diet) {
      // Filter substitutions by dietary preference
      const dietSubs = getSubstitutionsByDiet(diet);
      const ingredientSubs = getSubstitutions(ingredient);
      // Intersect: subs for this ingredient that also match the diet
      const dietSubNames = new Set(dietSubs.map(s => s.substitute));
      substitutions = ingredientSubs.filter(s => dietSubNames.has(s.substitute));
      // If no intersection, return all diet-matching subs for this ingredient
      if (substitutions.length === 0) {
        substitutions = ingredientSubs.filter(s => s.dietaryBenefit);
      }
    } else {
      substitutions = getSubstitutions(ingredient);
    }

    if (substitutions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          ingredient,
          substitutions: [],
          message: 'Nu am găsit substituenți pentru acest ingredient',
        },
      });
    }

    // For each substitution, try to find available products
    const now = new Date();
    const enrichedSubs = await Promise.all(
      substitutions.map(async (sub) => {
        // Search for products matching the substitute name
        const products = await prisma.product.findMany({
          where: {
            validFrom: { lte: now },
            validUntil: { gte: now },
            name: { contains: sub.substitute.split(' ')[0] },
          },
          orderBy: [
            { discountPercentage: 'desc' },
            { price: 'asc' },
          ],
          take: 3,
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            discountPercentage: true,
            store: true,
            unit: true,
            sourceUrl: true,
          },
        });

        return {
          ...sub,
          availableProducts: products.map(p => ({
            ...p,
            price: Number(p.price),
            originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
            discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ingredient,
        substitutions: enrichedSubs,
      },
    });
  } catch (error) {
    logger.error('Substitutions error', { error }, 'CartSubstitutionsAPI');
    return NextResponse.json(
      { success: false, error: 'Failed to get substitutions' },
      { status: 500 }
    );
  }
}
