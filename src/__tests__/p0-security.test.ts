/**
 * Test script for P0 security improvements
 */

import { describe, it, expect } from '@jest/globals'
import { env } from '../lib/env'
import { NotFoundError, ValidationError, handleApiError } from '../lib/api-error'
import { z } from 'zod'
import { OfferQuerySchema } from '../lib/validators/offer'
import { CreateRecipeSchema } from '../lib/validators/recipe'
import { logger } from '../lib/logger'

// Test 1: Environment Validation
describe('Environment Validation', () => {
    it('should validate environment variables', () => {
        expect(env.DATABASE_URL).toBeDefined()
        expect(env.OPENAI_API_KEY).toMatch(/^sk-/)
        expect(env.NODE_ENV).toMatch(/development|production|test/)
    })
})

// Test 2: Error Handling
describe('Error Handling', () => {
    it('should create API errors with correct status codes', () => {
        const notFound = NotFoundError('User', '123')
        expect(notFound.statusCode).toBe(404)
        expect(notFound.message).toContain('not found')

        const validation = ValidationError([{ field: 'email', message: 'Invalid' }])
        expect(validation.statusCode).toBe(422)
    })

    it('should handle Zod validation errors', () => {
        const schema = z.object({ email: z.string().email() })

        try {
            schema.parse({ email: 'invalid' })
        } catch (error) {
            const response = handleApiError(error)
            expect(response.status).toBe(422)
        }
    })
})

// Test 3: Input Validation
describe('Input Validation', () => {
    it('should validate offer query parameters', () => {
        const valid = OfferQuerySchema.parse({
            page: '1',
            limit: '20',
            validOnly: 'true'
        })

        expect(valid.page).toBe(1)
        expect(valid.limit).toBe(20)
        expect(valid.validOnly).toBe(true)
    })

    it('should reject invalid query parameters', () => {
        expect(() => {
            OfferQuerySchema.parse({ page: 'invalid' })
        }).toThrow()

        expect(() => {
            OfferQuerySchema.parse({ limit: '1000' }) // Max 100
        }).toThrow()
    })

    it('should validate recipe creation', () => {
        const valid = CreateRecipeSchema.parse({
            title: 'Test Recipe',
            description: 'Test description',
            servings: 4,
            prepTime: 30,
            cookTime: 45,
            difficulty: 'easy',
            totalCost: 25.50,
            ingredients: [
                { name: 'Flour', quantity: 500, unit: 'g', price: 5.0 }
            ],
            steps: [
                { order: 1, description: 'Mix ingredients', duration: 10 }
            ]
        })

        expect(valid.title).toBe('Test Recipe')
        expect(valid.servings).toBe(4)
    })
})

// Test 4: Logger
describe('Logger', () => {
    it('should log messages without errors', () => {
        // These should not throw
        expect(() => {
            logger.info('Test message')
            logger.debug('Debug message', { data: 'test' })
            logger.warn('Warning message')
            logger.error('Error message')
        }).not.toThrow()
    })

    it('should log API requests', () => {
        const mockRequest = {
            method: 'GET',
            url: 'http://localhost:3000/api/test',
            headers: {
                get: () => 'Mozilla/5.0'
            }
        }

        expect(() => {
            logger.apiRequest(mockRequest as any, 150, 200)
        }).not.toThrow()
    })

    it('should log AI operations', () => {
        expect(() => {
            logger.aiOperation('test_operation', 1000, 0.05, 2000)
        }).not.toThrow()
    })
})
