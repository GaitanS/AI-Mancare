/**
 * DB-Based Meal Plan Generator
 * Algorithmic planner that selects published recipes from the database,
 * respecting budget, dietary restrictions, and cuisine variety.
 * No AI API calls needed - purely database-driven.
 */

import prisma from '@/lib/db';
import type { Recipe } from '@prisma/client';

export interface MealPlanOptions {
  budget: number;       // Weekly budget in RON
  servings: number;     // People per meal
  daysCount: number;    // 1-7
  mealsPerDay: number;  // 1-4 (breakfast, lunch, dinner, snack)
  dietary?: ('vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free')[];
  preferredStores?: string[];
  excludeIngredients?: string[];
}

export interface PlannedMeal {
  type: string;
  recipe: {
    id: string;
    title: string;
    slug: string;
    description: string;
    imageUrl: string | null;
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    difficulty: string;
    servings: number;
    estimatedCost: number | null;
    cuisine: string | null;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
  } | null;
  cost: number;
}

export interface PlannedDay {
  day: string;
  meals: PlannedMeal[];
  totalCost: number;
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

export interface MealPlanResult {
  menu: PlannedDay[];
  summary: {
    totalCost: number;
    budgetRemaining: number;
    daysPlanned: number;
    mealsPlanned: number;
    averageCostPerDay: number;
    averageCostPerMeal: number;
  };
  shoppingList: ShoppingItem[];
}

const DAY_NAMES = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

const MEAL_TYPE_MAP: Record<string, { difficulties: string[]; maxTime: number; cuisines?: string[] }> = {
  breakfast: { difficulties: ['ușor', 'mediu'], maxTime: 30 },
  lunch:     { difficulties: ['ușor', 'mediu', 'dificil'], maxTime: 90 },
  dinner:    { difficulties: ['ușor', 'mediu', 'dificil'], maxTime: 120 },
  snack:     { difficulties: ['ușor'], maxTime: 20 },
};

/**
 * Generate a weekly meal plan from published recipes in the database.
 * Uses greedy selection with variety constraints.
 */
export async function generateMealPlan(options: MealPlanOptions): Promise<MealPlanResult> {
  const {
    budget,
    servings,
    daysCount,
    mealsPerDay,
    dietary = [],
    excludeIngredients = [],
  } = options;

  const budgetPerMeal = budget / (daysCount * mealsPerDay);
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'].slice(0, mealsPerDay);

  // Build dietary filter
  const dietaryWhere: Record<string, boolean> = {};
  for (const d of dietary) {
    if (d === 'vegetarian') dietaryWhere.isVegetarian = true;
    if (d === 'vegan') dietaryWhere.isVegan = true;
    if (d === 'gluten-free') dietaryWhere.isGlutenFree = true;
    if (d === 'dairy-free') dietaryWhere.isDairyFree = true;
  }

  // Fetch all candidate recipes (published, matching dietary)
  const candidates = await prisma.recipe.findMany({
    where: {
      isPublished: true,
      ...dietaryWhere,
    },
    orderBy: [
      { viewCount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 200,
  });

  if (candidates.length === 0) {
    // Fallback: get any published recipes ignoring dietary
    const fallback = await prisma.recipe.findMany({
      where: { isPublished: true },
      orderBy: { viewCount: 'desc' },
      take: 100,
    });
    candidates.push(...fallback);
  }

  // Parse ingredient lists for filtering
  const candidatesWithIngredients = candidates.map(r => ({
    recipe: r,
    ingredients: parseIngredients(r.ingredientIds),
    cost: r.estimatedCost ? Number(r.estimatedCost) : budgetPerMeal * 0.8,
    time: r.totalTime || (r.prepTime || 0) + (r.cookTime || 0) || 30,
  }));

  // Filter out recipes with excluded ingredients
  const excludeSet = new Set(excludeIngredients.map(i => i.toLowerCase()));
  const filtered = excludeSet.size > 0
    ? candidatesWithIngredients.filter(c =>
        !c.ingredients.some(ing => excludeSet.has(ing.name.toLowerCase()))
      )
    : candidatesWithIngredients;

  // Track used recipe IDs to avoid repeats
  const usedRecipeIds = new Set<string>();
  const usedCuisines: string[] = [];
  const weeklyMenu: PlannedDay[] = [];
  let totalWeekCost = 0;

  for (let day = 0; day < daysCount; day++) {
    const dayMenu: PlannedDay = {
      day: DAY_NAMES[day % 7],
      meals: [],
      totalCost: 0,
    };

    for (const mealType of mealTypes) {
      const meal = selectMealRecipe(
        filtered,
        mealType,
        budgetPerMeal * 1.5, // Allow some flexibility
        usedRecipeIds,
        usedCuisines,
        servings
      );

      if (meal) {
        usedRecipeIds.add(meal.recipe.id);
        if (meal.recipe.cuisine) usedCuisines.push(meal.recipe.cuisine);

        const scaledCost = scaleCost(meal.cost, meal.recipe.servings, servings);

        dayMenu.meals.push({
          type: mealType,
          recipe: {
            id: meal.recipe.id,
            title: meal.recipe.title,
            slug: meal.recipe.slug,
            description: meal.recipe.description,
            imageUrl: meal.recipe.imageUrl,
            prepTime: meal.recipe.prepTime,
            cookTime: meal.recipe.cookTime,
            totalTime: meal.recipe.totalTime,
            difficulty: meal.recipe.difficulty,
            servings: meal.recipe.servings,
            estimatedCost: scaledCost,
            cuisine: meal.recipe.cuisine,
            ingredients: meal.ingredients,
          },
          cost: scaledCost,
        });

        dayMenu.totalCost += scaledCost;
      } else {
        // No suitable recipe found
        dayMenu.meals.push({
          type: mealType,
          recipe: null,
          cost: 0,
        });
      }
    }

    weeklyMenu.push(dayMenu);
    totalWeekCost += dayMenu.totalCost;
  }

  // Generate consolidated shopping list
  const shoppingList = buildShoppingList(weeklyMenu, servings);

  const mealsPlanned = weeklyMenu.reduce(
    (sum, d) => sum + d.meals.filter(m => m.recipe).length, 0
  );

  return {
    menu: weeklyMenu,
    summary: {
      totalCost: round2(totalWeekCost),
      budgetRemaining: round2(budget - totalWeekCost),
      daysPlanned: daysCount,
      mealsPlanned,
      averageCostPerDay: round2(totalWeekCost / daysCount),
      averageCostPerMeal: mealsPlanned > 0 ? round2(totalWeekCost / mealsPlanned) : 0,
    },
    shoppingList,
  };
}

/**
 * Select the best recipe for a given meal slot, considering variety and budget.
 */
function selectMealRecipe(
  candidates: Array<{ recipe: Recipe; ingredients: Array<{ name: string; quantity: number; unit: string }>; cost: number; time: number }>,
  mealType: string,
  maxBudget: number,
  usedIds: Set<string>,
  usedCuisines: string[],
  servings: number,
): { recipe: Recipe; ingredients: Array<{ name: string; quantity: number; unit: string }>; cost: number } | null {
  const constraints = MEAL_TYPE_MAP[mealType] || MEAL_TYPE_MAP.lunch;

  // Score and filter candidates
  const scored = candidates
    .filter(c => {
      // Not already used
      if (usedIds.has(c.recipe.id)) return false;
      // Within budget (scaled to target servings)
      const scaledCost = scaleCost(c.cost, c.recipe.servings, servings);
      if (scaledCost > maxBudget) return false;
      // Within time constraints
      if (c.time > constraints.maxTime) return false;
      return true;
    })
    .map(c => {
      let score = 0;

      // Prefer recipes with higher viewCount (popular = tested)
      score += Math.min(c.recipe.viewCount / 100, 3);

      // Prefer matching difficulty
      if (constraints.difficulties.includes(c.recipe.difficulty.toLowerCase())) {
        score += 2;
      }

      // Variety bonus: prefer cuisines not yet used today
      if (c.recipe.cuisine && !usedCuisines.slice(-3).includes(c.recipe.cuisine)) {
        score += 1.5;
      }

      // Budget efficiency: prefer recipes that use more of the budget (not too cheap)
      const scaledCost = scaleCost(c.cost, c.recipe.servings, servings);
      const budgetRatio = scaledCost / maxBudget;
      if (budgetRatio > 0.3 && budgetRatio < 0.9) score += 1;

      // Featured recipes get a boost
      if (c.recipe.isFeatured) score += 2;

      // Add randomness to prevent identical plans
      score += Math.random() * 2;

      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

/**
 * Scale recipe cost from recipe servings to target servings.
 */
function scaleCost(cost: number, recipeServings: number, targetServings: number): number {
  if (recipeServings <= 0) return cost;
  return round2((cost / recipeServings) * targetServings);
}

/**
 * Parse recipe ingredientIds JSON into structured array.
 */
function parseIngredients(ingredientIds: string): Array<{ name: string; quantity: number; unit: string }> {
  try {
    const parsed = JSON.parse(ingredientIds);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: typeof item === 'string' ? item : (item.name || ''),
        quantity: item.quantity || 1,
        unit: item.unit || 'buc',
      }));
    }
  } catch {
    // Comma-separated fallback
    return ingredientIds.split(',').map(s => ({
      name: s.trim(),
      quantity: 1,
      unit: 'buc',
    }));
  }
  return [];
}

/**
 * Build consolidated shopping list from the meal plan.
 */
function buildShoppingList(menu: PlannedDay[], targetServings: number): ShoppingItem[] {
  const ingredients = new Map<string, { quantity: number; unit: string }>();

  for (const day of menu) {
    for (const meal of day.meals) {
      if (!meal.recipe?.ingredients) continue;

      const recipeServings = meal.recipe.servings || 4;
      const scale = targetServings / recipeServings;

      for (const ing of meal.recipe.ingredients) {
        const key = ing.name.toLowerCase();
        if (ingredients.has(key)) {
          const existing = ingredients.get(key)!;
          existing.quantity += ing.quantity * scale;
        } else {
          ingredients.set(key, {
            quantity: ing.quantity * scale,
            unit: ing.unit,
          });
        }
      }
    }
  }

  return Array.from(ingredients.entries())
    .map(([name, data]) => ({
      name,
      quantity: round2(data.quantity),
      unit: data.unit,
      checked: false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
