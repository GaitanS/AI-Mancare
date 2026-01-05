import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { script } = body;

        // Basic Security Check
        // This route is protected by src/middleware.ts which checks for 'admin_session' cookie.
        // Double check here if needed, but middleware is primarily responsible.
        // For depth:
        // const cookieStore = cookies();
        // if (!cookieStore.get('admin_session')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Proceed with script execution

        let scriptPath = '';

        switch (script) {
            case 'scrape':
                scriptPath = path.join(process.cwd(), 'scripts', 'cron-scraper.js');
                break;
            case 'recipes':
                scriptPath = path.join(process.cwd(), 'scripts', 'cron-recipe-generator.js');
                break;
            case 'process-pdf':
                scriptPath = path.join(process.cwd(), 'scripts', 'catalog-processor.js');
                break;
            default:
                return NextResponse.json({ error: 'Invalid script' }, { status: 400 });
        }

        console.log(`[Admin] Spawning script: ${scriptPath}`);

        // Spawn detached process
        const child = spawn('node', [scriptPath], {
            detached: true,
            stdio: 'ignore', // Ignore stdio to allow unref
            cwd: process.cwd(),
            env: { ...process.env }, // Pass env vars
        });

        child.unref(); // Allow parent to exit independently

        return NextResponse.json({
            success: true,
            message: `Started ${script} in background (PID: ${child.pid})`
        });

    } catch (error) {
        console.error('Failed to run script:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
