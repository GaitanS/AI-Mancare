import { NextResponse } from 'next/server';

/**
 * Run Script API - Compatible with Hostinger Cloud
 * 
 * NOTE: Hostinger Cloud does NOT support:
 * - child_process.spawn() - returns undefined PID
 * - Puppeteer/Chromium - no browser available
 * 
 * For scraping, you have two options:
 * 1. Run scripts locally and sync data to production DB
 * 2. Use a cloud function service (AWS Lambda, Vercel Functions, etc.)
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { script } = body;

        // Check if running on production (Hostinger)
        const isProduction = process.env.NODE_ENV === 'production' ||
            process.env.HOSTNAME === '0.0.0.0';

        if (isProduction) {
            // Production mode - can't run scripts that require child_process or Puppeteer
            return NextResponse.json({
                success: false,
                error: 'Server limitation',
                message: `⚠️ Script "${script}" nu poate rula pe server. Hostinger Cloud nu suportă Puppeteer.`,
                details: 'Rulează scripturile local cu: npm run scrape sau npm run generate-recipes',
                workaround: [
                    '1. Conectează-te la baza de date de producție local',
                    '2. Rulează: cd "AI Mancare" && node scripts/cron-scraper.js',
                    '3. Datele vor fi actualizate automat în producție'
                ]
            }, { status: 501 });
        }

        // Development mode - can try to run (still may fail without Puppeteer setup)
        // Instead of spawn, we import and run the function directly
        let result;

        switch (script) {
            case 'scrape':
                return NextResponse.json({
                    success: false,
                    message: 'Scraping necesită Puppeteer. Rulează local: node scripts/cron-scraper.js',
                }, { status: 501 });

            case 'recipes':
                // Recipe generation might work without Puppeteer
                try {
                    // Dynamic import the function
                    const { generateRecipes } = await import('@/lib/ai/recipe-generator');

                    // Run in background-like fashion (without blocking response)
                    // Note: This will still timeout if it takes too long
                    generateRecipes().catch(console.error);

                    return NextResponse.json({
                        success: true,
                        message: '✨ Recipe generation started! Check database in a few minutes.',
                    });
                } catch (e: any) {
                    return NextResponse.json({
                        success: false,
                        message: `Recipe generation failed: ${e.message}`,
                    }, { status: 500 });
                }

            default:
                return NextResponse.json({ error: 'Invalid script' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Failed to run script:', error);
        return NextResponse.json({
            error: 'Internal Error',
            details: error.message
        }, { status: 500 });
    }
}
