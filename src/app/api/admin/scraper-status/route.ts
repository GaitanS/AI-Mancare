/**
 * Scraper Status API
 * Returns current scraper progress for admin dashboard
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const statusPath = path.join(process.cwd(), 'storage', 'scraper-status.json');

        try {
            const content = await fs.readFile(statusPath, 'utf-8');
            const status = JSON.parse(content);
            return NextResponse.json(status);
        } catch (e) {
            // File doesn't exist or is invalid - no scraper running
            return NextResponse.json({
                running: false,
                complete: false,
                message: 'Nicio sesiune activă'
            });
        }
    } catch (error) {
        logger.error('Failed to get scraper status', { error }, 'AdminStatus');
        return NextResponse.json({
            running: false,
            error: 'Failed to read scraper status'
        });
    }
}
