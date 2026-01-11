import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { logger } from '@/lib/logger';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    const log = logger.child('AdminKillScript');

    // Rate limit to prevent abuse
    const rateLimitResult = await withRateLimit({
        limit: 10,
        windowMs: RateLimitPresets.strict.windowMs,
        keyPrefix: 'admin-kill',
    })(req);

    if (rateLimitResult) return rateLimitResult;

    try {
        const body = await req.json();
        const { script } = body;

        // Whitelist allowed scripts to kill
        const allowedScripts: Record<string, string> = {
            'products': 'product-extractor',
            'catalogs': 'catalog-scraper',
            'recipes': 'batch-recipe-generator',
            'images': 'image-generator'
        };

        if (!script || !allowedScripts[script]) {
            return NextResponse.json({ error: 'Invalid script name' }, { status: 400 });
        }

        const processName = allowedScripts[script];

        // Command to kill the specific node process
        // We use pkill -f to match the command line arguments
        const command = `pkill -f "${processName}"`;

        log.info(`Killing script: ${script} (cmd: ${command})`);

        return new Promise<NextResponse>((resolve) => {
            exec(command, (error, stdout, stderr) => {
                // pkill returns exit code 1 if no process found, which is fine
                // we treat "process not found" as "already stopped" success for UI purposes

                if (error && error.code !== 1) {
                    log.error('Failed to kill process', error);
                    resolve(NextResponse.json({
                        success: false,
                        message: `Failed to stop script: ${error.message}`
                    }, { status: 500 }));
                    return;
                }

                log.info('Script stopped successfully');
                resolve(NextResponse.json({
                    success: true,
                    message: 'Script stopped successfully'
                }));
            });
        });

    } catch (error: unknown) {
        console.error('Failed to kill script:', error);
        return NextResponse.json({
            error: 'Internal Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
