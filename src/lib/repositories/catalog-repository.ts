import { Catalog, Prisma } from '@prisma/client'
import { BaseRepository, PaginatedResponse, PaginationParams } from './base'

/**
 * Catalog filter parameters
 */
export interface CatalogFilters {
    store?: string
    status?: string
    validOnly?: boolean
}

/**
 * Repository for Catalog entity operations
 */
export class CatalogRepository extends BaseRepository<Catalog, Prisma.CatalogCreateInput, Prisma.CatalogUpdateInput> {
    protected modelName = 'Catalog'

    /**
     * Find catalogs with filtering and pagination
     */
    async findMany(
        filters: CatalogFilters,
        pagination: PaginationParams
    ): Promise<PaginatedResponse<Catalog>> {
        const where = this.buildWhereClause(filters)
        const { skip, take } = this.buildPagination(pagination.page, pagination.limit)

        const [catalogs, total] = await this.executeWithLogging('findMany', () =>
            Promise.all([
                this.db.catalog.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' }
                }),
                this.db.catalog.count({ where })
            ])
        )

        return this.buildPaginatedResponse(catalogs, total, pagination.page, pagination.limit)
    }

    /**
     * Find catalog by ID
     */
    async findById(id: string): Promise<Catalog | null> {
        return this.executeWithLogging('findById', () =>
            this.db.catalog.findUnique({
                where: { id }
            })
        )
    }

    /**
     * Find catalog by PDF URL
     */
    async findByPdfUrl(pdfUrl: string): Promise<Catalog | null> {
        return this.executeWithLogging('findByPdfUrl', () =>
            this.db.catalog.findUnique({
                where: { pdfUrl }
            })
        )
    }

    /**
     * Find pending catalogs for processing
     */
    async findPending(limit: number = 10): Promise<Catalog[]> {
        return this.executeWithLogging('findPending', () =>
            this.db.catalog.findMany({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'asc' },
                take: limit
            })
        )
    }

    /**
     * Find active catalogs (currently valid)
     */
    async findActive(): Promise<Catalog[]> {
        const now = new Date()
        return this.executeWithLogging('findActive', () =>
            this.db.catalog.findMany({
                where: {
                    status: 'COMPLETED',
                    validFrom: { lte: now },
                    validUntil: { gte: now }
                },
                orderBy: { validUntil: 'asc' }
            })
        )
    }

    /**
     * Create new catalog
     */
    async create(data: Prisma.CatalogCreateInput): Promise<Catalog> {
        return this.executeWithLogging('create', () =>
            this.db.catalog.create({ data })
        )
    }

    /**
     * Update catalog
     */
    async update(id: string, data: Prisma.CatalogUpdateInput): Promise<Catalog> {
        return this.executeWithLogging('update', () =>
            this.db.catalog.update({
                where: { id },
                data
            })
        )
    }

    /**
     * Update catalog status
     */
    async updateStatus(id: string, status: string): Promise<Catalog> {
        return this.executeWithLogging('updateStatus', () =>
            this.db.catalog.update({
                where: { id },
                data: { status }
            })
        )
    }

    /**
     * Mark catalog as processing
     */
    async startProcessing(id: string): Promise<Catalog> {
        return this.executeWithLogging('startProcessing', () =>
            this.db.catalog.update({
                where: { id },
                data: {
                    status: 'PROCESSING',
                    processingStartedAt: new Date()
                }
            })
        )
    }

    /**
     * Mark catalog as completed
     */
    async completeProcessing(id: string, totalPages: number): Promise<Catalog> {
        return this.executeWithLogging('completeProcessing', () =>
            this.db.catalog.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    processingCompletedAt: new Date(),
                    totalPages,
                    processedPages: totalPages
                }
            })
        )
    }

    /**
     * Mark catalog as failed
     */
    async failProcessing(id: string, error: string): Promise<Catalog> {
        return this.executeWithLogging('failProcessing', () =>
            this.db.catalog.update({
                where: { id },
                data: {
                    status: 'FAILED',
                    processingErrors: error
                }
            })
        )
    }

    /**
     * Get catalog statistics
     */
    async getStats(): Promise<{
        total: number
        pending: number
        processing: number
        completed: number
        failed: number
        byStore: { store: string; count: number }[]
    }> {
        const [total, pending, processing, completed, failed, byStore] = await this.executeWithLogging('getStats', () =>
            Promise.all([
                this.db.catalog.count(),
                this.db.catalog.count({ where: { status: 'PENDING' } }),
                this.db.catalog.count({ where: { status: 'PROCESSING' } }),
                this.db.catalog.count({ where: { status: 'COMPLETED' } }),
                this.db.catalog.count({ where: { status: 'FAILED' } }),
                this.db.catalog.groupBy({
                    by: ['store'],
                    _count: true,
                    orderBy: { _count: { store: 'desc' } }
                })
            ])
        )

        return {
            total,
            pending,
            processing,
            completed,
            failed,
            byStore: byStore.map(s => ({
                store: s.store,
                count: s._count
            }))
        }
    }

    /**
     * Build Prisma where clause from filters
     */
    private buildWhereClause(filters: CatalogFilters): Prisma.CatalogWhereInput {
        const now = new Date()
        return {
            ...(filters.store && { store: filters.store }),
            ...(filters.status && { status: filters.status }),
            ...(filters.validOnly && {
                validFrom: { lte: now },
                validUntil: { gte: now }
            })
        }
    }
}

// Singleton instance
export const catalogRepository = new CatalogRepository()
