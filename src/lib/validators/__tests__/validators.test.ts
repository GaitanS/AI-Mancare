/**
 * Validator Tests
 * Tests for input validation schemas
 */

import { z } from 'zod'

describe('Validators', () => {
    describe('OfferQuerySchema', () => {
        let OfferQuerySchema: z.ZodSchema

        beforeAll(async () => {
            const validatorModule = await import('@/lib/validators/offer')
            OfferQuerySchema = validatorModule.OfferQuerySchema
        })

        it('should parse valid query parameters', () => {
            const result = OfferQuerySchema.parse({
                page: '1',
                limit: '20',
                validOnly: 'true'
            })

            expect(result.page).toBe(1)
            expect(result.limit).toBe(20)
            expect(result.validOnly).toBe(true)
        })

        it('should apply default values', () => {
            const result = OfferQuerySchema.parse({})

            expect(result.page).toBe(1)
            expect(result.limit).toBe(20)
            expect(result.validOnly).toBe(true)
            expect(result.sortBy).toBe('createdAt')
            expect(result.sortOrder).toBe('desc')
        })

        it('should reject invalid page number', () => {
            expect(() => {
                OfferQuerySchema.parse({ page: '0' })
            }).toThrow()

            expect(() => {
                OfferQuerySchema.parse({ page: '-1' })
            }).toThrow()
        })

        it('should reject limit over 100', () => {
            expect(() => {
                OfferQuerySchema.parse({ limit: '101' })
            }).toThrow()
        })

        it('should parse optional filters', () => {
            const result = OfferQuerySchema.parse({
                store: 'kaufland',
                category: 'Lactate',
                minPrice: '5',
                maxPrice: '50',
                minDiscount: '10'
            })

            expect(result.store).toBe('kaufland')
            expect(result.category).toBe('Lactate')
            expect(result.minPrice).toBe(5)
            expect(result.maxPrice).toBe(50)
            expect(result.minDiscount).toBe(10)
        })
    })

    describe('CreateRecipeSchema', () => {
        let CreateRecipeSchema: z.ZodSchema

        beforeAll(async () => {
            const validatorModule = await import('@/lib/validators/recipe')
            CreateRecipeSchema = validatorModule.CreateRecipeSchema
        })

        it('should validate complete recipe', () => {
            const recipe = {
                title: 'Ciorbă de pui',
                description: 'O ciorbă delicioasă',
                servings: 4,
                prepTime: 20,
                cookTime: 45,
                difficulty: 'easy',
                totalCost: 35.50,
                ingredients: [
                    { name: 'Pui', quantity: 500, unit: 'g', price: 15 },
                    { name: 'Morcovi', quantity: 2, unit: 'buc', price: 2 }
                ],
                steps: [
                    { order: 1, description: 'Fierbe puiul' },
                    { order: 2, description: 'Adaugă legumele' }
                ]
            }

            const result = CreateRecipeSchema.parse(recipe)

            expect(result.title).toBe('Ciorbă de pui')
            expect(result.ingredients).toHaveLength(2)
            expect(result.steps).toHaveLength(2)
        })

        it('should reject missing required fields', () => {
            expect(() => {
                CreateRecipeSchema.parse({
                    title: 'Test'
                    // Missing other required fields
                })
            }).toThrow()
        })

        it('should reject invalid difficulty', () => {
            expect(() => {
                CreateRecipeSchema.parse({
                    title: 'Test',
                    description: 'Test',
                    servings: 4,
                    prepTime: 20,
                    cookTime: 45,
                    difficulty: 'invalid', // Should be easy, medium, or hard
                    totalCost: 10,
                    ingredients: [],
                    steps: []
                })
            }).toThrow()
        })
    })

    describe('StoreQuerySchema', () => {
        let StoreQuerySchema: z.ZodSchema

        beforeAll(async () => {
            const validatorModule = await import('@/lib/validators/store')
            StoreQuerySchema = validatorModule.StoreQuerySchema
        })

        it('should parse valid query', () => {
            const result = StoreQuerySchema.parse({
                page: '2',
                limit: '15',
                isActive: 'true'
            })

            expect(result.page).toBe(2)
            expect(result.limit).toBe(15)
            expect(result.isActive).toBe(true)
        })

        it('should handle search parameter', () => {
            const result = StoreQuerySchema.parse({
                search: 'kaufland'
            })

            expect(result.search).toBe('kaufland')
        })
    })
})
