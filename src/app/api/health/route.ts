/**
 * Health Check API
 * Used by CI/CD to verify deployment success
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV
        })
    } catch (error) {
        return NextResponse.json({
            status: 'unhealthy',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        }, { status: 503 })
    }
}
