/**
 * API Route: Get product extractor status
 * Reads the status file written by the product extractor for admin UI display
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const statusFile = path.join(process.cwd(), 'logs', 'product-extractor-status.json');

        if (!fs.existsSync(statusFile)) {
            return NextResponse.json({
                success: true,
                status: null,
                message: 'No product extraction has run yet'
            });
        }

        const content = fs.readFileSync(statusFile, 'utf-8');
        const status = JSON.parse(content);

        return NextResponse.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('Error reading product extractor status:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to read status' },
            { status: 500 }
        );
    }
}
