import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit-logger';
import { verifyRequestOrigin } from '@/lib/admin-auth';

// Default schedules - used as fallback when DB is not available
const DEFAULT_SCHEDULES = [
    { id: '1', taskName: 'catalogs', enabled: true, frequency: 'weekly', dayOfWeek: 1, daysOfWeek: null, hour: 5, minute: 0 },
    { id: '2', taskName: 'products', enabled: true, frequency: 'weekly', dayOfWeek: 1, daysOfWeek: null, hour: 6, minute: 0 },
    { id: '3', taskName: 'recipes', enabled: true, frequency: 'weekly', dayOfWeek: 1, daysOfWeek: null, hour: 8, minute: 0 },
    { id: '4', taskName: 'images', enabled: true, frequency: 'weekly', dayOfWeek: 1, daysOfWeek: null, hour: 10, minute: 0 },
    { id: '5', taskName: 'cleanup', enabled: true, frequency: 'weekly', dayOfWeek: 0, daysOfWeek: null, hour: 3, minute: 0 },
];

/**
 * GET /api/admin/schedules - Get all schedule configs
 * Uses database if available, falls back to defaults
 */
export async function GET() {
    try {
        let schedules = await prisma.scheduleConfig.findMany({
            orderBy: { taskName: 'asc' },
        });

        // If no schedules exist, try to create defaults
        if (schedules.length === 0) {
            try {
                await prisma.scheduleConfig.createMany({
                    data: DEFAULT_SCHEDULES.map(s => ({
                        taskName: s.taskName,
                        enabled: s.enabled,
                        frequency: s.frequency,
                        dayOfWeek: s.dayOfWeek,
                        daysOfWeek: s.daysOfWeek,
                        hour: s.hour,
                        minute: s.minute,
                    })),
                });
                schedules = await prisma.scheduleConfig.findMany({
                    orderBy: { taskName: 'asc' },
                });
            } catch {
                // Table doesn't exist, return defaults
                return NextResponse.json({ schedules: DEFAULT_SCHEDULES });
            }
        }

        return NextResponse.json({ schedules });
    } catch (dbError) {
        console.error('DB error, using fallback:', dbError);
        return NextResponse.json({ schedules: DEFAULT_SCHEDULES, _fallback: true });
    }
}

const VALID_TASKS = ['catalogs', 'products', 'recipes', 'images', 'cleanup'];
const VALID_FREQUENCIES = ['daily', 'weekly', 'custom'];

/**
 * POST /api/admin/schedules - Update a schedule config
 * Body: { taskName, enabled?, frequency?, dayOfWeek?, daysOfWeek?, hour?, minute? }
 */
export async function POST(req: NextRequest) {
    // CSRF protection
    if (!verifyRequestOrigin(req)) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { taskName, enabled, frequency, dayOfWeek, daysOfWeek, hour, minute } = body;

        // Validate taskName against allowlist
        if (!taskName || !VALID_TASKS.includes(taskName)) {
            return NextResponse.json({ error: 'Invalid taskName' }, { status: 400 });
        }

        // Validate frequency
        if (frequency !== undefined && !VALID_FREQUENCIES.includes(frequency)) {
            return NextResponse.json({ error: 'frequency must be daily, weekly, or custom' }, { status: 400 });
        }

        // Validate numeric bounds
        if (hour !== undefined && (!Number.isInteger(hour) || hour < 0 || hour > 23)) {
            return NextResponse.json({ error: 'hour must be 0-23' }, { status: 400 });
        }
        if (minute !== undefined && (!Number.isInteger(minute) || minute < 0 || minute > 59)) {
            return NextResponse.json({ error: 'minute must be 0-59' }, { status: 400 });
        }
        if (dayOfWeek !== undefined && (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)) {
            return NextResponse.json({ error: 'dayOfWeek must be 0-6' }, { status: 400 });
        }

        // Validate daysOfWeek JSON structure
        if (daysOfWeek !== undefined && daysOfWeek !== null) {
            if (typeof daysOfWeek !== 'string') {
                return NextResponse.json({ error: 'daysOfWeek must be a JSON string or null' }, { status: 400 });
            }
            try {
                const parsed = JSON.parse(daysOfWeek);
                if (!Array.isArray(parsed) || !parsed.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)) {
                    return NextResponse.json({ error: 'daysOfWeek must be a JSON array of integers 0-6' }, { status: 400 });
                }
            } catch {
                return NextResponse.json({ error: 'daysOfWeek must be valid JSON' }, { status: 400 });
            }
        }

        try {
            const updateData: Record<string, unknown> = {};
            if (typeof enabled === 'boolean') updateData.enabled = enabled;
            if (typeof frequency === 'string') updateData.frequency = frequency;
            if (typeof dayOfWeek === 'number') updateData.dayOfWeek = dayOfWeek;
            if (typeof daysOfWeek === 'string' || daysOfWeek === null) updateData.daysOfWeek = daysOfWeek;
            if (typeof hour === 'number') updateData.hour = hour;
            if (typeof minute === 'number') updateData.minute = minute;

            const schedule = await prisma.scheduleConfig.upsert({
                where: { taskName },
                update: updateData,
                create: {
                    taskName,
                    enabled: enabled ?? true,
                    frequency: frequency ?? 'weekly',
                    dayOfWeek: dayOfWeek ?? 1,
                    daysOfWeek: daysOfWeek ?? null,
                    hour: hour ?? 6,
                    minute: minute ?? 0,
                },
            });

            await logAudit({
              action: typeof enabled === 'boolean' ? 'TOGGLE' : 'UPDATE',
              entity: 'schedule',
              entityId: schedule.id,
              details: `Updated schedule: ${taskName}${typeof enabled === 'boolean' ? ` (${enabled ? 'enabled' : 'disabled'})` : ''}`,
              request: req,
            });

            return NextResponse.json({
                success: true,
                message: `Schedule "${taskName}" updated`,
                schedule
            });
        } catch (dbError) {
            console.error('DB error on POST:', dbError);
            return NextResponse.json({
                error: 'Database unavailable - changes not saved',
                _fallback: true
            }, { status: 503 });
        }
    } catch (error: unknown) {
        console.error('Failed to update schedule:', error);
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }
}
