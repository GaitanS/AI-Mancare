'use client';

import { ReactNode } from 'react';

interface ConfirmModalProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmText?: string; // alias for confirmLabel
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  confirmButtonClass?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  variant = 'danger',
  confirmButtonClass,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const btnLabel = confirmLabel || confirmText || 'Delete';
  const colors = variant === 'danger'
    ? { btn: confirmButtonClass || 'bg-red-500 hover:bg-red-400', icon: 'text-red-400', bg: 'bg-red-500/10' }
    : { btn: confirmButtonClass || 'bg-amber-500 hover:bg-amber-400', icon: 'text-amber-400', bg: 'bg-amber-500/10' };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-sm">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 mx-auto mb-4 ${colors.bg} rounded-full flex items-center justify-center`}>
            <svg className={`w-7 h-7 ${colors.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <div className="text-sm text-neutral-400">{message}</div>
        </div>
        <div className="flex gap-3 p-4 pt-0">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-neutral-800 text-neutral-300 rounded-xl font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 ${colors.btn} text-white rounded-xl font-medium transition-colors disabled:opacity-50`}
          >
            {loading ? 'Processing...' : btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
