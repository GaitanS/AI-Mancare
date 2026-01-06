import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'site-config.json');

// GET - Read site config
export async function GET() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading site config:', error);
        return NextResponse.json(
            { error: 'Failed to read site configuration' },
            { status: 500 }
        );
    }
}

// POST - Update site config
export async function POST(request: NextRequest) {
    try {
        const updates = await request.json();

        // Read current config
        let currentConfig = {};
        try {
            const data = await fs.readFile(CONFIG_PATH, 'utf-8');
            currentConfig = JSON.parse(data);
        } catch {
            // File doesn't exist, start fresh
        }

        // Merge updates
        const newConfig = {
            ...currentConfig,
            ...updates,
        };

        // Add lastUpdated timestamp
        if (updates.despreNoi) {
            newConfig.despreNoi = { ...newConfig.despreNoi, lastUpdated: new Date().toISOString().split('T')[0] };
        }
        if (updates.contact) {
            newConfig.contact = { ...newConfig.contact, lastUpdated: new Date().toISOString().split('T')[0] };
        }

        // Write back
        await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');

        return NextResponse.json({
            success: true,
            message: 'Configuration updated successfully',
            data: newConfig
        });
    } catch (error) {
        console.error('Error updating site config:', error);
        return NextResponse.json(
            { error: 'Failed to update site configuration' },
            { status: 500 }
        );
    }
}
