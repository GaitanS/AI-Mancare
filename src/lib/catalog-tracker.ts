/**
 * Catalog Tracker - Hash-Based Deduplication
 * Prevents processing the same catalog twice
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

// File-based tracking (works without database dependency)
const TRACKING_FILE = path.join(process.cwd(), 'data', 'processed-catalogs.json');

interface ProcessedCatalog {
    hash: string;
    store: string;
    pdfUrl: string;
    processedAt: string;
    validUntil: string;
    productsExtracted: number;
}

export class CatalogTracker {

    /**
     * Generate unique hash for a catalog
     */
    private static generateHash(store: string, pdfUrl: string, validFrom: string): string {
        const data = `${store.toLowerCase()}-${pdfUrl}-${validFrom}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Load processed catalogs from file
     */
    private static async loadProcessed(): Promise<ProcessedCatalog[]> {
        try {
            const data = await fs.readFile(TRACKING_FILE, 'utf-8');
            return JSON.parse(data);
        } catch {
            // File doesn't exist yet - return empty array
            return [];
        }
    }

    /**
     * Save processed catalogs to file
     */
    private static async saveProcessed(catalogs: ProcessedCatalog[]): Promise<void> {
        try {
            await fs.mkdir(path.dirname(TRACKING_FILE), { recursive: true });
            await fs.writeFile(TRACKING_FILE, JSON.stringify(catalogs, null, 2));
        } catch (error) {
            logger.error('Failed to save catalog tracking file', { error });
        }
    }

    /**
     * ✅ Check if catalog was already processed
     */
    static async wasProcessed(store: string, pdfUrl: string, validFrom: string): Promise<boolean> {
        const hash = this.generateHash(store, pdfUrl, validFrom);
        const processed = await this.loadProcessed();

        const found = processed.some(c => c.hash === hash);

        if (found) {
            logger.debug(`Catalog already processed: ${store} (${hash.substring(0, 8)})`);
        }

        return found;
    }

    /**
     * ✅ Mark catalog as processed
     */
    static async markProcessed(
        store: string,
        pdfUrl: string,
        validFrom: string,
        validUntil: string,
        productsExtracted: number = 0
    ): Promise<void> {
        const hash = this.generateHash(store, pdfUrl, validFrom);
        const processed = await this.loadProcessed();

        // Remove old entries (older than 3 months) to prevent file bloat
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const filtered = processed.filter(c =>
            new Date(c.processedAt) > threeMonthsAgo
        );

        // Check if already exists
        const existingIndex = filtered.findIndex(c => c.hash === hash);
        if (existingIndex >= 0) {
            // Update existing
            filtered[existingIndex] = {
                ...filtered[existingIndex],
                processedAt: new Date().toISOString(),
                productsExtracted
            };
        } else {
            // Add new entry
            filtered.push({
                hash,
                store,
                pdfUrl,
                processedAt: new Date().toISOString(),
                validUntil,
                productsExtracted
            });
        }

        await this.saveProcessed(filtered);
        logger.info(`Catalog marked as processed: ${store} (${productsExtracted} products)`);
    }

    /**
     * ✅ Get statistics about processed catalogs
     */
    static async getStats(): Promise<{
        total: number;
        byStore: Record<string, number>;
        lastProcessed: string | null;
        totalProducts: number;
    }> {
        const processed = await this.loadProcessed();

        const byStore = processed.reduce((acc, c) => {
            acc[c.store] = (acc[c.store] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const totalProducts = processed.reduce((sum, c) =>
            sum + (c.productsExtracted || 0), 0
        );

        const lastProcessed = processed.length > 0
            ? processed.sort((a, b) =>
                new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
            )[0].processedAt
            : null;

        return {
            total: processed.length,
            byStore,
            lastProcessed,
            totalProducts
        };
    }

    /**
     * ✅ Clear all tracking data (for testing)
     */
    static async clearAll(): Promise<void> {
        try {
            await fs.unlink(TRACKING_FILE);
            logger.info('Catalog tracking data cleared');
        } catch {
            // File doesn't exist - that's fine
        }
    }
}
