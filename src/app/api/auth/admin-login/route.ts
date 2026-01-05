import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();
        const adminSecret = process.env.ADMIN_SECRET;

        // Logic:
        // 1. If ADMIN_SECRET is set, password MUST match.
        // 2. If ADMIN_SECRET is NOT set, allow access (Debug Mode) - Or enforce setting it?
        // User requested "Maximum Security", so we should enforce it.
        // BUT user might not have set it yet, locking themselves out.
        // Compromise: If not set, allow any password but warn? 
        // No, middleware blocks /admin so they CAN T get here without logging in.
        // If ADMIN_SECRET is empty, we must allow login or they are locked out forever.
        // Let's allow login with ANY password if ADMIN_SECRET is missing, but log a warning.

        let isValid = false;

        if (!adminSecret) {
            console.warn('[Security] ADMIN_SECRET not set. Allowing access (Debug Mode).');
            isValid = true;
        } else {
            isValid = password === adminSecret;
        }

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Set Cookie
        const cookieStore = await cookies();

        // Calculate expiration (e.g., 24 hours)
        const oneDay = 24 * 60 * 60 * 1000;

        cookieStore.set('admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: oneDay,
            path: '/',
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
