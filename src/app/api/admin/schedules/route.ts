import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default schedules if none exist
const DEFAULT_SCHEDULES = [
    { taskName: 'scraper', enabled: true, dayOfWeek: 1, hour: 6, minute: 0 },
    { taskName: 'recipes', enabled: true, dayOfWeek: 1, hour: 8, minute: 0 },
    { taskName: 'images', enabled: false, dayOfWeek: 1, hour: 10, minute: 0 },
];

/**
 * GET /api/admin/schedules - Get all schedule configs
 */
export async function GET() {
    try {
        let schedules = await prisma.scheduleConfig.findMany({
            orderBy: { taskName: 'asc' },
        });

        // If no schedules exist, create defaults
        if (schedules.length === 0) {
            try {
                await prisma.scheduleConfig.createMany({
                    data: DEFAULT_SCHEDULES,
                });
                schedules = await prisma.scheduleConfig.findMany({
                    orderBy: { taskName: 'asc' },
                });
            } catch {
                // Table might not exist yet, return defaults
                return NextResponse.json({ schedules: DEFAULT_SCHEDULES });
            }
        }

        return NextResponse.json({ schedules });
    } catch (error: unknown) {
        console.error('Failed to fetch schedules:', error);
        // Fallback: return default schedules if DB fails (table doesn't exist)
        return NextResponse.json({
            schedules: DEFAULT_SCHEDULES,
            _fallback: true
        });
    }
}

/**
 * POST /api/admin/schedules - Update a schedule config
 * Body: { taskName: string, enabled?: boolean, dayOfWeek?: number, hour?: number, minute?: number }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { taskName, enabled, dayOfWeek, hour, minute } = body;

        if (!taskName) {
            return NextResponse.json({ error: 'taskName is required' }, { status: 400 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (typeof enabled === 'boolean') updateData.enabled = enabled;
        if (typeof dayOfWeek === 'number') updateData.dayOfWeek = dayOfWeek;
        if (typeof hour === 'number') updateData.hour = hour;
        if (typeof minute === 'number') updateData.minute = minute;

        // Upsert the schedule
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

        return NextResponse.json({
            success: true,
            message: `Schedule "${taskName}" updated`,
            schedule
        });
    } catch (error: unknown) {
        console.error('Failed to update schedule:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
