import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit-logger';

// Default schedules - used as fallback when DB is not available
const DEFAULT_SCHEDULES = [
    { id: '1', taskName: 'catalogs', enabled: true, dayOfWeek: 1, hour: 5, minute: 0 },  // Monday 5:00 - Download catalog images
    { id: '2', taskName: 'products', enabled: true, dayOfWeek: 1, hour: 6, minute: 0 },  // Monday 6:00 - Extract products from images
    { id: '3', taskName: 'recipes', enabled: true, dayOfWeek: 1, hour: 8, minute: 0 },   // Monday 8:00 - Generate recipes
    { id: '4', taskName: 'images', enabled: true, dayOfWeek: 1, hour: 10, minute: 0 },   // Monday 10:00 - Generate images
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
                        dayOfWeek: s.dayOfWeek,
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

/**
 * POST /api/admin/schedules - Update a schedule config
 * Body: { taskName: string, enabled?: boolean, dayOfWeek?: number, hour?: number, minute?: number }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { taskName, enabled, dayOfWeek, hour, minute } = body;

        if (!taskName) {
            return NextResponse.json({ error: 'taskName is required' }, { status: 400 });
        }

        try {
            const updateData: Record<string, unknown> = {};
            if (typeof enabled === 'boolean') updateData.enabled = enabled;
            if (typeof dayOfWeek === 'number') updateData.dayOfWeek = dayOfWeek;
            if (typeof hour === 'number') updateData.hour = hour;
            if (typeof minute === 'number') updateData.minute = minute;

            const schedule = await prisma.scheduleConfig.upsert({
                where: { taskName },
                update: updateData,
                create: {
                    taskName,
                    enabled: enabled ?? true,
                    dayOfWeek: dayOfWeek ?? 1,
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
            // Return success anyway - UI will work, changes just won't persist
            return NextResponse.json({
                success: true,
                message: `Schedule "${taskName}" updated (not persisted - DB unavailable)`,
                schedule: { taskName, enabled, dayOfWeek, hour, minute },
                _fallback: true
            });
        }
    } catch (error: unknown) {
        console.error('Failed to update schedule:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
