/**
 * Enhanced Catalog Extractor
 * Uses optimized prompts and cost tracking for better accuracy
 * Skill: prompt-engineering-patterns, llm-evaluation
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { logger } from '../logger'

// Product schema for validation
const ProductSchema = z.object({
    name: z.string().min(1),
    price: z.number().positive(),
    unit: z.string(),
    discount: z.number().min(0).max(100),
    originalPrice: z.number().positive().optional(),
    category: z.string(),
    brand: z.string().nullable(),
    confidence: z.number().min(0).max(1).optional()
})

type ExtractedProduct = z.infer<typeof ProductSchema>

// Romanian product categories
const CATEGORIES = [
    'Lactate',      // Dairy
    'Carne',        // Meat
    'Legume',       // Vegetables
    'Fructe',       // Fruits
    'Pâine',        // Bread/Bakery
    'Băcănie',      // Dry goods
    'Băuturi',      // Beverages
    'Congelate',    // Frozen
    'Dulciuri',     // Sweets
    'Igienă',       // Hygiene
    'Curățenie',    // Cleaning
    'Altele'        // Other
] as const

// AI cost tracking
interface AIUsageMetrics {
    tokens: number
    inputTokens: number
    outputTokens: number
    cost: number
    duration: number
}

interface ExtractionResult {
    products: ExtractedProduct[]
    metrics: AIUsageMetrics
    rawResponse?: string
}

/**
 * Enhanced catalog extractor with improved prompts
 */
export class CatalogExtractor {
    private totalTokensUsed = 0
    private totalCost = 0

    // Budget protection - DEFAULT: $10/day, $50/month, $100 hard limit
    private static readonly MONTHLY_BUDGET_LIMIT = parseFloat(process.env.AI_MONTHLY_BUDGET || '50')
    private static readonly DAILY_BUDGET_LIMIT = parseFloat(process.env.AI_DAILY_BUDGET || '10')
    private static readonly HARD_LIMIT = parseFloat(process.env.AI_HARD_LIMIT || '100')

    private static globalMonthlySpent = 0
    private static globalDailySpent = 0
    private static lastResetDay = new Date().getDate()
    private static lastResetMonth = new Date().getMonth()

    // 🛑 PAUSE FLAG - When true, ALL AI operations are blocked until manually resumed
    private static budgetPaused = false
    private static pauseReason = ''

    private modelInitialized = false
    private modelInstance: ChatOpenAI | null = null
    private apiKey?: string

    constructor(apiKey?: string) {
        this.apiKey = apiKey
        // Don't initialize model here - do it lazily on first use
        // to prevent errors when just checking budget status
        this.checkAndResetCounters()
    }

    /**
     * Lazy initialization of the model
     */
    private getModel(): ChatOpenAI {
        if (!this.modelInstance) {
            this.modelInstance = new ChatOpenAI({
                modelName: 'gpt-4o',
                temperature: 0,
                maxTokens: 4096,
                ...(this.apiKey && { openAIApiKey: this.apiKey })
            })
            this.modelInitialized = true
        }
        return this.modelInstance
    }

    /**
     * Check if we're within budget before making API call
     */
    private checkBudget(): void {
        this.checkAndResetCounters()

        // 🛑 CHECK IF PAUSED - Requires manual resume
        if (CatalogExtractor.budgetPaused) {
            const error = new Error(
                `🛑 AI OPERATIONS PAUSED: ${CatalogExtractor.pauseReason} ` +
                `Call POST /api/admin/ai-budget with {"action": "resume"} to continue.`
            )
            logger.warn('AI operations paused', { reason: CatalogExtractor.pauseReason })
            throw error
        }

        // Check hard limit
        if (CatalogExtractor.globalMonthlySpent >= CatalogExtractor.HARD_LIMIT) {
            CatalogExtractor.budgetPaused = true
            CatalogExtractor.pauseReason = `HARD LIMIT ($${CatalogExtractor.HARD_LIMIT}) exceeded`
            const error = new Error(
                `🚨 HARD LIMIT EXCEEDED: $${CatalogExtractor.globalMonthlySpent.toFixed(2)} spent. ` +
                `Maximum: $${CatalogExtractor.HARD_LIMIT}. AI PAUSED - requires manual resume.`
            )
            logger.error('AI HARD LIMIT EXCEEDED - PAUSED', {
                spent: CatalogExtractor.globalMonthlySpent,
                limit: CatalogExtractor.HARD_LIMIT
            })
            throw error
        }

        // Check monthly limit - PAUSE instead of just blocking
        if (CatalogExtractor.globalMonthlySpent >= CatalogExtractor.MONTHLY_BUDGET_LIMIT) {
            CatalogExtractor.budgetPaused = true
            CatalogExtractor.pauseReason = `Monthly limit ($${CatalogExtractor.MONTHLY_BUDGET_LIMIT}) exceeded`
            const error = new Error(
                `⚠️ Monthly budget exceeded: $${CatalogExtractor.globalMonthlySpent.toFixed(2)}. ` +
                `Limit: $${CatalogExtractor.MONTHLY_BUDGET_LIMIT}. AI PAUSED - requires manual resume.`
            )
            logger.warn('Monthly AI budget exceeded - PAUSED', {
                spent: CatalogExtractor.globalMonthlySpent,
                limit: CatalogExtractor.MONTHLY_BUDGET_LIMIT
            })
            throw error
        }

        // Check daily limit - PAUSE instead of just blocking
        if (CatalogExtractor.globalDailySpent >= CatalogExtractor.DAILY_BUDGET_LIMIT) {
            CatalogExtractor.budgetPaused = true
            CatalogExtractor.pauseReason = `Daily limit ($${CatalogExtractor.DAILY_BUDGET_LIMIT}) exceeded`
            const error = new Error(
                `⚠️ Daily budget exceeded: $${CatalogExtractor.globalDailySpent.toFixed(2)}. ` +
                `Limit: $${CatalogExtractor.DAILY_BUDGET_LIMIT}. AI PAUSED - requires manual resume.`
            )
            logger.warn('Daily AI budget exceeded - PAUSED', {
                spent: CatalogExtractor.globalDailySpent,
                limit: CatalogExtractor.DAILY_BUDGET_LIMIT
            })
            throw error
        }
    }

    /**
     * 🟢 RESUME AI operations (after user approval)
     */
    static resume(): { success: boolean; message: string } {
        if (!CatalogExtractor.budgetPaused) {
            return { success: true, message: 'AI operations were not paused' }
        }

        const previousReason = CatalogExtractor.pauseReason
        CatalogExtractor.budgetPaused = false
        CatalogExtractor.pauseReason = ''

        logger.info('AI operations RESUMED by user', { previousReason })

        return {
            success: true,
            message: `AI operations resumed. Previous pause reason: ${previousReason}`
        }
    }

    /**
     * 🔴 PAUSE AI operations manually
     */
    static pause(reason: string = 'Manually paused by user'): void {
        CatalogExtractor.budgetPaused = true
        CatalogExtractor.pauseReason = reason
        logger.info('AI operations PAUSED by user', { reason })
    }

    /**
     * Check if AI is currently paused
     */
    static isPaused(): boolean {
        return CatalogExtractor.budgetPaused
    }

    /**
     * Reset counters at midnight/month start
     */
    private checkAndResetCounters(): void {
        const now = new Date()

        // Reset daily counter
        if (now.getDate() !== CatalogExtractor.lastResetDay) {
            logger.info('Resetting daily AI budget counter', {
                previousSpent: CatalogExtractor.globalDailySpent
            })
            CatalogExtractor.globalDailySpent = 0
            CatalogExtractor.lastResetDay = now.getDate()
        }

        // Reset monthly counter
        if (now.getMonth() !== CatalogExtractor.lastResetMonth) {
            logger.info('Resetting monthly AI budget counter', {
                previousSpent: CatalogExtractor.globalMonthlySpent
            })
            CatalogExtractor.globalMonthlySpent = 0
            CatalogExtractor.lastResetMonth = now.getMonth()
        }
    }

    /**
     * Get current budget status
     */
    static getBudgetStatus() {
        return {
            daily: {
                spent: this.globalDailySpent,
                limit: this.DAILY_BUDGET_LIMIT,
                remaining: Math.max(0, this.DAILY_BUDGET_LIMIT - this.globalDailySpent),
                percentUsed: (this.globalDailySpent / this.DAILY_BUDGET_LIMIT) * 100
            },
            monthly: {
                spent: this.globalMonthlySpent,
                limit: this.MONTHLY_BUDGET_LIMIT,
                remaining: Math.max(0, this.MONTHLY_BUDGET_LIMIT - this.globalMonthlySpent),
                percentUsed: (this.globalMonthlySpent / this.MONTHLY_BUDGET_LIMIT) * 100
            },
            hardLimit: {
                limit: this.HARD_LIMIT,
                remaining: Math.max(0, this.HARD_LIMIT - this.globalMonthlySpent)
            }
        }
    }

    /**
     * Extract products from a catalog page image
     */
    async extractProducts(
        imageBase64: string,
        metadata: {
            storeName: string
            pageNumber: number
            catalogId?: string
        }
    ): Promise<ExtractionResult> {
        const start = Date.now()

        // 🛡️ CHECK BUDGET BEFORE MAKING API CALL
        this.checkBudget()

        try {
            const prompt = this.buildExtractionPrompt(metadata)

            const response = await this.getModel().invoke([
                new HumanMessage({
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                                detail: 'high' // Important for reading small text
                            }
                        }
                    ]
                })
            ])

            const duration = Date.now() - start
            const content = response.content as string

            // Calculate metrics
            const metrics = this.calculateMetrics(response, duration)
            this.updateTotals(metrics)

            // Log AI operation
            logger.aiOperation('catalog_extraction', metrics.tokens, metrics.cost, duration, {
                store: metadata.storeName,
                page: metadata.pageNumber,
                catalogId: metadata.catalogId
            })

            // Parse and validate products
            const products = this.parseProducts(content)

            return {
                products,
                metrics,
                rawResponse: content
            }
        } catch (error) {
            const duration = Date.now() - start
            logger.error('Catalog extraction failed', {
                error,
                store: metadata.storeName,
                page: metadata.pageNumber,
                duration
            })
            throw error
        }
    }

    /**
     * Build optimized extraction prompt
     * Based on prompt-engineering-patterns skill
     */
    private buildExtractionPrompt(metadata: {
        storeName: string
        pageNumber: number
    }): string {
        return `You are an expert Romanian supermarket catalog analyzer with 99% accuracy.

# CONTEXT
- Store: ${metadata.storeName}
- Page: ${metadata.pageNumber}
- Language: Romanian
- Currency: RON (Romanian Lei)

# YOUR TASK
Extract ALL products visible in this catalog page image with maximum accuracy.

# EXTRACTION RULES

## For EACH product, extract:
1. **name**: Full product name in Romanian (exactly as shown)
2. **price**: Current sale price (number only, e.g., 12.99)
3. **unit**: Unit of measurement from image (kg, buc, L, ml, g, 100g, pachet)
4. **discount**: Discount percentage (0-100, calculate if not shown)
5. **originalPrice**: Original price before discount (if visible)
6. **category**: One of: ${CATEGORIES.join(', ')}
7. **brand**: Brand name (null if not visible)
8. **confidence**: Your confidence 0-1 (1 = certain, 0.7 = readable, 0.5 = guessing)

## Price Extraction Rules:
- If price shows "12,99", convert to 12.99 (dot not comma)
- If "lei/kg" or "lei/buc", extract the unit
- If multiple prices, use the SALE price (usually larger/highlighted)
- Calculate discount: ((originalPrice - price) / originalPrice) * 100

## Category Mapping:
- Milk, cheese, yogurt, butter → Lactate
- Chicken, pork, beef, fish, cold cuts → Carne
- Tomatoes, onions, potatoes, carrots → Legume
- Apples, bananas, oranges → Fructe
- Bread, croissants, pastries → Pâine
- Pasta, rice, flour, oil, sugar → Băcănie
- Juice, soda, water, beer, wine → Băuturi
- Frozen pizza, ice cream → Congelate
- Chocolate, candy, cookies → Dulciuri
- Shampoo, soap, toothpaste → Igienă
- Detergent, cleaning supplies → Curățenie
- Everything else → Altele

## Quality Guidelines:
- Extract EVERY product visible, even partially
- Use Romanian diacritics: ă, â, î, ș, ț
- If text is blurry, mark confidence as 0.5-0.7
- If you're guessing a value, set confidence lower
- Include promotional text in name if relevant (e.g., "Pâine albă PROMOȚIE")

# OUTPUT FORMAT
Return ONLY a JSON array, no markdown, no explanation:

[
  {
    "name": "Lapte UHT Zuzu 3.5%",
    "price": 5.99,
    "unit": "L",
    "discount": 25,
    "originalPrice": 7.99,
    "category": "Lactate",
    "brand": "Zuzu",
    "confidence": 0.95
  }
]

# IMPORTANT
- Return [] if no products found
- Return ONLY valid JSON array
- No markdown code blocks
- Extract ALL products, minimum 1 per visible item

Begin extraction now:`
    }

    /**
     * Parse and validate products from AI response
     */
    private parseProducts(content: string): ExtractedProduct[] {
        // Try to extract JSON array from response
        let jsonStr = content.trim()

        // Remove markdown code blocks if present
        const codeBlockMatch = jsonStr.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim()
        }

        // Try to find JSON array
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
            jsonStr = arrayMatch[0]
        }

        try {
            const parsed = JSON.parse(jsonStr)

            if (!Array.isArray(parsed)) {
                logger.warn('AI response is not an array', { response: content.slice(0, 200) })
                return []
            }

            // Validate each product
            const products: ExtractedProduct[] = []
            for (let i = 0; i < parsed.length; i++) {
                try {
                    const product = ProductSchema.parse({
                        ...parsed[i],
                        // Ensure discount is calculated if not provided
                        discount: parsed[i].discount ?? this.calculateDiscount(
                            parsed[i].price,
                            parsed[i].originalPrice
                        )
                    })
                    products.push(product)
                } catch (error) {
                    logger.warn(`Product ${i} validation failed`, {
                        product: parsed[i],
                        error
                    })
                }
            }

            return products
        } catch (error) {
            logger.error('Failed to parse AI response', {
                error,
                content: content.slice(0, 500)
            })
            return []
        }
    }

    /**
     * Calculate discount percentage
     */
    private calculateDiscount(price?: number, originalPrice?: number): number {
        if (!price || !originalPrice || originalPrice <= price) return 0
        return Math.round(((originalPrice - price) / originalPrice) * 100)
    }

    /**
     * Calculate usage metrics from response
     */
    private calculateMetrics(response: any, duration: number): AIUsageMetrics {
        const usage = response.response_metadata?.tokenUsage || {}
        const inputTokens = usage.promptTokens || 0
        const outputTokens = usage.completionTokens || 0
        const tokens = inputTokens + outputTokens

        // GPT-4o pricing: $5/1M input, $15/1M output
        const cost = (inputTokens * 5 / 1_000_000) + (outputTokens * 15 / 1_000_000)

        return {
            tokens,
            inputTokens,
            outputTokens,
            cost,
            duration
        }
    }

    /**
     * Update running totals (instance + global)
     */
    private updateTotals(metrics: AIUsageMetrics) {
        // Instance totals
        this.totalTokensUsed += metrics.tokens
        this.totalCost += metrics.cost

        // Global totals for budget tracking
        CatalogExtractor.globalDailySpent += metrics.cost
        CatalogExtractor.globalMonthlySpent += metrics.cost

        // Log warning if approaching limits
        if (CatalogExtractor.globalDailySpent >= CatalogExtractor.DAILY_BUDGET_LIMIT * 0.8) {
            logger.warn('Approaching daily AI budget limit', {
                spent: CatalogExtractor.globalDailySpent,
                limit: CatalogExtractor.DAILY_BUDGET_LIMIT
            })
        }

        if (CatalogExtractor.globalMonthlySpent >= CatalogExtractor.MONTHLY_BUDGET_LIMIT * 0.8) {
            logger.warn('Approaching monthly AI budget limit', {
                spent: CatalogExtractor.globalMonthlySpent,
                limit: CatalogExtractor.MONTHLY_BUDGET_LIMIT
            })
        }
    }

    /**
     * Get total usage statistics
     */
    getTotals() {
        return {
            totalTokensUsed: this.totalTokensUsed,
            totalCost: this.totalCost
        }
    }

    /**
     * Reset usage counters
     */
    resetTotals() {
        this.totalTokensUsed = 0
        this.totalCost = 0
    }
}

// Singleton instance
export const catalogExtractor = new CatalogExtractor()
