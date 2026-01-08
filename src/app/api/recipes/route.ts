import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateSlug } from '@/lib/utils';
import { calculateDietaryFlags } from '@/lib/dietary';
import type { Recipe, RecipeFilters, PaginatedResponse, ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/recipes - Get recipes with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '12', 10), 50);
    const difficulty = searchParams.get('difficulty');
    const maxCost = searchParams.get('maxCost');
    const maxTime = searchParams.get('maxTime');
    const tags = searchParams.get('tags');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Dietary Filters
    const isGlutenFree = searchParams.get('isGlutenFree') === 'true';
    const isDairyFree = searchParams.get('isDairyFree') === 'true';
    const isVegan = searchParams.get('isVegan') === 'true';
    const isVegetarian = searchParams.get('isVegetarian') === 'true';

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (difficulty) {
      where.difficulty = {
        in: difficulty.split(',') as ('USOR' | 'MEDIU' | 'DIFICIL')[],
      };
    }

    if (maxCost) {
      where.estimatedCost = { lte: parseFloat(maxCost) };
    }

    if (maxTime) {
      where.totalTime = { lte: parseInt(maxTime, 10) };
    }

    if (tags) {
      where.tags = { hasSome: tags.split(',') };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Strict Dietary Filtering
    if (isGlutenFree) where.isGlutenFree = true;
    if (isDairyFree) where.isDairyFree = true;
    if (isVegan) where.isVegan = true;
    if (isVegetarian) where.isVegetarian = true;

    // Build orderBy
    const orderBy: any = {};
    switch (sortBy) {
      case 'cost':
        orderBy.estimatedCost = sortOrder;
        break;
      case 'time':
        orderBy.totalTime = sortOrder;
        break;
      case 'calories':
        orderBy.calories = sortOrder;
        break;
      case 'created':
      default:
        orderBy.createdAt = sortOrder;
    }

    // Fetch data directly (cache removed for production)
    const [recipesRaw, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.recipe.count({ where }),
    ]);

    // Extract all ingredient IDs to fetch store info
    const allIngredientIds = new Set<string>();
    recipesRaw.forEach((r: any) => {
      const ids = typeof r.ingredientIds === 'string' ? JSON.parse(r.ingredientIds) : r.ingredientIds;
      if (Array.isArray(ids)) {
        ids.forEach((id: string) => allIngredientIds.add(id));
      }
    });

    // Fetch products to get stores
    const products = await prisma.product.findMany({
      where: {
        id: { in: Array.from(allIngredientIds) }
      },
      select: {
        id: true,
        store: true
      }
    });

    // Map product ID to store
    const productStores = new Map(products.map(p => [p.id, p.store]));

    const recipes = recipesRaw.map((r: any) => {
      const ids = typeof r.ingredientIds === 'string' ? JSON.parse(r.ingredientIds) : r.ingredientIds;
      const stores = new Set<string>();

      if (Array.isArray(ids)) {
        ids.forEach((id: string) => {
          const store = productStores.get(id);
          if (store) {
            // Normalize store name to slug (e.g. "Mega Image" -> "mega-image", "Lidl" -> "lidl")
            const slug = store.toLowerCase().trim().replace(/\s+/g, '-');
            stores.add(slug);
          }
        });
      }

      return {
        ...r,
        difficulty: r.difficulty as 'USOR' | 'MEDIU' | 'DIFICIL',
        estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
        instructions: typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions,
        tips: r.tips ? (typeof r.tips === 'string' ? JSON.parse(r.tips) : r.tips) : null,
        tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
        ingredientIds: ids,
        availableStores: Array.from(stores), // Add available stores
        nutritionPerServing: r.nutritionPerServing ? (typeof r.nutritionPerServing === 'string' ? JSON.parse(r.nutritionPerServing) : r.nutritionPerServing) : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        // Dietary Flags
        isGlutenFree: r.isGlutenFree,
        isDairyFree: r.isDairyFree,
        isVegan: r.isVegan,
        isVegetarian: r.isVegetarian
      };
    }) as unknown as Recipe[];

    const result = {
      recipes,
      total,
    };

    const response: ApiResponse<PaginatedResponse<Recipe>> = {
      success: true,
      data: {
        data: result.recipes,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch recipes',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/recipes - Create a new recipe (for internal use)
export async function POST(request: NextRequest) {
  try {
    // Check for API key authorization
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.INTERNAL_API_KEY;

    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description', 'servings', 'difficulty', 'instructions'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate slug if not provided
    const slug = body.slug || generateSlug(body.title);

    // Check if slug exists
    const existingRecipe = await prisma.recipe.findUnique({
      where: { slug },
    });

    if (existingRecipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe with this slug already exists' },
        { status: 400 }
      );
    }

    // Calculate total time
    const totalTime = (body.prepTime || 0) + (body.cookTime || 0);

    const recipe = await prisma.recipe.create({
      data: {
        title: body.title,
        description: body.description,
        servings: body.servings,
        prepTime: body.prepTime,
        cookTime: body.cookTime,
        totalTime: body.totalTime || totalTime,
        difficulty: body.difficulty,
        instructions: body.instructions,
        tips: body.tips,
        ingredientIds: body.ingredientIds || '[]',
        estimatedCost: body.estimatedCost,
        calories: body.calories,
        nutritionPerServing: body.nutritionPerServing,
        slug,
        metaDescription: body.metaDescription || body.description.substring(0, 160),
        tags: body.tags,
        // Automatic Dietary Classification if not provided
        ...(body.isVegan !== undefined ? {
          isGlutenFree: body.isGlutenFree,
          isDairyFree: body.isDairyFree,
          isVegan: body.isVegan,
          isVegetarian: body.isVegetarian
        } : calculateDietaryFlags(body.title + ' ' + body.description + ' ' + JSON.stringify(body.tags || []) + ' ' + JSON.stringify(body.instructions))),
      },
    });

    // Cache removed for production

    const response: ApiResponse<Recipe> = {
      success: true,
      data: {
        ...recipe,
        estimatedCost: recipe.estimatedCost ? Number(recipe.estimatedCost) : null,
        instructions: recipe.instructions as Recipe['instructions'],
        tips: recipe.tips as string[] | null,
        tags: recipe.tags as string[] | null,
        nutritionPerServing: recipe.nutritionPerServing as Recipe['nutritionPerServing'],
      },
      message: 'Recipe created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
