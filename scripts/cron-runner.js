#!/usr/bin/env node

/**
 * Cron Runner - Executes scheduled tasks based on database configuration
 * 
 * Setup on VPS:
 * crontab -e
 * Add: * * * * * cd /var/www/catalogsmart.ro && node scripts/cron-runner.js >> /var/log/catalogsmart-cron.log 2>&1
 * 
 * This script runs every minute and checks if any task should be executed
 * based on the schedule stored in the database.
 */

require('dotenv').config({ path: '.env.production', override: false });
require('dotenv').config({ path: '.env', override: false });

const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const LOGS_DIR = path.join(process.cwd(), 'logs');

// Task script mapping
const TASK_SCRIPTS = {
    catalogs: 'catalog-scraper-v2.js',
    products: 'product-extractor.js',
    recipes: 'cron-recipe-generator.js',
    images: 'cron-image-generator.js',
    cleanup: 'catalog-cleanup.js'
};

function log(message) {
    const timestamp = new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
    console.log(`[${timestamp}] ${message}`);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Get current time in Romania timezone (auto-detects summer/winter time)
function getRomaniaTime() {
    const now = new Date();
    // Use Intl to get Romania local time correctly (handles DST automatically)
    const options = { timeZone: 'Europe/Bucharest', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', {
        ...options,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric'
    });

    const parts = formatter.formatToParts(now);
    const weekdayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };

    let dayOfWeek = 0, hour = 0, minute = 0;
    for (const part of parts) {
        if (part.type === 'weekday') dayOfWeek = weekdayMap[part.value] || 0;
        if (part.type === 'hour') hour = parseInt(part.value);
        if (part.type === 'minute') minute = parseInt(part.value);
    }

    return { dayOfWeek, hour, minute };
}

// Run a task via the queue system (creates ProcessRun entry for queue-worker to pick up)
async function queueTask(scriptName, taskName) {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName);

    if (!fs.existsSync(scriptPath)) {
        log(`❌ Script not found: ${scriptPath}`);
        return;
    }

    log(`🚀 Queueing task: ${taskName} (${scriptName})`);

    try {
        // Find the matching ScrapingProcess by script name
        const process = await prisma.scrapingProcess.findFirst({
            where: { script: { contains: scriptName } }
        });

        if (process) {
            await prisma.processRun.create({
                data: {
                    processId: process.id,
                    status: 'queued',
                    triggeredBy: 'schedule'
                }
            });
            log(`✅ Task ${taskName} queued via process system (processId: ${process.id})`);
        } else {
            // Fallback: direct spawn for unmapped scripts
            log(`⚠️ No process found for ${scriptName}, falling back to direct spawn`);
            const child = spawn('node', [scriptPath], {
                detached: true,
                stdio: 'ignore',
                cwd: require('process').cwd(),
                env: require('process').env
            });
            child.unref();
            log(`✅ Task ${taskName} started in background (PID: ${child.pid})`);
        }
    } catch (error) {
        log(`❌ Failed to queue task ${taskName}: ${error.message}`);
    }
}

// Update last run timestamp
async function updateLastRun(taskName) {
    try {
        await prisma.scheduleConfig.update({
            where: { taskName },
            data: { lastRun: new Date() }
        });
    } catch (error) {
        log(`⚠️ Could not update lastRun for ${taskName}: ${error.message}`);
    }
}

// Check if a task should run now (supports daily, weekly, custom frequencies)
function shouldRunNow(schedule, currentTime) {
    if (!schedule.enabled) return false;
    if (schedule.hour !== currentTime.hour || schedule.minute !== currentTime.minute) return false;

    const frequency = schedule.frequency || 'weekly';

    switch (frequency) {
        case 'daily':
            return true;
        case 'custom': {
            try {
                const days = JSON.parse(schedule.daysOfWeek || '[]');
                return Array.isArray(days) && days.includes(currentTime.dayOfWeek);
            } catch {
                log(`⚠️ Invalid daysOfWeek JSON for ${schedule.taskName}: ${schedule.daysOfWeek}`);
                return false;
            }
        }
        case 'weekly':
        default:
            return schedule.dayOfWeek === currentTime.dayOfWeek;
    }
}

// Main execution
async function main() {
    ensureDir(LOGS_DIR);

    const currentTime = getRomaniaTime();
    log(`Checking schedules: Day=${currentTime.dayOfWeek}, Hour=${currentTime.hour}, Minute=${currentTime.minute}`);

    try {
        // Get all schedules from database
        const schedules = await prisma.scheduleConfig.findMany({
            where: { enabled: true }
        });

        if (schedules.length === 0) {
            log('No enabled schedules found');
            await prisma.$disconnect();
            return;
        }

        for (const schedule of schedules) {
            if (shouldRunNow(schedule, currentTime)) {
                const scriptName = TASK_SCRIPTS[schedule.taskName];

                if (scriptName) {
                    log(`⏰ Time to run: ${schedule.taskName}`);
                    await queueTask(scriptName, schedule.taskName);
                    await updateLastRun(schedule.taskName);
                } else {
                    log(`⚠️ Unknown task: ${schedule.taskName}`);
                }
            }
        }

        await prisma.$disconnect();
    } catch (error) {
        log(`❌ Error: ${error.message}`);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();
