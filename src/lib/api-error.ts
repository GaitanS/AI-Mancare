import { z } from 'zod'

/**
 * Custom API error class for consistent error handling
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public details?: any
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * Common error constructors
 */
export const NotFoundError = (resource: string, id: string) =>
    new ApiError(404, `${resource} not found`, { id })

export const ValidationError = (errors: any[]) =>
    new ApiError(422, 'Validation failed', { errors })

export const UnauthorizedError = (message = 'Unauthorized') =>
    new ApiError(401, message)

export const ForbiddenError = (message = 'Forbidden') =>
    new ApiError(403, message)

export const BadRequestError = (message: string, details?: any) =>
    new ApiError(400, message, details)

export const InternalServerError = (message = 'Internal server error') =>
    new ApiError(500, message)

/**
 * Global error handler for API routes
 * Converts errors to consistent JSON responses
 */
export function handleApiError(error: unknown): Response {
    console.error('API Error:', error)

    // Handle custom API errors
    if (error instanceof ApiError) {
        return Response.json(
            {
                error: error.message,
                details: error.details,
                timestamp: new Date().toISOString()
            },
            { status: error.statusCode }
        )
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
        return Response.json(
            {
                error: 'Validation failed',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                    code: e.code
                })),
                timestamp: new Date().toISOString()
            },
            { status: 422 }
        )
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any

        // Unique constraint violation
        if (prismaError.code === 'P2002') {
            return Response.json(
                {
                    error: 'Duplicate entry',
                    details: { fields: prismaError.meta?.target },
                    timestamp: new Date().toISOString()
                },
                { status: 409 }
            )
        }

        // Record not found
        if (prismaError.code === 'P2025') {
            return Response.json(
                {
                    error: 'Record not found',
                    timestamp: new Date().toISOString()
                },
                { status: 404 }
            )
        }
    }

    // Unknown errors - don't leak internal details
    return Response.json(
        {
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        },
        { status: 500 }
    )
}

/**
 * Async error wrapper for API routes
 * Usage: export const GET = withErrorHandler(async (request) => { ... })
 */
export function withErrorHandler(
    handler: (request: Request, context?: any) => Promise<Response>
) {
    return async (request: Request, context?: any): Promise<Response> => {
        try {
            return await handler(request, context)
        } catch (error) {
            return handleApiError(error)
        }
    }
}
