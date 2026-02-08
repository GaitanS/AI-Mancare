import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken, setTokenCookie, verifyRequestOrigin } from '@/lib/admin-auth';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// Rate limit: 5 attempts per 15 minutes (strict preset)
const checkRateLimit = withRateLimit({
  ...RateLimitPresets.strict,
  keyPrefix: 'admin-login',
});

export async function POST(request: NextRequest) {
  // CSRF check - verify request comes from same origin
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await createToken();

    // Set cookie
    await setTokenCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
    });
  } catch (error) {
    logger.error('Login error', { error }, 'AdminAuth');
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
