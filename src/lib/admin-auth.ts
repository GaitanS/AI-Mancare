import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

// Validate required environment variables
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is required and must be at least 32 characters'
    );
  }
  return new TextEncoder().encode(secret);
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      'ADMIN_PASSWORD environment variable is required and must be at least 8 characters'
    );
  }
  return password;
}

const TOKEN_NAME = 'admin_token';
const TOKEN_EXPIRY = '24h';

export interface AdminPayload {
  authenticated: true;
  iat: number;
  exp: number;
}

/**
 * Verify admin password using timing-safe comparison with fixed 256-byte buffers
 */
export function verifyPassword(inputPassword: string, storedHash?: string): boolean {
  try {
    const adminPassword = storedHash ?? getAdminPassword();

    // Use fixed-length 256-byte buffers for constant-time comparison
    const maxLen = 256;
    const paddedInput = Buffer.alloc(maxLen);
    const paddedStored = Buffer.alloc(maxLen);
    Buffer.from(inputPassword).copy(paddedInput);
    Buffer.from(adminPassword).copy(paddedStored);

    const lengthMatch = inputPassword.length === adminPassword.length;
    const contentMatch = timingSafeEqual(paddedInput, paddedStored);

    return lengthMatch && contentMatch;
  } catch {
    return false;
  }
}

/**
 * Create a JWT token for admin session
 */
export async function createToken(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());

  return token;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.authenticated === true && payload.iat && payload.exp) {
      return payload as unknown as AdminPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get token from cookies
 */
export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME);
  return token?.value || null;
}

/**
 * Set token in cookies (httpOnly, secure in production)
 */
export async function setTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // Strict to prevent CSRF (was 'lax')
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',           // Must cover /admin and /api/admin paths
  });
}

/**
 * Clear token cookie
 */
export async function clearTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

/**
 * Check if current request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getTokenFromCookies();
  if (!token) return false;

  const payload = await verifyToken(token);
  return payload !== null;
}

/**
 * Verify token from request (for API routes)
 */
export async function verifyTokenFromRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(TOKEN_NAME)?.value;
  if (!token) return false;

  const payload = await verifyToken(token);
  return payload !== null;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Redirect to login page
 */
export function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * Verify request origin for CSRF protection on mutation routes (POST/PUT/DELETE).
 * Compares the Origin header against the Host header to ensure
 * requests originate from the same site.
 */
export function verifyRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
