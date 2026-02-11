'use client';

import { useState, useEffect } from 'react';

interface Schedule {
  id: string;
  taskName: string;
  enabled: boolean;
  frequency: string;
  dayOfWeek: number;
  daysOfWeek: string | null;
  hour: number;
  minute: number;
  lastRun: string | null;
  lastError: string | null;
}

interface TaskMeta {
  icon: string;
  label: string;
  description: string;
}

const TASK_META: Record<string, TaskMeta> = {
  catalogs: { icon: '📚', label: 'Scrape Catalogs', description: 'Download catalog images from stores' },
  products: { icon: '📦', label: 'Extract Products', description: 'Extract products from catalog images' },
  recipes: { icon: '🍳', label: 'Generate Recipes', description: 'Create recipes from extracted products' },
  images: { icon: '🖼️', label: 'Generate Images', description: 'Generate images for recipes' },
  cleanup: { icon: '🧹', label: 'Cleanup', description: 'Remove expired catalogs and files' },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQUENCIES = ['daily', 'weekly', 'custom'] as const;

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/admin/schedules');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading schedules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-neutral-400">
          {schedules.length} task{schedules.length !== 1 ? 's' : ''} configured
        </p>
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

      {/* Schedule Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            onSaved={(msg) => {
              showNotification('success', msg);
              fetchSchedules();
            }}
            onError={(msg) => showNotification('error', msg)}
          />
        ))}
      </div>
    </div>
  );
}

function parseDaysOfWeek(raw: string | null): number[] {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

function ScheduleCard({
  schedule,
  onSaved,
  onError,
}: {
  schedule: Schedule;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const meta = TASK_META[schedule.taskName] || { icon: '⚙️', label: schedule.taskName, description: '' };

  const [enabled, setEnabled] = useState(schedule.enabled);
  const [frequency, setFrequency] = useState(schedule.frequency || 'weekly');
  const [dayOfWeek, setDayOfWeek] = useState(schedule.dayOfWeek);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() => parseDaysOfWeek(schedule.daysOfWeek));
  const [hour, setHour] = useState(schedule.hour);
  const [minute, setMinute] = useState(schedule.minute);
  const [saving, setSaving] = useState(false);

  // Sync local state when schedule prop changes (e.g. after refetch)
  useEffect(() => {
    setEnabled(schedule.enabled);
    setFrequency(schedule.frequency || 'weekly');
    setDayOfWeek(schedule.dayOfWeek);
    setDaysOfWeek(parseDaysOfWeek(schedule.daysOfWeek));
    setHour(schedule.hour);
    setMinute(schedule.minute);
  }, [schedule]);

  const hasChanges =
    enabled !== schedule.enabled ||
    frequency !== (schedule.frequency || 'weekly') ||
    dayOfWeek !== schedule.dayOfWeek ||
    JSON.stringify(daysOfWeek) !== JSON.stringify(parseDaysOfWeek(schedule.daysOfWeek)) ||
    hour !== schedule.hour ||
    minute !== schedule.minute;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: schedule.taskName,
          enabled,
          frequency,
          dayOfWeek,
          daysOfWeek: frequency === 'custom' ? JSON.stringify(daysOfWeek) : null,
          hour,
          minute,
        }),
      });

      if (res.ok) {
        onSaved(`${meta.label} schedule saved`);
      } else {
        const data = await res.json();
        onError(data.error || 'Failed to save');
      }
    } catch {
      onError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    if (frequency === 'weekly') {
      setDayOfWeek(day);
    } else if (frequency === 'custom') {
      setDaysOfWeek((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
      );
    }
  };

  const isDaySelected = (day: number) => {
    if (frequency === 'weekly') return dayOfWeek === day;
    if (frequency === 'custom') return daysOfWeek.includes(day);
    return false;
  };

  return (
    <div className={`bg-neutral-900 rounded-xl border p-5 transition-all ${
      enabled ? 'border-white/5 hover:border-white/10' : 'border-white/5 opacity-60'
    }`}>
      {/* Task Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-xl">
            {meta.icon}
          </div>
          <div>
            <h3 className="font-bold text-white">{meta.label}</h3>
            <p className="text-xs text-neutral-500">{meta.description}</p>
          </div>
        </div>

        {/* Enabled Toggle */}
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
            enabled ? 'bg-emerald-500' : 'bg-neutral-700'
          }`}
        >
          <span
            className={`block w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Frequency Selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-500 mb-2">Frequency</label>
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors capitalize ${
                frequency === f
                  ? 'bg-primary-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Day Picker - shown for weekly & custom */}
      {frequency !== 'daily' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-500 mb-2">
            {frequency === 'weekly' ? 'Day of Week' : 'Days of Week'}
          </label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                  isDaySelected(i)
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time Picker */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-500 mb-2">Time (Romania)</label>
        <div className="flex gap-2">
          <select
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="text-neutral-500 self-center">:</span>
          <select
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Last Run */}
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-4">
        <span>Last run</span>
        <span>
          {schedule.lastRun
            ? new Date(schedule.lastRun).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })
            : 'Never'}
        </span>
      </div>

      {/* Last Error */}
      {schedule.lastError && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs truncate" title={schedule.lastError}>
          {schedule.lastError}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          hasChanges
            ? 'bg-primary-500 text-white hover:bg-primary-400'
            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
        } disabled:opacity-50`}
      >
        {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
      </button>
    </div>
  );
}
