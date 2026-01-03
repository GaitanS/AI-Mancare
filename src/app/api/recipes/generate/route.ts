/**
 * Recipe Generation API
 * Uses RAG to create recipes based on available products
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recipeRAG } from '@/lib/ai/recipe-rag'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { Metrics } from '@/lib/metrics'

// Request validation schema
const GenerateRecipeSchema = z.object({
    budget: z.number().positive().optional(),
    servings: z.number().int().min(1).max(12).optional(),
    dietary: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free', 'dairy-free'])).optional(),
    preferredStores: z.array(z.string()).optional(),
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']).optional(),
    ingredients: z.array(z.string()).optional(),
    excludeIngredients: z.array(z.string()).optional(),
    maxPrepTime: z.number().int().positive().optional(),
    count: z.number().int().min(1).max(5).optional()
})

/**
 * POST /api/recipes/generate
 * Generate recipe suggestions based on available products
 */
export async function POST(request: NextRequest) {
    const start = Date.now()

    try {
        const body = await request.json()

        // Validate request
        const options = GenerateRecipeSchema.parse(body)

        const count = options.count || 1

        let result

        if (count === 1) {
            // Generate single recipe
            result = await recipeRAG.generateRecipe({
                budget: options.budget,
                servings: options.servings,
                dietary: options.dietary,
                preferredStores: options.preferredStores,
                mealType: options.mealType,
                ingredients: options.ingredients,
                excludeIngredients: options.excludeIngredients,
                maxPrepTime: options.maxPrepTime
            })

            Metrics.recipeGenerated(result.recipe.difficulty)
        } else {
            // Generate multiple recipes
            const results = await recipeRAG.generateRecipeSuggestions(count, {
                budget: options.budget,
                servings: options.servings,
                dietary: options.dietary,
                preferredStores: options.preferredStores,
                mealType: options.mealType,
                ingredients: options.ingredients,
                excludeIngredients: options.excludeIngredients,
                maxPrepTime: options.maxPrepTime
            })

            results.forEach(r => Metrics.recipeGenerated(r.recipe.difficulty))

            result = results
        }

        const duration = Date.now() - start
        logger.apiRequest(request, duration, 200)

        return NextResponse.json({
            success: true,
            data: result,
            generatedAt: new Date().toISOString()
        })
    } catch (error) {
        const duration = Date.now() - start
        logger.apiRequest(request, duration, 500)
        return handleApiError(error)
    }
}
