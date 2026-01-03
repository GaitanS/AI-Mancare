import { z } from 'zod'

/**
 * Validation schemas for Offer API endpoints
 */

export const OfferQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    store: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    minDiscount: z.coerce.number().min(0).max(100).optional(),
    validOnly: z.coerce.boolean().default(true),
    sortBy: z.enum(['price', 'discount', 'createdAt', 'name']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const CreateOfferSchema = z.object({
    name: z.string().min(1).max(200),
    price: z.number().positive(),
    unit: z.string().min(1),
    discount: z.number().min(0).max(100).default(0),
    category: z.string().min(1),
    storeId: z.string().uuid(),
    productId: z.string().uuid().optional(),
    validUntil: z.coerce.date().min(new Date()),
    imageUrl: z.string().url().optional()
})

export const UpdateOfferSchema = CreateOfferSchema.partial()

export type OfferQuery = z.infer<typeof OfferQuerySchema>
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>
