'use client';

import { useState, useEffect } from 'react';

interface Process {
  id: string;
  name: string;
  description: string | null;
  type: string;
  script: string;
  config: string | null;
  icon: string;
  color: string;
  enabled: boolean;
  cronSchedule: string | null;
  sortOrder: number;
  lastRun: {
    id: string;
    status: string;
    completedAt: string | null;
    result: string | null;
  } | null;
  isRunning: boolean;
  isQueued: boolean;
  _count: { runs: number };
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchProcesses = async () => {
    try {
      const res = await fetch('/api/admin/processes');
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes || []);
      }
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunProcess = async (processId: string) => {
    setActionLoading(processId);
    try {
      const res = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ type: 'success', message: data.message || 'Process added to queue' });
        fetchProcesses();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to queue process' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleToggleEnabled = async (process: Process) => {
    try {
      const res = await fetch(`/api/admin/processes/${process.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !process.enabled }),
      });

      if (res.ok) {
        fetchProcesses();
      }
    } catch (error) {
      console.error('Failed to toggle process:', error);
    }
  };

  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/20 hover:border-blue-500/40',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40',
    orange: 'border-orange-500/20 hover:border-orange-500/40',
    pink: 'border-pink-500/20 hover:border-pink-500/40',
    purple: 'border-purple-500/20 hover:border-purple-500/40',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading processes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-neutral-400 text-sm lg:text-base">
            {processes.length} process{processes.length !== 1 ? 'es' : ''} configured
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 lg:px-4 py-1.5 lg:py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors flex items-center gap-1.5 lg:gap-2 text-sm lg:text-base shrink-0"
        >
          <span>+</span>
          <span className="hidden sm:inline">New Process</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Process Grid */}
      {processes.length === 0 ? (
        <div className="text-center py-10 lg:py-16 bg-neutral-900 rounded-xl lg:rounded-2xl border border-white/5">
          <span className="text-4xl lg:text-5xl block mb-3 lg:mb-4">📋</span>
          <h3 className="text-base lg:text-lg font-bold text-white mb-2">No Processes Configured</h3>
          <p className="text-neutral-500 text-sm lg:text-base mb-4 lg:mb-6">Create your first scraping process to get started.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 lg:px-6 py-2.5 lg:py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors text-sm lg:text-base"
          >
            Create Process
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {processes.map((process) => (
            <ProcessCard
              key={process.id}
              process={process}
              colorClass={colorClasses[process.color] || colorClasses.blue}
              isLoading={actionLoading === process.id}
              onRun={() => handleRunProcess(process.id)}
              onToggle={() => handleToggleEnabled(process)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProcessModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchProcesses();
            setNotification({ type: 'success', message: 'Process created successfully' });
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}
    </div>
  );
}

function ProcessCard({
  process,
  colorClass,
  isLoading,
  onRun,
  onToggle,
}: {
  process: Process;
  colorClass: string;
  isLoading: boolean;
  onRun: () => void;
  onToggle: () => void;
}) {
  const lastRunStatus = process.lastRun?.status;
  const lastRunTime = process.lastRun?.completedAt
    ? new Date(process.lastRun.completedAt).toLocaleString('ro-RO')
    : null;

  return (
    <div
      className={`bg-neutral-900 rounded-xl lg:rounded-2xl border p-4 lg:p-6 transition-all ${colorClass} ${
        !process.enabled ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 lg:mb-4">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <span className="text-2xl lg:text-3xl shrink-0">{process.icon}</span>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base lg:text-lg truncate">{process.name}</h3>
            <span className="text-[10px] lg:text-xs text-neutral-500 uppercase">{process.type}</span>
          </div>
        </div>

        {/* Status Indicator */}
        {process.isRunning && (
          <span className="flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2 py-0.5 lg:py-1 bg-amber-500/10 text-amber-400 rounded-md lg:rounded-lg text-[10px] lg:text-xs shrink-0">
            <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-amber-400 animate-pulse" />
            Running
          </span>
        )}
        {process.isQueued && !process.isRunning && (
          <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-blue-500/10 text-blue-400 rounded-md lg:rounded-lg text-[10px] lg:text-xs shrink-0">
            Queued
          </span>
        )}
      </div>

      {/* Description */}
      {process.description && (
        <p className="text-neutral-400 text-xs lg:text-sm mb-3 lg:mb-4 line-clamp-2">{process.description}</p>
      )}

      {/* Last Run Info */}
      {lastRunTime && (
        <div className="mb-3 lg:mb-4 p-2 lg:p-3 bg-neutral-800/50 rounded-lg">
          <div className="flex items-center justify-between text-xs lg:text-sm">
            <span className="text-neutral-500">Last run:</span>
            <span className="text-neutral-400 truncate ml-2">{lastRunTime}</span>
          </div>
          {lastRunStatus && (
            <div className="flex items-center justify-between text-xs lg:text-sm mt-1">
              <span className="text-neutral-500">Status:</span>
              <StatusBadge status={lastRunStatus} />
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4 text-xs lg:text-sm text-neutral-500">
        <span>{process._count.runs} total runs</span>
        {process.cronSchedule && (
          <span className="flex items-center gap-1">
            <span>⏰</span>
            <span className="hidden sm:inline">Scheduled</span>
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        <button
          onClick={onRun}
          disabled={isLoading || process.isRunning || process.isQueued || !process.enabled}
          className="flex-1 py-2 lg:py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 lg:gap-2 text-sm"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span className="hidden sm:inline">Queueing...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : process.isRunning ? (
            <span>Running...</span>
          ) : process.isQueued ? (
            <span>In Queue</span>
          ) : (
            <>
              <span>▶️</span>
              <span>Run Now</span>
            </>
          )}
        </button>

        <button
          onClick={onToggle}
          className={`p-2 lg:p-2.5 rounded-lg border transition-colors ${
            process.enabled
              ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
              : 'border-neutral-700 text-neutral-500 hover:bg-neutral-800'
          }`}
          title={process.enabled ? 'Disable process' : 'Enable process'}
        >
          {process.enabled ? '✓' : '○'}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400' },
    cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400' },
  };

  const style = config[status] || config.completed;

  return (
    <span className={`px-2 py-0.5 rounded ${style.bg} ${style.text} text-xs`}>
      {status}
    </span>
  );
}

function CreateProcessModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom',
    script: '',
    icon: '📦',
    color: 'blue',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        onCreated();
      } else {
        setError(data.error || 'Failed to create process');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'catalog', label: 'Catalog Scraper', icon: '📚' },
    { value: 'product', label: 'Product Extractor', icon: '📦' },
    { value: 'recipe', label: 'Recipe Generator', icon: '🍳' },
    { value: 'image', label: 'Image Generator', icon: '🖼️' },
    { value: 'custom', label: 'Custom Script', icon: '⚙️' },
  ];

  const colorOptions = ['blue', 'emerald', 'orange', 'pink', 'purple'];
  const iconOptions = ['📚', '📦', '🍳', '🖼️', '⚙️', '🔧', '📊', '🔄', '🎯', '✨'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Create New Process</h2>
          <p className="text-sm text-neutral-500 mt-1">Configure a new scraping process</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              placeholder="My Scraper"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 resize-none"
              rows={2}
              placeholder="What does this process do?"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Script */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Script File *</label>
            <input
              type="text"
              value={formData.script}
              onChange={(e) => setFormData({ ...formData, script: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 font-mono text-sm"
              placeholder="scripts/my-scraper.js"
              required
            />
            <p className="text-xs text-neutral-500 mt-1">Path to the script file relative to project root</p>
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Icon</label>
              <div className="flex flex-wrap gap-1">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-2 rounded-lg text-xl ${
                      formData.icon === icon
                        ? 'bg-primary-500/20 border border-primary-500/50'
                        : 'bg-neutral-800 border border-transparent hover:border-neutral-700'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Color</label>
              <div className="flex flex-wrap gap-1">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg ${
                      formData.color === color ? 'ring-2 ring-white' : ''
                    }`}
                    style={{
                      backgroundColor:
                        color === 'blue' ? '#3b82f6' :
                        color === 'emerald' ? '#10b981' :
                        color === 'orange' ? '#f97316' :
                        color === 'pink' ? '#ec4899' :
                        '#a855f7',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
