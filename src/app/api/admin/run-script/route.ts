import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/logger';
import { validateScriptName, ValidationError } from '@/lib/validation';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { verifyRequestOrigin } from '@/lib/admin-auth';

// Helper to create log file for script output
function createLogStream(scriptName: string) {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(logsDir, `${scriptName}-${timestamp}.log`);
    return fs.createWriteStream(logPath, { flags: 'a' });
}

export async function POST(req: NextRequest) {
    const log = logger.child('AdminRunScript');

    // CSRF protection
    if (!verifyRequestOrigin(req)) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // Apply rate limiting (max 5 script runs per 15 minutes)
    const rateLimitResult = await withRateLimit({
        limit: 5,
        windowMs: RateLimitPresets.strict.windowMs,
        keyPrefix: 'admin-script',
    })(req);

    if (rateLimitResult) {
        return rateLimitResult;
    }

    try {
        const body = await req.json();
        const { script } = body;

        // Validate script name to prevent command injection
        let validatedScript: string;
        try {
            validatedScript = validateScriptName(script);
        } catch (error) {
            if (error instanceof ValidationError) {
                log.warn('Invalid script name attempted', { script });
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
            throw error;
        }

        log.info(`Starting script: ${validatedScript}`);

        switch (validatedScript) {
            case 'products':
                // Product extractor - extracts products from local catalog images using AI/OCR
                try {
                    const scriptPath = path.join(process.cwd(), 'scripts', 'product-extractor.js');
                    const logStream = createLogStream('product-extractor');

                    // Run with proper logging
                    const child = spawn('node', [scriptPath], {
                        detached: true,
                        stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored, stdout and stderr piped
                        cwd: process.cwd(),
                        env: process.env, // Explicitly pass environment
                    });

                    // Capture stdout and stderr to log file
                    child.stdout?.pipe(logStream);
                    child.stderr?.pipe(logStream);

                    // Log errors
                    child.on('error', (error) => {
                        log.error('[Product Extractor] Spawn error', error);
                        logStream.write(`\n[ERROR] Spawn failed: ${error.message}\n`);
                        logStream.end();
                    });

                    // Log exit
                    child.on('exit', (code, signal) => {
                        log.info(`[Product Extractor] Exited`, { code, signal });
                        logStream.write(`\n[EXIT] Process exited with code ${code}\n`);
                        logStream.end();
                    });

                    child.unref();

                    log.info('Product extractor started successfully');
                    return NextResponse.json({
                        success: true,
                        message: '📦 Product extractor started! Extracting products from catalog images using AI. Check logs/ for output.',
                    });
                } catch (e: unknown) {
                    log.error('Product extractor failed to start', e instanceof Error ? e : new Error(String(e)));
                    return NextResponse.json({
                        success: false,
                        message: 'Product extractor failed to start. Check server logs for details.',
                    }, { status: 500 });
                }

            case 'catalogs':
                // Catalog scraper v2 (downloads catalog images locally from cataloagedeoferte.ro)
                try {
                    const scriptPath = path.join(process.cwd(), 'scripts', 'catalog-scraper-v2.js');
                    const logStream = createLogStream('catalog-scraper');

                    // Run with proper logging
                    const child = spawn('node', [scriptPath], {
                        detached: true,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        cwd: process.cwd(),
                        env: process.env,
                    });

                    child.stdout?.pipe(logStream);
                    child.stderr?.pipe(logStream);

                    child.on('error', (error) => {
                        console.error('[Catalog Scraper] Spawn error:', error);
                        logStream.write(`\n[ERROR] Spawn failed: ${error.message}\n`);
                        logStream.end();
                    });

                    child.on('exit', (code, signal) => {
                        console.log(`[Catalog Scraper] Exited with code ${code}, signal ${signal}`);
                        logStream.write(`\n[EXIT] Process exited with code ${code}\n`);
                        logStream.end();
                    });

                    child.unref();

                    return NextResponse.json({
                        success: true,
                        message: '📚 Catalog scraper started! Downloads ~700 pages. Check logs/ for output.',
                    });
                } catch (e: unknown) {
                    log.error('Catalog scraper failed to start', e instanceof Error ? e : new Error(String(e)));
                    return NextResponse.json({
                        success: false,
                        message: 'Catalog scraper failed to start. Check server logs for details.',
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
                        message: 'Recipe generation started! Check database in a few minutes.',
                    });
                } catch (e: unknown) {
                    log.error('Recipe generation failed to start', e instanceof Error ? e : new Error(String(e)));
                    return NextResponse.json({
                        success: false,
                        message: 'Recipe generation failed to start. Check server logs for details.',
                    }, { status: 500 });
                }

            case 'images':
                // Image generation using OpenRouter/Gemini
                try {
                    const scriptPath = path.join(process.cwd(), 'scripts', 'cron-image-generator.js');
                    const logStream = createLogStream('image-generator');

                    // Run with proper logging
                    const child = spawn('node', [scriptPath], {
                        detached: true,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        cwd: process.cwd(),
                        env: process.env,
                    });

                    child.stdout?.pipe(logStream);
                    child.stderr?.pipe(logStream);

                    child.on('error', (error) => {
                        console.error('[Image Generator] Spawn error:', error);
                        logStream.write(`\n[ERROR] Spawn failed: ${error.message}\n`);
                        logStream.end();
                    });

                    child.on('exit', (code, signal) => {
                        console.log(`[Image Generator] Exited with code ${code}, signal ${signal}`);
                        logStream.write(`\n[EXIT] Process exited with code ${code}\n`);
                        logStream.end();
                    });

                    child.unref();

                    return NextResponse.json({
                        success: true,
                        message: 'Image generator started! Generating images for recipes. Check logs/ for output.',
                    });
                } catch (e: unknown) {
                    log.error('Image generator failed to start', e instanceof Error ? e : new Error(String(e)));
                    return NextResponse.json({
                        success: false,
                        message: 'Image generation failed to start. Check server logs for details.',
                    }, { status: 500 });
                }

            default:
                return NextResponse.json({ error: 'Invalid script' }, { status: 400 });
        }

    } catch (error: unknown) {
        log.error('Failed to run script', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({
            error: 'An internal error occurred',
        }, { status: 500 });
    }
}
