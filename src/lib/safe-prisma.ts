/**
 * Safe Prisma Query Wrapper
 * Prevents 500 errors when database is unavailable or empty
 */

import { prisma } from './db-config';

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
        console.error('Database connection failed:', error);
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
            console.warn(errorMessage || 'Database unavailable, returning default');
            return defaultValue;
        }

        return await queryFn();
    } catch (error) {
        console.error(errorMessage || 'Database query failed:', error);
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
