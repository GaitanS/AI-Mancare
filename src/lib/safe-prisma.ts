/**
 * Safe Prisma Query Wrapper
 * Prevents 500 errors when database is unavailable or empty
 */

import { prisma } from './db-config';
import { logger } from '@/lib/logger';

// Flag to track if database is available
let databaseAvailable: boolean | null = null;

/**
 * Check if database connection is working
 */
async function checkConnection(): Promise<boolean> {
    if (databaseAvailable !== null) {
        return databaseAvailable;
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
        databaseAvailable = true;
        return true;
    } catch (error) {
        logger.error('Database connection failed', { error }, 'SafePrisma');
        databaseAvailable = false;
        // Reset after 30 seconds to retry
        setTimeout(() => { databaseAvailable = null; }, 30000);
        return false;
    }
}

/**
 * Execute a Prisma query safely, returning a default value on failure
 */
export async function safeQuery<T>(
    queryFn: () => Promise<T>,
    defaultValue: T,
    errorMessage?: string
): Promise<T> {
    try {
        // Quick connection check
        const isConnected = await checkConnection();
        if (!isConnected) {
            logger.warn(errorMessage || 'Database unavailable, returning default', {}, 'SafePrisma');
            return defaultValue;
        }

        return await queryFn();
    } catch (error) {
        logger.error(errorMessage || 'Database query failed', { error }, 'SafePrisma');
        // Mark database as potentially unavailable
        databaseAvailable = null;
        return defaultValue;
    }
}

/**
 * Safely get products with fallback to empty array
 */
export async function safeGetProducts(queryFn: () => Promise<any[]>): Promise<any[]> {
    return safeQuery(queryFn, [], 'Failed to fetch products');
}

/**
 * Safely get recipes with fallback to empty array  
 */
export async function safeGetRecipes(queryFn: () => Promise<any[]>): Promise<any[]> {
    return safeQuery(queryFn, [], 'Failed to fetch recipes');
}

/**
 * Safely get count with fallback to 0
 */
export async function safeCount(queryFn: () => Promise<number>): Promise<number> {
    return safeQuery(queryFn, 0, 'Failed to count records');
}

/**
 * Reset database availability flag (useful after fixes)
 */
export function resetDbStatus(): void {
    databaseAvailable = null;
}

export { prisma };
