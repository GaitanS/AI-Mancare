import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { logger } from '@/lib/logger';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { verifyRequestOrigin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
    const log = logger.child('AdminKillScript');

    // CSRF protection
    if (!verifyRequestOrigin(req)) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

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

        log.info(`Killing script: ${script} (process: ${processName})`);

        return new Promise<NextResponse>((resolve) => {
            // Use execFile instead of exec to prevent shell injection
            // execFile does not spawn a shell, so metacharacters are harmless
            execFile('pkill', ['-f', processName], (error, stdout, stderr) => {
                // pkill returns exit code 1 if no process found, which is fine
                // we treat "process not found" as "already stopped" success for UI purposes

                if (error && error.code !== 1) {
                    log.error('Failed to kill process', error);
                    resolve(NextResponse.json({
                        success: false,
                        message: 'Failed to stop script. Check server logs for details.'
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
        log.error('Failed to kill script', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({
            error: 'An internal error occurred',
        }, { status: 500 });
    }
}
