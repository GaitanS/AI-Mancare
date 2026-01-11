/**
 * API Route: Stop running scripts
 * Resets status files to stop the UI from showing running state
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STATUS_FILES: Record<string, string> = {
    'catalog-scraper': path.join(process.cwd(), 'logs', 'catalog-scraper-status.json'),
    'product-extractor': path.join(process.cwd(), 'logs', 'product-extractor-status.json'),
    'recipe-generator': path.join(process.cwd(), 'storage', 'recipes-status.json'),
    'image-generator': path.join(process.cwd(), 'storage', 'images-status.json'),
};

export async function POST(request: NextRequest) {
    try {
        const { script } = await request.json();

        if (!script || !STATUS_FILES[script]) {
            return NextResponse.json(
                { success: false, error: 'Invalid script name' },
                { status: 400 }
            );
        }

        const statusFile = STATUS_FILES[script];

        if (fs.existsSync(statusFile)) {
            const content = fs.readFileSync(statusFile, 'utf-8');
            const status = JSON.parse(content);

            // Set running to false to stop the UI
            status.running = false;
            status.stoppedAt = new Date().toISOString();
            status.stoppedByUser = true;

            fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));

            console.log(`[STOP-SCRIPT] Stopped ${script}`);

            return NextResponse.json({
                success: true,
                message: `Script ${script} stopped`
            });
        }

        return NextResponse.json({
            success: true,
            message: 'No status file found, nothing to stop'
        });

    } catch (error) {
        console.error('Error stopping script:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to stop script' },
            { status: 500 }
        );
    }
}
