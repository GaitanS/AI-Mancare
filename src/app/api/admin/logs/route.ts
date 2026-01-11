import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/logs - Read application logs with filters
 * Query params:
 * - date: YYYY-MM-DD (default: today)
 * - level: debug|info|warn|error|critical (default: info)
 * - context: filter by context string
 * - limit: number of entries (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const date = searchParams.get('date') || undefined
    const level = (searchParams.get('level') as any) || undefined
    const context = searchParams.get('context') || undefined
    const limit = parseInt(searchParams.get('limit') || '100')

    const logs = logger.readLogs({
      date,
      level,
      context,
      limit
    })

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs
    })
  } catch (error) {
    logger.error('Failed to read logs', error as Error, 'AdminLogsAPI')
    return NextResponse.json(
      { success: false, error: 'Failed to read logs' },
      { status: 500 }
    )
  }
}
