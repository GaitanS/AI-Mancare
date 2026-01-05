/**
 * Database Replica Monitoring API
 * Shows replica health and statistics
 */

import { NextResponse } from 'next/server'
import { dbReplicas } from '@/lib/db-replicas'
import { checkDatabaseHealth } from '@/lib/db'

/**
 * GET /api/admin/db-stats
 * Returns database replica statistics
 */
export async function GET() {
    try {
        // Get master health
        const masterHealth = await checkDatabaseHealth()

        // Get replica stats
        const replicaStats = dbReplicas.getStats()

        // Force health check on replicas
        await dbReplicas.checkReplicaHealth()

        return NextResponse.json({
            master: {
                ...masterHealth,
                status: masterHealth.healthy ? 'healthy' : 'unhealthy'
            },
            replicas: replicaStats.replicas,
            summary: {
                totalReplicas: Object.keys(replicaStats.replicas).length,
                healthyReplicas: Object.values(replicaStats.replicas as Record<string, any>)
                    .filter((r: any) => r.healthy).length,
                timestamp: new Date().toISOString()
            }
        })
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to get database stats',
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
    }
}
