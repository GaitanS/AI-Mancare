import { NextResponse } from 'next/server';
import { clearTokenCookie } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    await clearTokenCookie();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', { error }, 'AdminAuth');
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
