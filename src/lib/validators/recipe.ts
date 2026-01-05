import { z } from 'zod'

/**
 * Validation schemas for Recipe API endpoints
 */

export const RecipeQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    maxCost: z.coerce.number().positive().optional(),
    maxPrepTime: z.coerce.number().positive().optional(),
    servings: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['totalCost', 'prepTime', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const CreateRecipeSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    servings: z.number().int().positive(),
    prepTime: z.number().int().positive(),
    cookTime: z.number().int().positive(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    totalCost: z.number().positive(),
    ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        unit: z.string(),
        price: z.number().positive(),
        offerId: z.string().uuid().optional()
    })),
    steps: z.array(z.object({
        order: z.number().int().positive(),
        description: z.string(),
        duration: z.number().int().positive().optional()
    })),
    imageUrl: z.string().url().optional(),
    isPublished: z.boolean().default(false)
})

export const UpdateRecipeSchema = CreateRecipeSchema.partial()

export type RecipeQuery = z.infer<typeof RecipeQuerySchema>
export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>
