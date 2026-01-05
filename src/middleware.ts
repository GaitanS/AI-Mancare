/**
 * Next.js Middleware - Security & Rate Limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Admin Security Check (Highest Priority)
  // Protect /admin routes (except login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminSession = request.cookies.get('admin_session');

    if (!adminSession) {
      // Redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // Protect /api/admin routes
  if (pathname.startsWith('/api/admin')) {
    const adminSession = request.cookies.get('admin_session');

    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Security headers (suplimentar la next.config.js)
  const response = NextResponse.next();

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Rate limiting pentru API routes
  if (pathname.startsWith('/api/')) {
    // Determine rate limit config based on endpoint
    let rateLimitConfig: { maxRequests: number; windowSeconds: number } = RATE_LIMITS.api;

    if (pathname.includes('/search')) {
      rateLimitConfig = RATE_LIMITS.search;
    } else if (pathname.includes('/generate') || pathname.includes('/ai')) {
      rateLimitConfig = RATE_LIMITS.aiGeneration;
    } else if (pathname.includes('/auth') || pathname.includes('/login')) {
      rateLimitConfig = RATE_LIMITS.auth;
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(request, rateLimitConfig);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
  }

  // Block known bad user agents
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

  // Prevent directory traversal
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
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
