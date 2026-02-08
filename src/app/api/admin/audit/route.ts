import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit-logger';
import type { AuditAction, AuditEntity } from '@/lib/audit-logger';

// GET /api/admin/audit - Paginated audit logs with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entity = searchParams.get('entity') as AuditEntity | null;
    const action = searchParams.get('action') as AuditAction | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const result = await getAuditLogs({
      page,
      limit,
      entity: entity || undefined,
      action: action || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
