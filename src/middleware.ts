/**
 * Next.js Middleware - Security, Rate Limiting & Admin Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecretRaw = process.env.JWT_SECRET;
if (!jwtSecretRaw) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretRaw || '');
const TOKEN_NAME = 'admin_token';

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<boolean> {
  if (!jwtSecretRaw) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Admin Page Protection (redirect to login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
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
    const isValidApiKey = process.env.ADMIN_SECRET && authHeader === `Bearer ${process.env.ADMIN_SECRET}`;

    if (!token && !isValidApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (token && !isValidApiKey) {
      const isValid = await verifyToken(token);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }
  }

  // 3. Security headers
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // 4. Block known bad user agents (except for API routes)
  const userAgent = request.headers.get('user-agent') || '';
  const blockedAgents = ['curl', 'wget', 'python-requests', 'scrapy'];

  const isBlockedAgent = blockedAgents.some(agent =>
    userAgent.toLowerCase().includes(agent)
  );

  if (isBlockedAgent && !pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // 5. Prevent directory traversal
  if (pathname.includes('..') || pathname.includes('//')) {
    return NextResponse.json(
      { error: 'Invalid path' },
      { status: 400 }
    );
  }

  return response;
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
