'use client';

export type ProcessStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'processing';

export const statusConfig: Record<ProcessStatus, { bg: string; text: string; icon: string }> = {
  queued: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '⏳' },
  pending: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '⏳' },
  running: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '⚡' },
  processing: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '⚡' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✅' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400', icon: '❌' },
  cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', icon: '⏹️' },
};

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  showPulse?: boolean;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  showIcon = false,
  showPulse = false,
  size = 'sm',
}: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase() as ProcessStatus] || statusConfig.queued;
  const isRunning = status === 'running';

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg ${config.bg} ${config.text} ${sizeClasses[size]}`}
    >
      {showIcon && <span>{config.icon}</span>}
      <span className="capitalize">{status}</span>
      {showPulse && isRunning && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
    </span>
  );
}
