import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { metrics } from '@/lib/metrics'
import prisma from '@/lib/db'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/admin/debug - Comprehensive debug information
 * Returns:
 * - System metrics (memory, CPU)
 * - Error statistics
 * - Recent errors
 * - Log files info
 * - Database status
 * - Process info
 */
export async function GET(request: NextRequest) {
  try {
    const log = logger.child('DebugAPI')
    log.info('Debug info requested')

    // System metrics (redacted for security - no PID, version, platform info)
    const memoryUsage = process.memoryUsage()
    const systemMetrics = {
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
      },
      uptime: Math.round(process.uptime()),
    }

    // Error statistics (without stack traces for security)
    const errorStats = logger.getErrorStats()
    const recentErrors = logger.getRecentErrors(10).map(err => ({
      timestamp: err.timestamp,
      message: err.message,
      context: err.context,
      // Omit stack traces to prevent information leakage
    }))

    // Log files
    const logFiles = logger.getLogFiles()

    // Metrics
    const appMetrics = metrics.toJSON()

    // Database status
    let dbStatus = 'unknown'
    let dbStats = {}
    try {
      await prisma.$queryRaw`SELECT 1`
      dbStatus = 'connected'

      const productCount = await prisma.product.count()
      const recipeCount = await prisma.recipe.count()
      const catalogCount = await prisma.catalog.count()

      dbStats = {
        products: productCount,
        recipes: recipeCount,
        catalogs: catalogCount,
      }
    } catch (error) {
      dbStatus = 'disconnected'
      log.error('Database health check failed', error as Error)
    }

    // Storage info
    const storageDir = path.join(process.cwd(), 'storage')
    const logsDir = path.join(process.cwd(), 'logs')

    const getDirectorySize = (dir: string): number => {
      try {
        if (!fs.existsSync(dir)) return 0
        let size = 0
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stats = fs.statSync(filePath)
          if (stats.isDirectory()) {
            size += getDirectorySize(filePath)
          } else {
            size += stats.size
          }
        })
        return size
      } catch {
        return 0
      }
    }

    const storage = {
      storageSize: Math.round(getDirectorySize(storageDir) / 1024 / 1024) + ' MB',
      logsSize: Math.round(getDirectorySize(logsDir) / 1024 / 1024) + ' MB',
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      database: {
        status: dbStatus,
        stats: dbStats,
      },
      errors: {
        stats: errorStats,
        recent: recentErrors,
      },
      logs: {
        files: logFiles,
        totalFiles: logFiles.length,
      },
      storage,
      metrics: appMetrics,
    })
  } catch (error) {
    logger.error('Failed to get debug info', error as Error, 'AdminDebugAPI')
    return NextResponse.json(
      { success: false, error: 'Failed to get debug information' },
      { status: 500 }
    )
  }
}
