/**
 * Audit Logger - Tracks all admin actions for accountability
 */

import prisma from '@/lib/db';
import { NextRequest } from 'next/server';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE' | 'BULK_DELETE';
export type AuditEntity = 'product' | 'recipe' | 'catalog' | 'store' | 'process' | 'schedule';

interface AuditOptions {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  details?: string;
  request?: NextRequest;
}

/**
 * Extract client IP from request headers
 */
function getClientIp(request?: NextRequest): string | null {
  if (!request) return null;
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

/**
 * Log an admin action to the audit table
 */
export async function logAudit(options: AuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        changes: options.changes ? JSON.stringify(options.changes) : null,
        details: options.details || null,
        ipAddress: getClientIp(options.request),
      },
    });
  } catch (error) {
    console.error('[AUDIT] Failed to log audit entry:', error);
  }
}

/**
 * Compute changes between old and new objects (for UPDATE actions)
 */
export function computeChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields: string[]
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (newVal !== undefined && String(oldVal) !== String(newVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

interface AuditLogFilters {
  entity?: AuditEntity;
  action?: AuditAction;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Get paginated audit logs with optional filters
 */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const { entity, action, entityId, startDate, endDate, page = 1, limit = 50 } = filters;

  const where: Record<string, unknown> = {};

  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (entityId) where.entityId = entityId;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
