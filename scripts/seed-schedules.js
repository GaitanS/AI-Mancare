#!/usr/bin/env node

/**
 * Seed Schedule Configs - Populates the ScheduleConfig table
 */

require('dotenv').config({ path: '.env.production', override: false });
require('dotenv').config({ path: '.env', override: false });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSchedules() {
    console.log('Seeding schedule configurations...');

    const configs = [
        {
            taskName: 'catalogs',
            enabled: true,
            dayOfWeek: 1,  // Monday
            hour: 5,
            minute: 0
        },
        {
            taskName: 'products',
            enabled: true,
            dayOfWeek: 1,  // Monday
            hour: 6,
            minute: 0
        },
        {
            taskName: 'recipes',
            enabled: true,
            dayOfWeek: 1,  // Monday
            hour: 7,
            minute: 0
        },
        {
            taskName: 'images',
            enabled: true,
            dayOfWeek: 1,  // Monday
            hour: 8,
            minute: 0
        },
        {
            taskName: 'cleanup',
            enabled: true,
            dayOfWeek: 0,  // Sunday
            hour: 3,
            minute: 0
        }
    ];

    for (const cfg of configs) {
        try {
            const result = await prisma.scheduleConfig.upsert({
                where: { taskName: cfg.taskName },
                update: {
                    enabled: cfg.enabled,
                    dayOfWeek: cfg.dayOfWeek,
                    hour: cfg.hour,
                    minute: cfg.minute
                },
                create: cfg
            });
            console.log(`✅ ${cfg.taskName}: Day ${cfg.dayOfWeek}, ${cfg.hour}:${String(cfg.minute).padStart(2, '0')}`);
        } catch (error) {
            console.error(`❌ Failed to create ${cfg.taskName}:`, error.message);
        }
    }

    console.log('\n--- Current Schedule Configs ---');
    const all = await prisma.scheduleConfig.findMany();
    console.table(all.map(c => ({
        Task: c.taskName,
        Enabled: c.enabled ? '✅' : '❌',
        Day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][c.dayOfWeek],
        Time: `${c.hour}:${String(c.minute).padStart(2, '0')}`,
        LastRun: c.lastRun ? c.lastRun.toISOString() : 'Never'
    })));

    await prisma.$disconnect();
}

seedSchedules()
    .then(() => {
        console.log('\n✅ Seed completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    });
