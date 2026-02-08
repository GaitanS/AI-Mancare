import { Recipe, Prisma } from '@prisma/client'
import { BaseRepository, PaginatedResponse, PaginationParams, SortParams } from './base'

/**
 * Recipe filter parameters
 */
export interface RecipeFilters {
    difficulty?: string
    maxCost?: number
    maxPrepTime?: number
    servings?: number
    search?: string
    isVegan?: boolean
    isVegetarian?: boolean
    isGlutenFree?: boolean
}

/**
 * Repository for Recipe entity operations
 */
export class RecipeRepository extends BaseRepository<Recipe, Prisma.RecipeCreateInput, Prisma.RecipeUpdateInput> {
    protected modelName = 'Recipe'

    /**
     * Find recipes with filtering, pagination and sorting
     */
    async findMany(
        filters: RecipeFilters,
        pagination: PaginationParams,
        sort: SortParams
    ): Promise<PaginatedResponse<Recipe>> {
        const where = this.buildWhereClause(filters)
        const { skip, take } = this.buildPagination(pagination.page, pagination.limit)

        const [recipes, total] = await this.executeWithLogging('findMany', () =>
            Promise.all([
                this.db.recipe.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { [sort.sortBy]: sort.sortOrder }
                }),
                this.db.recipe.count({ where })
            ])
        )

        return this.buildPaginatedResponse(recipes, total, pagination.page, pagination.limit)
    }

    /**
     * Find single recipe by ID
     */
    async findById(id: string): Promise<Recipe | null> {
        return this.executeWithLogging('findById', () =>
            this.db.recipe.findUnique({
                where: { id }
            })
        )
    }

    /**
     * Find recipe by slug
     */
    async findBySlug(slug: string): Promise<Recipe | null> {
        return this.executeWithLogging('findBySlug', () =>
            this.db.recipe.findUnique({
                where: { slug }
            })
        )
    }

    /**
     * Find popular recipes by creation date
     */
    async findPopular(limit: number = 10): Promise<Recipe[]> {
        return this.executeWithLogging('findPopular', () =>
            this.db.recipe.findMany({
                orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
                take: limit
            })
        )
    }

    /**
     * Find budget-friendly recipes
     */
    async findBudgetFriendly(maxCost: number, limit: number = 10): Promise<Recipe[]> {
        return this.executeWithLogging('findBudgetFriendly', () =>
            this.db.recipe.findMany({
                where: {
                    estimatedCost: { lte: maxCost }
                },
                orderBy: { estimatedCost: 'asc' },
                take: limit
            })
        )
    }

    /**
     * Find quick recipes (prep + cook time < threshold)
     */
    async findQuick(maxTotalTime: number, limit: number = 10): Promise<Recipe[]> {
        return this.executeWithLogging('findQuick', () =>
            this.db.recipe.findMany({
                where: {
                    totalTime: { lte: maxTotalTime }
                },
                orderBy: { totalTime: 'asc' },
                take: limit
            })
        )
    }

    /**
     * Create new recipe
     */
    async create(data: Prisma.RecipeCreateInput): Promise<Recipe> {
        return this.executeWithLogging('create', () =>
            this.db.recipe.create({ data })
        )
    }

    /**
     * Update recipe
     */
    async update(id: string, data: Prisma.RecipeUpdateInput): Promise<Recipe> {
        return this.executeWithLogging('update', () =>
            this.db.recipe.update({
                where: { id },
                data
            })
        )
    }

    /**
     * Increment recipe view count (fire-and-forget)
     */
    async incrementViews(id: string): Promise<void> {
        await this.executeWithLogging('incrementViews', () =>
            this.db.recipe.update({
                where: { id },
                data: { viewCount: { increment: 1 } }
            })
        )
    }

    /**
     * Delete recipe
     */
    async delete(id: string): Promise<void> {
        await this.executeWithLogging('delete', () =>
            this.db.recipe.delete({ where: { id } })
        )
    }

    /**
     * Get recipe statistics
     */
    async getStats(): Promise<{
        total: number
        avgCost: number
        byDifficulty: { difficulty: string; count: number }[]
    }> {
        const [total, avgResult, byDifficulty] = await this.executeWithLogging('getStats', () =>
            Promise.all([
                this.db.recipe.count(),
                this.db.recipe.aggregate({
                    _avg: { estimatedCost: true }
                }),
                this.db.recipe.groupBy({
                    by: ['difficulty'],
                    _count: true
                })
            ])
        )

        return {
            total,
            avgCost: avgResult._avg.estimatedCost?.toNumber() || 0,
            byDifficulty: byDifficulty.map(d => ({
                difficulty: d.difficulty,
                count: d._count
            }))
        }
    }

    /**
     * Build Prisma where clause from filters
     */
    private buildWhereClause(filters: RecipeFilters): Prisma.RecipeWhereInput {
        return {
            ...(filters.difficulty && { difficulty: filters.difficulty }),
            ...(filters.maxCost && { estimatedCost: { lte: filters.maxCost } }),
            ...(filters.maxPrepTime && { prepTime: { lte: filters.maxPrepTime } }),
            ...(filters.servings && { servings: filters.servings }),
            ...(filters.isVegan && { isVegan: true }),
            ...(filters.isVegetarian && { isVegetarian: true }),
            ...(filters.isGlutenFree && { isGlutenFree: true }),
            ...(filters.search && {
                OR: [
                    { title: { contains: filters.search } },
                    { description: { contains: filters.search } }
                ]
            })
        }
    }
}

// Singleton instance
export const recipeRepository = new RecipeRepository()
