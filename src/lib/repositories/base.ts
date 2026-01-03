import { PrismaClient } from '@prisma/client'
import { logger } from '../logger'

// Late binding to avoid circular dependency
let prismaInstance: PrismaClient | null = null

function getPrisma(): PrismaClient {
    if (!prismaInstance) {
        prismaInstance = new PrismaClient()
    }
    return prismaInstance
}

/**
 * Base repository with common CRUD operations and logging
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
    protected db: PrismaClient
    protected abstract modelName: string

    constructor(db?: PrismaClient) {
        this.db = db || getPrisma()
    }

    /**
     * Execute a query with performance logging
     */
    protected async executeWithLogging<R>(
        operation: string,
        query: () => Promise<R>
    ): Promise<R> {
        const start = Date.now()
        try {
            const result = await query()
            const duration = Date.now() - start
            logger.dbQuery(`${this.modelName}.${operation}`, duration)
            return result
        } catch (error) {
            const duration = Date.now() - start
            logger.error(`${this.modelName}.${operation} failed`, { error, duration })
            throw error
        }
    }

    /**
     * Build pagination object
     */
    protected buildPagination(page: number, limit: number) {
        return {
            skip: (page - 1) * limit,
            take: limit
        }
    }

    /**
     * Build paginated response
     */
    protected buildPaginatedResponse<R>(
        data: R[],
        total: number,
        page: number,
        limit: number
    ) {
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        }
    }
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
    page: number
    limit: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    data: T[]
    meta: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

/**
 * Sort parameters
 */
export interface SortParams {
    sortBy: string
    sortOrder: 'asc' | 'desc'
}
