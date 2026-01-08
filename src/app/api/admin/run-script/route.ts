import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { script } = body;

        switch (script) {
            case 'products':
                // Product extractor - extracts products from local catalog images using AI/OCR
                try {
                    const scriptPath = path.join(process.cwd(), 'scripts', 'product-extractor.js');

                    // Run in background
                    const child = spawn('node', [scriptPath], {
                        detached: true,
                        stdio: 'ignore',
                        cwd: process.cwd(),
                    });
                    child.unref();

                    return NextResponse.json({
                        success: true,
                        message: '📦 Product extractor started! Extracting products from catalog images using AI. Only processes NEW catalogs.',
                    });
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                    return NextResponse.json({
                        success: false,
                        message: `Product extractor failed: ${errorMessage}`,
                    }, { status: 500 });
                }

            case 'catalogs':
                // Catalog scraper v2 (downloads catalog images locally from cataloagedeoferte.ro)
                try {
                    const scriptPath = path.join(process.cwd(), 'scripts', 'catalog-scraper-v2.js');

                    // Run in background
                    const child = spawn('node', [scriptPath], {
                        detached: true,
                        stdio: 'ignore',
                        cwd: process.cwd(),
                    });
                    child.unref();

                    return NextResponse.json({
                        success: true,
                        message: '📚 Catalog scraper started! Downloads ~700 pages. Check /cataloage-digitale in 10-15 minutes.',
                    });
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                    return NextResponse.json({
                        success: false,
                        message: `Catalog scraper failed: ${errorMessage}`,
                    }, { status: 500 });
                }

            case 'recipes':
                // Recipe generation using OpenRouter/Gemini
                try {
                    const recipeGenerator = await import('@/lib/ai/recipe-generator');

                    // Run in background (without blocking response)
                    recipeGenerator.default.generateWeeklyRecipes(5).catch(console.error);

                    return NextResponse.json({
                        success: true,
                        message: '✨ Recipe generation started! Check database in a few minutes.',
                    });
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                    return NextResponse.json({
                        success: false,
                        message: `Recipe generation failed: ${errorMessage}`,
                    }, { status: 500 });
                }

            default:
                return NextResponse.json({ error: 'Invalid script' }, { status: 400 });
        }

    } catch (error: unknown) {
        console.error('Failed to run script:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
            error: 'Internal Error',
            details: errorMessage
        }, { status: 500 });
    }
}
