import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/recipes - Paginated recipe list with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const published = searchParams.get('published');
    const dietary = searchParams.get('dietary') || '';

    const where: Record<string, unknown> = {};

    if (search) {
      where.title = { contains: search };
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (published === 'true') {
      where.isPublished = true;
    } else if (published === 'false') {
      where.isPublished = false;
    }
    if (dietary) {
      const flags: Record<string, boolean> = {};
      if (dietary.includes('vegan')) flags.isVegan = true;
      if (dietary.includes('vegetarian')) flags.isVegetarian = true;
      if (dietary.includes('gluten-free')) flags.isGlutenFree = true;
      if (dietary.includes('dairy-free')) flags.isDairyFree = true;
      Object.assign(where, flags);
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          difficulty: true,
          totalTime: true,
          estimatedCost: true,
          viewCount: true,
          isPublished: true,
          isFeatured: true,
          isVegan: true,
          isVegetarian: true,
          isGlutenFree: true,
          isDairyFree: true,
          createdAt: true,
        },
      }),
      prisma.recipe.count({ where }),
    ]);

    return NextResponse.json({
      recipes: recipes.map(r => ({
        ...r,
        estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}
