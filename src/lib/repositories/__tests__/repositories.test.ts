/**
 * Repository Tests
 * Tests for data access layer
 */

import { PrismaClient } from '@prisma/client'

// Get mocked Prisma instance
const prisma = new PrismaClient()

describe('ProductRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('findMany', () => {
        it('should return paginated products', async () => {
            const mockProducts = [
                { id: '1', name: 'Lapte UHT', price: 5.99, category: 'Lactate', store: 'Kaufland' },
                { id: '2', name: 'Pâine albă', price: 3.50, category: 'Pâine', store: 'Kaufland' }
            ]

                ; (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts)
                ; (prisma.product.count as jest.Mock).mockResolvedValue(10)

            const { ProductRepository } = await import('@/lib/repositories/product-repository')
            const repo = new ProductRepository(prisma)

            const result = await repo.findMany(
                { store: 'Kaufland', validOnly: true },
                { page: 1, limit: 10 },
                { sortBy: 'createdAt', sortOrder: 'desc' }
            )

            expect(result.data).toEqual(mockProducts)
            expect(result.meta.total).toBe(10)
            expect(result.meta.page).toBe(1)
            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 0,
                    take: 10
                })
            )
        })

        it('should filter by category', async () => {
            ; (prisma.product.findMany as jest.Mock).mockResolvedValue([])
                ; (prisma.product.count as jest.Mock).mockResolvedValue(0)

            const { ProductRepository } = await import('@/lib/repositories/product-repository')
            const repo = new ProductRepository(prisma)

            await repo.findMany(
                { category: 'Lactate' },
                { page: 1, limit: 10 },
                { sortBy: 'price', sortOrder: 'asc' }
            )

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        category: 'Lactate'
                    })
                })
            )
        })
    })

    describe('findTrending', () => {
        it('should return products with high discount', async () => {
            const mockTrending = [
                { id: '1', name: 'Promo Product', discountPercentage: 30 }
            ]

                ; (prisma.product.findMany as jest.Mock).mockResolvedValue(mockTrending)

            const { ProductRepository } = await import('@/lib/repositories/product-repository')
            const repo = new ProductRepository(prisma)

            const result = await repo.findTrending(5)

            expect(result).toEqual(mockTrending)
            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        discountPercentage: { gte: 20 }
                    }),
                    take: 5
                })
            )
        })
    })

    describe('getStats', () => {
        it('should return aggregated statistics', async () => {
            ; (prisma.product.count as jest.Mock)
                .mockResolvedValueOnce(100) // total
                .mockResolvedValueOnce(80)  // active
                ; (prisma.product.aggregate as jest.Mock).mockResolvedValue({
                    _avg: { discountPercentage: 15 }
                })
                ; (prisma.product.groupBy as jest.Mock)
                    .mockResolvedValueOnce([
                        { category: 'Lactate', _count: 25 },
                        { category: 'Carne', _count: 20 }
                    ])
                    .mockResolvedValueOnce([
                        { store: 'Kaufland', _count: 50 },
                        { store: 'Lidl', _count: 30 }
                    ])

            const { ProductRepository } = await import('@/lib/repositories/product-repository')
            const repo = new ProductRepository(prisma)

            const stats = await repo.getStats()

            expect(stats.total).toBe(100)
            expect(stats.active).toBe(80)
            expect(stats.avgDiscount).toBe(15)
            expect(stats.byCategory).toHaveLength(2)
            expect(stats.byStore).toHaveLength(2)
        })
    })
})

describe('RecipeRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('findBySlug', () => {
        it('should return recipe by slug', async () => {
            const mockRecipe = {
                id: '1',
                title: 'Ciorbă de pui',
                slug: 'ciorba-de-pui',
                difficulty: 'USOR'
            }

                ; (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe)

            const { RecipeRepository } = await import('@/lib/repositories/recipe-repository')
            const repo = new RecipeRepository(prisma)

            const result = await repo.findBySlug('ciorba-de-pui')

            expect(result).toEqual(mockRecipe)
            expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
                where: { slug: 'ciorba-de-pui' }
            })
        })
    })

    describe('findBudgetFriendly', () => {
        it('should return recipes under budget', async () => {
            const mockRecipes = [
                { id: '1', title: 'Recipe 1', estimatedCost: 15 },
                { id: '2', title: 'Recipe 2', estimatedCost: 20 }
            ]

                ; (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes)

            const { RecipeRepository } = await import('@/lib/repositories/recipe-repository')
            const repo = new RecipeRepository(prisma)

            const result = await repo.findBudgetFriendly(25, 5)

            expect(result).toEqual(mockRecipes)
            expect(prisma.recipe.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        estimatedCost: { lte: 25 }
                    })
                })
            )
        })
    })

    describe('incrementViews', () => {
        it('should increment view count', async () => {
            ; (prisma.recipe.update as jest.Mock).mockResolvedValue({})

            const { RecipeRepository } = await import('@/lib/repositories/recipe-repository')
            const repo = new RecipeRepository(prisma)

            await repo.incrementViews('recipe-1')

            expect(prisma.recipe.update).toHaveBeenCalledWith({
                where: { id: 'recipe-1' },
                data: { viewCount: { increment: 1 } }
            })
        })
    })
})

describe('CatalogRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('findPending', () => {
        it('should return pending catalogs', async () => {
            const mockCatalogs = [
                { id: '1', title: 'Catalog 1', status: 'PENDING' }
            ]

                ; (prisma.catalog.findMany as jest.Mock).mockResolvedValue(mockCatalogs)

            const { CatalogRepository } = await import('@/lib/repositories/catalog-repository')
            const repo = new CatalogRepository(prisma)

            const result = await repo.findPending(5)

            expect(result).toEqual(mockCatalogs)
            expect(prisma.catalog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { status: 'PENDING' }
                })
            )
        })
    })

    describe('startProcessing', () => {
        it('should update status to processing', async () => {
            const mockCatalog = { id: '1', status: 'PROCESSING' }

                ; (prisma.catalog.update as jest.Mock).mockResolvedValue(mockCatalog)

            const { CatalogRepository } = await import('@/lib/repositories/catalog-repository')
            const repo = new CatalogRepository(prisma)

            const result = await repo.startProcessing('cat-1')

            expect(result.status).toBe('PROCESSING')
            expect(prisma.catalog.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'PROCESSING'
                    })
                })
            )
        })
    })
})
