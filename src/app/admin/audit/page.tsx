'use client';

import React, { useState, useEffect } from 'react';
import { Pagination } from '@/components/admin/Pagination';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  UPDATE: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  DELETE: { bg: 'bg-red-500/10', text: 'text-red-400' },
  TOGGLE: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  BULK_DELETE: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

const ENTITY_ICONS: Record<string, string> = {
  product: '📦',
  recipe: '🍳',
  catalog: '📚',
  store: '🏪',
  process: '⚙️',
  schedule: '📅',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      });
      if (entityFilter) params.set('entity', entityFilter);
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseChanges = (changesStr: string | null) => {
    if (!changesStr) return null;
    try {
      return JSON.parse(changesStr);
    } catch {
      return null;
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-neutral-400 text-sm">
            {total} action{total !== 1 ? 's' : ''} logged
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Entities</option>
            {['product', 'recipe', 'catalog', 'store', 'process', 'schedule'].map(e => (
              <option key={e} value={e}>{ENTITY_ICONS[e]} {e}</option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Actions</option>
            {['CREATE', 'UPDATE', 'DELETE', 'TOGGLE', 'BULK_DELETE'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-neutral-500">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">📜</span>
            <h3 className="text-lg font-bold text-white mb-1">No Audit Logs</h3>
            <p className="text-neutral-500 text-sm">Admin actions will appear here as they happen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="text-left p-3 lg:p-4">Time</th>
                  <th className="text-left p-3 lg:p-4">Action</th>
                  <th className="text-left p-3 lg:p-4">Entity</th>
                  <th className="text-left p-3 lg:p-4 hidden md:table-cell">Details</th>
                  <th className="text-left p-3 lg:p-4 hidden lg:table-cell">IP</th>
                  <th className="p-3 lg:p-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const colors = ACTION_COLORS[log.action] || ACTION_COLORS.UPDATE;
                  const changes = parseChanges(log.changes);
                  const isExpanded = expandedId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 lg:p-4">
                        <div>
                          <p className="text-white text-xs lg:text-sm">
                            {new Date(log.createdAt).toLocaleDateString('ro-RO')}
                          </p>
                          <p className="text-neutral-500 text-[10px] lg:text-xs">
                            {new Date(log.createdAt).toLocaleTimeString('ro-RO')}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 lg:p-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 lg:p-4">
                        <div className="flex items-center gap-2">
                          <span>{ENTITY_ICONS[log.entity] || '📋'}</span>
                          <div className="min-w-0">
                            <p className="text-white text-xs lg:text-sm capitalize">{log.entity}</p>
                            <p className="text-neutral-500 text-[10px] font-mono truncate max-w-[120px]">
                              {log.entityId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 lg:p-4 hidden md:table-cell">
                        <p className="text-neutral-400 text-xs lg:text-sm truncate max-w-[300px]">
                          {log.details || '-'}
                        </p>
                      </td>
                      <td className="p-3 lg:p-4 hidden lg:table-cell">
                        <p className="text-neutral-500 text-xs font-mono">
                          {log.ipAddress || '-'}
                        </p>
                      </td>
                      <td className="p-3 lg:p-4">
                        {changes && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="text-neutral-500 hover:text-white transition-colors"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}

                      </td>
                    </tr>
                    {isExpanded && changes && (
                      <tr className="border-b border-white/5 bg-neutral-800/30">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="text-xs space-y-1">
                            <p className="text-neutral-500 font-medium mb-2">Changes:</p>
                            {Object.entries(changes).map(([field, change]: [string, any]) => (
                              <div key={field} className="flex gap-2 flex-wrap">
                                <span className="text-neutral-400 font-mono">{field}:</span>
                                <span className="text-red-400 line-through truncate max-w-[200px]">
                                  {String(change.old ?? 'null')}
                                </span>
                                <span className="text-neutral-600">→</span>
                                <span className="text-emerald-400 truncate max-w-[200px]">
                                  {String(change.new ?? 'null')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}
