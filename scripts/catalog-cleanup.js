#!/usr/bin/env node
/**
 * Catalog Cleanup Script
 * Deletes catalogs older than 30 days from database and removes local images.
 * Run via cron: 0 3 * * 0 (every Sunday at 3 AM)
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CATALOGS_DIR = path.join(process.cwd(), 'public', 'catalogs');
const LOGS_DIR = path.join(process.cwd(), 'logs');

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function cleanupOldCatalogs() {
    log('='.repeat(50));
    log('🧹 Catalog Cleanup - Removing catalogs older than 30 days');
    log('='.repeat(50));

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    log(`Threshold date: ${thirtyDaysAgo.toISOString()}`);

    try {
        // Find old catalogs (validUntil older than 30 days)
        const oldCatalogs = await prisma.catalog.findMany({
            where: {
                validUntil: { lt: thirtyDaysAgo }
            }
        });

        log(`Found ${oldCatalogs.length} catalogs to delete`);

        let deletedCount = 0;
        let freedSpace = 0;

        for (const catalog of oldCatalogs) {
            log(`  Deleting: ${catalog.title} (${catalog.store})`);

            // Remove local images
            if (catalog.imageBasePath) {
                const localDir = path.join(process.cwd(), 'public', catalog.imageBasePath);
                if (fs.existsSync(localDir)) {
                    // Calculate folder size before deletion
                    const files = fs.readdirSync(localDir);
                    for (const file of files) {
                        const filePath = path.join(localDir, file);
                        const stats = fs.statSync(filePath);
                        freedSpace += stats.size;
                    }

                    fs.rmSync(localDir, { recursive: true, force: true });
                    log(`    🗑️ Removed images: ${localDir}`);
                }
            }

            // Delete from database
            await prisma.catalog.delete({ where: { id: catalog.id } });
            deletedCount++;
        }

        // Cleanup empty store directories
        if (fs.existsSync(CATALOGS_DIR)) {
            const storeDirs = fs.readdirSync(CATALOGS_DIR);
            for (const storeDir of storeDirs) {
                const storePath = path.join(CATALOGS_DIR, storeDir);
                if (fs.statSync(storePath).isDirectory()) {
                    const contents = fs.readdirSync(storePath);
                    if (contents.length === 0) {
                        fs.rmdirSync(storePath);
                        log(`    🗑️ Removed empty store dir: ${storeDir}`);
                    }
                }
            }
        }

        // Cleanup old log files (older than 30 days)
        if (fs.existsSync(LOGS_DIR)) {
            const logFiles = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith('catalog-scraper-') && f.endsWith('.log'));
            for (const logFile of logFiles) {
                const logPath = path.join(LOGS_DIR, logFile);
                const stats = fs.statSync(logPath);
                if (stats.mtime < thirtyDaysAgo) {
                    fs.unlinkSync(logPath);
                    log(`    🗑️ Removed old log: ${logFile}`);
                }
            }
        }

        const freedMB = (freedSpace / 1024 / 1024).toFixed(2);

        log('');
        log('='.repeat(50));
        log('✅ Cleanup Complete');
        log(`  Catalogs deleted: ${deletedCount}`);
        log(`  Space freed: ${freedMB} MB`);
        log('='.repeat(50));

    } catch (error) {
        log(`❌ Error during cleanup: ${error.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupOldCatalogs();
