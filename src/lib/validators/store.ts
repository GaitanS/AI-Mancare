import { z } from 'zod'

/**
 * Validation schemas for Store API endpoints
 */

export const StoreQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isActive: z.coerce.boolean().optional(),
    search: z.string().optional()
})

export const CreateStoreSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    logo: z.string().url().optional(),
    website: z.string().url().optional(),
    isActive: z.boolean().default(true)
})

export const UpdateStoreSchema = CreateStoreSchema.partial()

export type StoreQuery = z.infer<typeof StoreQuerySchema>
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>
export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>
