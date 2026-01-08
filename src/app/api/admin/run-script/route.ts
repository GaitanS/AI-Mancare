import { NextResponse } from 'next/server';

/**
 * Run Script API - VPS Compatible
 * 
 * VPS supports child_process and Puppeteer (if installed)
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { script } = body;

        const isProduction = process.env.NODE_ENV === 'production';

        // In production, some scripts may still need to be run carefully
        if (isProduction && script === 'scrape') {
            return NextResponse.json({
                success: false,
                error: 'Use scheduled tasks',
                message: `⚠️ Script "${script}" should run as a cron job on VPS.`,
                details: 'Configure cron on VPS: crontab -e',
                workaround: [
                    '1. SSH to VPS: ssh root@185.224.139.191',
                    '2. Add cron: 0 6 * * 1 cd /var/www/catalogsmart.ro && node scripts/cron-scraper.js',
                    '3. Or run manually: node scripts/cron-scraper.js'
                ]
            }, { status: 501 });
        }

        // Development mode - can try to run (still may fail without Puppeteer setup)
        switch (script) {
            case 'scrape':
                return NextResponse.json({
                    success: false,
                    message: 'Scraping necesită Puppeteer. Rulează local: node scripts/cron-scraper.js',
                }, { status: 501 });

            case 'recipes':
                // Recipe generation might work without Puppeteer
                try {
                    // Dynamic import the module (uses default export)
                    const recipeGenerator = await import('@/lib/ai/recipe-generator');

                    // Run in background-like fashion (without blocking response)
                    // Note: This will still timeout if it takes too long
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
