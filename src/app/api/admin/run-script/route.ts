import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { script } = body;

        switch (script) {
            case 'scrape':
                // Scraper uses axios+cheerio, no Puppeteer needed!
                try {
                    const scriptPath = path.join(process.cwd(), 'scripts', 'cron-scraper.js');

                    // Run in background
                    const child = spawn('node', [scriptPath], {
                        detached: true,
                        stdio: 'ignore',
                        cwd: process.cwd(),
                    });
                    child.unref();

                    return NextResponse.json({
                        success: true,
                        message: '🕷️ Scraper started in background! Check database in a few minutes.',
                    });
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                    return NextResponse.json({
                        success: false,
                        message: `Scraper failed: ${errorMessage}`,
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
