/**
 * Weekly Menu Planner API
 * Uses Recipe RAG to generate weekly menu plans
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recipeRAG } from '@/lib/ai/recipe-rag'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { cache, CacheTTL } from '@/lib/cache'

// Request validation schema
const MenuPlanSchema = z.object({
    budget: z.number().positive().default(200), // Weekly budget
    servings: z.number().int().min(1).max(12).default(4),
    daysCount: z.number().int().min(1).max(7).default(7),
    mealsPerDay: z.number().int().min(1).max(4).default(3), // breakfast, lunch, dinner, snack
    dietary: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free', 'dairy-free'])).optional(),
    preferredStores: z.array(z.string()).optional(),
    excludeIngredients: z.array(z.string()).optional()
})

interface DayMenu {
    day: string
    meals: {
        type: string
        recipe: any
        cost: number
    }[]
    totalCost: number
}

/**
 * POST /api/plan/generate
 * Generate a weekly menu plan
 */
export async function POST(request: NextRequest) {
    const start = Date.now()

    try {
        const body = await request.json()

        // Validate request
        const options = MenuPlanSchema.parse(body)

        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'].slice(0, options.mealsPerDay)
        const budgetPerMeal = options.budget / (options.daysCount * options.mealsPerDay)
        const dayNames = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

        const weeklyMenu: DayMenu[] = []
        let totalWeekCost = 0

        for (let day = 0; day < options.daysCount; day++) {
            const dayMenu: DayMenu = {
                day: dayNames[day],
                meals: [],
                totalCost: 0
            }

            for (const mealType of mealTypes) {
                try {
                    const result = await recipeRAG.generateRecipe({
                        budget: budgetPerMeal * 1.5, // Some flexibility
                        servings: options.servings,
                        dietary: options.dietary,
                        preferredStores: options.preferredStores,
                        mealType: mealType as any,
                        excludeIngredients: options.excludeIngredients
                    })

                    dayMenu.meals.push({
                        type: mealType,
                        recipe: result.recipe,
                        cost: result.totalCost
                    })

                    dayMenu.totalCost += result.totalCost
                } catch (error) {
                    logger.warn(`Failed to generate ${mealType} for ${dayNames[day]}`, { error })
                    // Still add a placeholder
                    dayMenu.meals.push({
                        type: mealType,
                        recipe: null,
                        cost: 0
                    })
                }
            }

            weeklyMenu.push(dayMenu)
            totalWeekCost += dayMenu.totalCost
        }

        // Generate shopping list
        const shoppingList = this.generateShoppingList(weeklyMenu)

        const duration = Date.now() - start
        logger.apiRequest(request, duration, 200)

        return NextResponse.json({
            success: true,
            data: {
                menu: weeklyMenu,
                summary: {
                    totalCost: totalWeekCost,
                    budgetRemaining: options.budget - totalWeekCost,
                    daysPlanned: options.daysCount,
                    mealsPlanned: weeklyMenu.reduce((sum, d) => sum + d.meals.filter(m => m.recipe).length, 0),
                    averageCostPerDay: totalWeekCost / options.daysCount,
                    averageCostPerMeal: totalWeekCost / (options.daysCount * options.mealsPerDay)
                },
                shoppingList
            },
            generatedAt: new Date().toISOString()
        })
    } catch (error) {
        const duration = Date.now() - start
        logger.apiRequest(request, duration, 500)
        return handleApiError(error)
    }
}

/**
 * Generate consolidated shopping list from menu
 */
function generateShoppingList(weeklyMenu: DayMenu[]) {
    const ingredients: Record<string, { quantity: number; unit: string; stores: string[] }> = {}

    for (const day of weeklyMenu) {
        for (const meal of day.meals) {
            if (!meal.recipe?.ingredients) continue

            for (const ing of meal.recipe.ingredients) {
                const key = ing.name.toLowerCase()

                if (ingredients[key]) {
                    ingredients[key].quantity += ing.quantity
                } else {
                    ingredients[key] = {
                        quantity: ing.quantity,
                        unit: ing.unit,
                        stores: []
                    }
                }
            }
        }
    }

    return Object.entries(ingredients).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        unit: data.unit,
        checked: false
    }))
}

// Export for use in function
export { generateShoppingList }
