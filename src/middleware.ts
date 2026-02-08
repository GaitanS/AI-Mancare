/**
 * Next.js Middleware - Security, Rate Limiting & Admin Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecretRaw = process.env.JWT_SECRET;
if (!jwtSecretRaw) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set');
}
const JWT_SECRET = jwtSecretRaw ? new TextEncoder().encode(jwtSecretRaw) : null;
const TOKEN_NAME = 'admin_token';

/**
 * Add security headers to ALL responses
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

/** Paths that should never be served - prevent API key / source exposure */
const BLOCKED_PATHS = ['/.env', '/api/env', '/.git', '/node_modules'];

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Block sensitive paths to prevent API key / source exposure
  if (BLOCKED_PATHS.some(p => pathname.startsWith(p))) {
    return addSecurityHeaders(new NextResponse('Not Found', { status: 404 }));
  }

  // 0b. Reject oversized request bodies (1MB limit for API routes)
  const contentLength = request.headers.get('content-length');
  if (contentLength && pathname.startsWith('/api/')) {
    const bodySize = parseInt(contentLength, 10);
    if (!isNaN(bodySize) && bodySize > 1_048_576) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Request body too large' }, { status: 413 })
      );
    }
  }

  // 1. Admin Page Protection (redirect to login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!jwtSecretRaw) {
      // No JWT secret = no admin access in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    }

    const token = request.cookies.get(TOKEN_NAME)?.value;

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    const isValid = await verifyToken(token);
    if (!isValid) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('redirect', pathname);
      // Clear invalid token
      const response = NextResponse.redirect(url);
      response.cookies.delete(TOKEN_NAME);
      return response;
    }
  }

  // 2. Admin API Protection (return 401)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const token = request.cookies.get(TOKEN_NAME)?.value;
    const authHeader = request.headers.get('authorization');

    // Allow access if:
    // 1. Valid JWT Cookie (Browser)
    // 2. Valid Bearer Token (Cron Job / API)
    let isValidApiKey = false;
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && adminSecret.length >= 16 && authHeader?.startsWith('Bearer ')) {
      const provided = authHeader.slice(7);
      // Constant-time comparison to prevent timing attacks
      if (provided.length === adminSecret.length) {
        let mismatch = 0;
        for (let i = 0; i < adminSecret.length; i++) {
          mismatch |= adminSecret.charCodeAt(i) ^ provided.charCodeAt(i);
        }
        isValidApiKey = mismatch === 0;
      }
    }

    if (!token && !isValidApiKey) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    if (token && !isValidApiKey) {
      const isValid = await verifyToken(token);
      if (!isValid) {
        return addSecurityHeaders(
          NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
        );
      }
    }
  }

  // 3. Block known bad user agents (except for API routes)
  const userAgent = request.headers.get('user-agent') || '';
  const blockedAgents = ['curl', 'wget', 'python-requests', 'scrapy'];

  const isBlockedAgent = blockedAgents.some(agent =>
    userAgent.toLowerCase().includes(agent)
  );

  if (isBlockedAgent && !pathname.startsWith('/api/')) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Access denied' }, { status: 403 })
    );
  }

  // 4. Prevent directory traversal
  if (pathname.includes('..') || pathname.includes('//')) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    );
  }

  // 5. Apply security headers to all responses
  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (static assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|storage|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ico|json)$).*)',
  ],
};
