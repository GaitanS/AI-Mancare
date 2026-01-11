import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
    try {
        const storagePath = path.join(process.cwd(), 'storage');
        const statusPath = path.join(storagePath, 'images-status.json');

        // Check if file exists
        try {
            await fs.access(statusPath);
        } catch {
            // If starting initially or file cleaned up
            return NextResponse.json({
                running: false,
                message: 'Ready to generate images'
            });
        }

        const data = await fs.readFile(statusPath, 'utf8');
        const status = JSON.parse(data);

        return NextResponse.json(status);
    } catch (e: unknown) {
        console.error('Failed to read image status', e);
        return NextResponse.json({
            running: false,
            error: 'Failed to read status'
        });
    }
}
