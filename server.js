const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// DEBUG LOGGING START
const logFile = path.join(__dirname, 'debug_start.txt');

function log(message) {
    const msg = `[${new Date().toISOString()}] ${message}\n`;
    try {
        fs.appendFileSync(logFile, msg);
    } catch (e) {
        // ignore
    }
}

log('Server script loaded. Initializing...');

process.on('uncaughtException', (err) => {
    log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`UNHANDLED REJECTION: ${reason}`);
});
// DEBUG LOGGING END

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

log(`Configuration: ENV=${process.env.NODE_ENV}, PORT=${port}, HOSTNAME=${hostname}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    log('Next.js app prepared. Starting HTTP server...');

    createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            const { pathname, query } = parsedUrl;

            if (pathname === '/a') {
                await app.render(req, res, '/a', query);
            } else if (pathname === '/b') {
                await app.render(req, res, '/b', query);
            } else {
                await handle(req, res, parsedUrl);
            }
        } catch (err) {
            log(`Request Error: ${err.message}`);
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    })
        .once('error', (err) => {
            log(`Server Error: ${err.message}`);
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            log(`> Ready on http://${hostname}:${port}`);
            console.log(`> Ready on http://${hostname}:${port}`);
        });
}).catch((err) => {
    log(`Setup Promise Error: ${err.message}\n${err.stack}`);
    console.error('[Server] Setup failed:', err);
    process.exit(1);
});
