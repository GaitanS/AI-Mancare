import { Product, Prisma } from '@prisma/client'
import { BaseRepository, PaginatedResponse, PaginationParams, SortParams } from './base'

/**
 * Product filter parameters
 */
export interface ProductFilters {
    store?: string
    category?: string
    minPrice?: number
    maxPrice?: number
    minDiscount?: number
    validOnly?: boolean
    search?: string
}

/**
 * Repository for Product entity operations
 * Maps to the 'products' table (offers from supermarkets)
 */
export class ProductRepository extends BaseRepository<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput> {
    protected modelName = 'Product'

    /**
     * Find products with filtering, pagination and sorting
     */
    async findMany(
        filters: ProductFilters,
        pagination: PaginationParams,
        sort: SortParams
    ): Promise<PaginatedResponse<Product>> {
        const where = this.buildWhereClause(filters)
        const { skip, take } = this.buildPagination(pagination.page, pagination.limit)

        const [products, total] = await this.executeWithLogging('findMany', () =>
            Promise.all([
                this.db.product.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { [sort.sortBy]: sort.sortOrder }
                }),
                this.db.product.count({ where })
            ])
        )

        return this.buildPaginatedResponse(products, total, pagination.page, pagination.limit)
    }

    /**
     * Find single product by ID
     */
    async findById(id: string): Promise<Product | null> {
        return this.executeWithLogging('findById', () =>
            this.db.product.findUnique({
                where: { id }
            })
        )
    }

    /**
     * Find trending products (high discount, still valid)
     */
    async findTrending(limit: number = 10): Promise<Product[]> {
        return this.executeWithLogging('findTrending', () =>
            this.db.product.findMany({
                where: {
                    validUntil: { gte: new Date() },
                    discountPercentage: { gte: 20 }
                },
                orderBy: [
                    { discountPercentage: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: limit
            })
        )
    }

    /**
     * Find products by store
     */
    async findByStore(store: string, limit: number = 20): Promise<Product[]> {
        return this.executeWithLogging('findByStore', () =>
            this.db.product.findMany({
                where: {
                    store,
                    validUntil: { gte: new Date() }
                },
                orderBy: { discountPercentage: 'desc' },
                take: limit
            })
        )
    }

    /**
     * Find products by category
     */
    async findByCategory(category: string, limit: number = 20): Promise<Product[]> {
        return this.executeWithLogging('findByCategory', () =>
            this.db.product.findMany({
                where: {
                    category,
                    validUntil: { gte: new Date() }
                },
                orderBy: { discountPercentage: 'desc' },
                take: limit
            })
        )
    }

    /**
     * Create multiple products (batch insert)
     */
    async createMany(products: Prisma.ProductCreateManyInput[]): Promise<number> {
        const result = await this.executeWithLogging('createMany', () =>
            this.db.product.createMany({
                data: products
            })
        )
        return result.count
    }

    /**
     * Update product
     */
    async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
        return this.executeWithLogging('update', () =>
            this.db.product.update({
                where: { id },
                data
            })
        )
    }

    /**
     * Delete expired products
     */
    async deleteExpired(): Promise<number> {
        const result = await this.executeWithLogging('deleteExpired', () =>
            this.db.product.deleteMany({
                where: {
                    validUntil: { lt: new Date() }
                }
            })
        )
        return result.count
    }

    /**
     * Get product statistics
     */
    async getStats(): Promise<{
        total: number
        active: number
        avgDiscount: number
        byCategory: { category: string; count: number }[]
        byStore: { store: string; count: number }[]
    }> {
        const [total, active, avgResult, byCategory, byStore] = await this.executeWithLogging('getStats', () =>
            Promise.all([
                this.db.product.count(),
                this.db.product.count({
                    where: { validUntil: { gte: new Date() } }
                }),
                this.db.product.aggregate({
                    _avg: { discountPercentage: true },
                    where: { validUntil: { gte: new Date() } }
                }),
                this.db.product.groupBy({
                    by: ['category'],
                    _count: true,
                    where: { validUntil: { gte: new Date() } },
                    orderBy: { _count: { category: 'desc' } }
                }),
                this.db.product.groupBy({
                    by: ['store'],
                    _count: true,
                    where: { validUntil: { gte: new Date() } },
                    orderBy: { _count: { store: 'desc' } }
                })
            ])
        )

        return {
            total,
            active,
            avgDiscount: avgResult._avg.discountPercentage || 0,
            byCategory: byCategory.map(c => ({
                category: c.category,
                count: c._count
            })),
            byStore: byStore.map(s => ({
                store: s.store,
                count: s._count
            }))
        }
    }

    /**
     * Get unique stores
     */
    async getStores(): Promise<string[]> {
        const results = await this.executeWithLogging('getStores', () =>
            this.db.product.findMany({
                select: { store: true },
                distinct: ['store'],
                where: { validUntil: { gte: new Date() } }
            })
        )
        return results.map(r => r.store)
    }

    /**
     * Get unique categories
     */
    async getCategories(): Promise<string[]> {
        const results = await this.executeWithLogging('getCategories', () =>
            this.db.product.findMany({
                select: { category: true },
                distinct: ['category'],
                where: { validUntil: { gte: new Date() } }
            })
        )
        return results.map(r => r.category)
    }

    /**
     * Build Prisma where clause from filters
     */
    private buildWhereClause(filters: ProductFilters): Prisma.ProductWhereInput {
        return {
            ...(filters.store && { store: filters.store }),
            ...(filters.category && { category: filters.category }),
            ...((filters.minPrice || filters.maxPrice) && {
                price: {
                    ...(filters.minPrice && { gte: filters.minPrice }),
                    ...(filters.maxPrice && { lte: filters.maxPrice }),
                }
            }),
            ...(filters.minDiscount && { discountPercentage: { gte: filters.minDiscount } }),
            ...(filters.validOnly !== false && { validUntil: { gte: new Date() } }),
            ...(filters.search && {
                OR: [
                    { name: { contains: filters.search } },
                    { category: { contains: filters.search } },
                    { brand: { contains: filters.search } }
                ]
            })
        }
    }
}

// Singleton instance
export const productRepository = new ProductRepository()
