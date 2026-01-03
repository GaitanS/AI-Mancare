/**
 * Recipe RAG System
 * Skill: llm-application-dev, prompt-engineering-patterns
 * 
 * Uses Retrieval Augmented Generation to create recipes
 * based on currently available products from supermarkets
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { logger } from '../logger'
import { productRepository } from '../repositories'
import { cache, CacheKeys, CacheTTL } from '../cache'

// Recipe schema for validation
const GeneratedRecipeSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(10),
    servings: z.number().int().min(1).max(12),
    prepTime: z.number().int().min(0),
    cookTime: z.number().int().min(0),
    difficulty: z.enum(['USOR', 'MEDIU', 'DIFICIL']),
    ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        unit: z.string(),
        productMatch: z.string().optional(),
        estimatedPrice: z.number().optional()
    })),
    instructions: z.array(z.string()),
    tips: z.array(z.string()).optional(),
    tags: z.array(z.string()),
    estimatedCost: z.number(),
    nutritionalInfo: z.object({
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbs: z.number().optional(),
        fat: z.number().optional()
    }).optional()
})

type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>

interface RecipeGenerationOptions {
    budget?: number
    servings?: number
    dietary?: ('vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free')[]
    preferredStores?: string[]
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'
    ingredients?: string[] // Specific ingredients to include
    excludeIngredients?: string[]
    maxPrepTime?: number
}

interface GenerationResult {
    recipe: GeneratedRecipe
    matchedProducts: Array<{
        productId: string
        productName: string
        price: number
        store: string
        discount: number
    }>
    totalCost: number
    savings: number
    metrics: {
        tokens: number
        cost: number
        duration: number
    }
}

/**
 * Recipe RAG Generator
 * Creates budget-friendly recipes using currently available products
 */
export class RecipeRAG {
    private model: ChatOpenAI
    private totalTokensUsed = 0
    private totalCost = 0

    constructor(apiKey?: string) {
        this.model = new ChatOpenAI({
            modelName: 'gpt-4o',
            temperature: 0.7, // Some creativity for recipes
            maxTokens: 4096,
            ...(apiKey && { openAIApiKey: apiKey })
        })
    }

    /**
     * Generate a recipe based on available products
     */
    async generateRecipe(options: RecipeGenerationOptions = {}): Promise<GenerationResult> {
        const start = Date.now()

        try {
            // Step 1: Retrieve relevant products from database
            const products = await this.retrieveProducts(options)

            if (products.length === 0) {
                throw new Error('No products available matching criteria')
            }

            // Step 2: Build context from products
            const productContext = this.buildProductContext(products)

            // Step 3: Generate recipe using LLM
            const prompt = this.buildRecipePrompt(options, productContext)
            const systemPrompt = this.buildSystemPrompt()

            const response = await this.model.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(prompt)
            ])

            const content = response.content as string

            // Step 4: Parse and validate recipe
            const recipe = this.parseRecipe(content)

            // Step 5: Match recipe ingredients to actual products
            const matchedProducts = this.matchProducts(recipe.ingredients, products)

            // Calculate actual cost and savings
            const totalCost = matchedProducts.reduce((sum, p) => sum + p.price, 0)
            const savings = matchedProducts.reduce((sum, p) => sum + (p.discount / 100) * p.price, 0)

            // Calculate metrics
            const duration = Date.now() - start
            const usage = response.response_metadata?.tokenUsage || {}
            const tokens = usage.totalTokens || 0
            const cost = this.calculateCost(tokens)

            this.totalTokensUsed += tokens
            this.totalCost += cost

            logger.aiOperation('recipe_generation', tokens, cost, duration, {
                budget: options.budget,
                ingredients: options.ingredients?.length || 0,
                productsUsed: matchedProducts.length
            })

            return {
                recipe: {
                    ...recipe,
                    estimatedCost: totalCost
                },
                matchedProducts,
                totalCost,
                savings,
                metrics: { tokens, cost, duration }
            }
        } catch (error) {
            const duration = Date.now() - start
            logger.error('Recipe generation failed', { error, options, duration })
            throw error
        }
    }

    /**
     * Generate multiple recipe suggestions
     */
    async generateRecipeSuggestions(
        count: number = 3,
        options: RecipeGenerationOptions = {}
    ): Promise<GenerationResult[]> {
        const results: GenerationResult[] = []

        for (let i = 0; i < count; i++) {
            try {
                // Add variation to each recipe
                const variedOptions = {
                    ...options,
                    mealType: options.mealType || this.getRandomMealType()
                }

                const result = await this.generateRecipe(variedOptions)
                results.push(result)
            } catch (error) {
                logger.warn(`Failed to generate recipe ${i + 1}/${count}`, { error })
            }
        }

        return results
    }

    /**
     * Retrieve products from database based on options
     */
    private async retrieveProducts(options: RecipeGenerationOptions) {
        const products = await productRepository.findMany(
            {
                store: options.preferredStores?.[0],
                validOnly: true,
                maxPrice: options.budget,
                minDiscount: 0
            },
            { page: 1, limit: 100 },
            { sortBy: 'discountPercentage', sortOrder: 'desc' }
        )

        // Filter by category relevance for food
        const foodCategories = ['Lactate', 'Carne', 'Legume', 'Fructe', 'Pâine', 'Băcănie', 'Congelate']

        return products.data.filter(p =>
            foodCategories.some(cat =>
                p.category?.toLowerCase().includes(cat.toLowerCase())
            )
        )
    }

    /**
     * Build product context for the prompt
     */
    private buildProductContext(products: any[]): string {
        const grouped = products.reduce((acc, p) => {
            const cat = p.category || 'Altele'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push({
                name: p.name,
                price: Number(p.price),
                unit: p.unit,
                discount: p.discountPercentage || 0,
                store: p.store
            })
            return acc
        }, {} as Record<string, any[]>)

        let context = '# PRODUSE DISPONIBILE CU OFERTE\n\n'

        for (const [category, items] of Object.entries(grouped)) {
            context += `## ${category}\n`
            for (const item of (items as any[]).slice(0, 10)) {
                context += `- ${item.name}: ${item.price} lei/${item.unit}`
                if (item.discount > 0) {
                    context += ` (-${item.discount}%)`
                }
                context += ` @ ${item.store}\n`
            }
            context += '\n'
        }

        return context
    }

    /**
     * Build system prompt for recipe generation
     */
    private buildSystemPrompt(): string {
        return `Ești un chef profesionist specializat în bucătăria românească și internațională.
Creezi rețete delicioase, economice și ușor de preparat pentru familii.

REGULI:
1. Folosește ingrediente disponibile din lista de produse
2. Prioritizează produsele cu discount mare
3. Menține costul total sub bugetul specificat
4. Include instrucțiuni clare, pas cu pas
5. Oferă sfaturi practice pentru preparare
6. Calculează timpul de preparare realist
7. Respectă restricțiile dietetice specificate

OUTPUT: Returnează DOAR JSON valid, fără text sau markdown suplimentar.`
    }

    /**
     * Build recipe generation prompt
     */
    private buildRecipePrompt(options: RecipeGenerationOptions, productContext: string): string {
        let prompt = `${productContext}\n\n# CERINȚE REȚETĂ\n\n`

        if (options.budget) {
            prompt += `- Buget maxim: ${options.budget} lei\n`
        }

        if (options.servings) {
            prompt += `- Porții: ${options.servings}\n`
        }

        if (options.mealType) {
            prompt += `- Tip masă: ${options.mealType}\n`
        }

        if (options.maxPrepTime) {
            prompt += `- Timp maxim preparare: ${options.maxPrepTime} minute\n`
        }

        if (options.dietary && options.dietary.length > 0) {
            prompt += `- Restricții: ${options.dietary.join(', ')}\n`
        }

        if (options.ingredients && options.ingredients.length > 0) {
            prompt += `- Include ingrediente: ${options.ingredients.join(', ')}\n`
        }

        if (options.excludeIngredients && options.excludeIngredients.length > 0) {
            prompt += `- Exclude ingrediente: ${options.excludeIngredients.join(', ')}\n`
        }

        prompt += `
# OUTPUT FORMAT

{
  "title": "Numele rețetei",
  "description": "Descriere scurtă și apetisantă",
  "servings": 4,
  "prepTime": 20,
  "cookTime": 45,
  "difficulty": "USOR" | "MEDIU" | "DIFICIL",
  "ingredients": [
    { "name": "ingredient", "quantity": 500, "unit": "g", "productMatch": "nume produs din oferte", "estimatedPrice": 5.99 }
  ],
  "instructions": [
    "Pas 1...",
    "Pas 2..."
  ],
  "tips": ["Sfat 1", "Sfat 2"],
  "tags": ["traditional", "rapid", "economic"],
  "estimatedCost": 35.50,
  "nutritionalInfo": {
    "calories": 450,
    "protein": 25,
    "carbs": 30,
    "fat": 15
  }
}

Generează o rețetă delicioasă și economică folosind produsele disponibile:`

        return prompt
    }

    /**
     * Parse recipe from LLM response
     */
    private parseRecipe(content: string): GeneratedRecipe {
        // Remove markdown code blocks if present
        let jsonStr = content.trim()
        const codeBlockMatch = jsonStr.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim()
        }

        // Find JSON object
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response')
        }

        const parsed = JSON.parse(jsonMatch[0])
        return GeneratedRecipeSchema.parse(parsed)
    }

    /**
     * Match recipe ingredients to actual products
     */
    private matchProducts(ingredients: GeneratedRecipe['ingredients'], products: any[]) {
        return ingredients.map(ing => {
            // Find best matching product
            const match = products.find(p =>
                p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
                ing.productMatch?.toLowerCase().includes(p.name.toLowerCase())
            )

            if (match) {
                return {
                    productId: match.id,
                    productName: match.name,
                    price: ing.estimatedPrice || Number(match.price),
                    store: match.store,
                    discount: match.discountPercentage || 0
                }
            }

            return {
                productId: 'unmatched',
                productName: ing.name,
                price: ing.estimatedPrice || 0,
                store: 'N/A',
                discount: 0
            }
        })
    }

    /**
     * Get random meal type for variation
     */
    private getRandomMealType(): RecipeGenerationOptions['mealType'] {
        const types: RecipeGenerationOptions['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']
        return types[Math.floor(Math.random() * types.length)]
    }

    /**
     * Calculate cost based on tokens
     */
    private calculateCost(tokens: number): number {
        const inputTokens = tokens * 0.7
        const outputTokens = tokens * 0.3
        return (inputTokens * 5 / 1_000_000) + (outputTokens * 15 / 1_000_000)
    }

    /**
     * Get usage statistics
     */
    getStats() {
        return {
            totalTokensUsed: this.totalTokensUsed,
            totalCost: this.totalCost
        }
    }
}

// Singleton instance
export const recipeRAG = new RecipeRAG()
