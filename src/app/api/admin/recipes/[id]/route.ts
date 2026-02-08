import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit, computeChanges } from '@/lib/audit-logger';

// GET /api/admin/recipes/[id] - Full recipe with all fields
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({ where: { id } });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json({
      recipe: {
        ...recipe,
        estimatedCost: recipe.estimatedCost ? Number(recipe.estimatedCost) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

// PUT /api/admin/recipes/[id] - Update recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const fields = [
      'title', 'description', 'imageUrl', 'prepTime', 'cookTime', 'totalTime',
      'servings', 'difficulty', 'cuisine', 'instructions', 'tips',
      'ingredientIds', 'estimatedCost', 'metaDescription', 'tags',
      'nutritionPerServing', 'calories', 'isPublished', 'isFeatured',
      'isGlutenFree', 'isDairyFree', 'isVegan', 'isVegetarian',
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Ensure JSON fields are strings
    for (const jsonField of ['instructions', 'tips', 'ingredientIds', 'tags', 'nutritionPerServing']) {
      if (updateData[jsonField] && typeof updateData[jsonField] !== 'string') {
        updateData[jsonField] = JSON.stringify(updateData[jsonField]);
      }
    }

    // Handle cost as number
    if (updateData.estimatedCost !== undefined) {
      updateData.estimatedCost = updateData.estimatedCost ? Number(updateData.estimatedCost) : null;
    }

    // Auto-calculate totalTime
    if (updateData.prepTime !== undefined || updateData.cookTime !== undefined) {
      const prep = (updateData.prepTime ?? existing.prepTime ?? 0) as number;
      const cook = (updateData.cookTime ?? existing.cookTime ?? 0) as number;
      updateData.totalTime = prep + cook;
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: updateData,
    });

    const changes = computeChanges(
      existing as unknown as Record<string, unknown>,
      body,
      fields
    );

    await logAudit({
      action: 'UPDATE',
      entity: 'recipe',
      entityId: id,
      changes: changes || undefined,
      details: `Updated recipe: ${recipe.title}`,
      request,
    });

    return NextResponse.json({
      success: true,
      recipe: {
        ...recipe,
        estimatedCost: recipe.estimatedCost ? Number(recipe.estimatedCost) : null,
      },
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

// DELETE /api/admin/recipes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    await prisma.recipe.delete({ where: { id } });

    await logAudit({
      action: 'DELETE',
      entity: 'recipe',
      entityId: id,
      details: `Deleted recipe: ${existing.title}`,
      request,
    });

    return NextResponse.json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
