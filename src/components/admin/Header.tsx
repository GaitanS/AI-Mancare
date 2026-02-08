'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface QueueStatus {
  running: number;
  queued: number;
}

const pageTitles: Record<string, { title: string; description: string }> = {
  '/admin': { title: 'Dashboard', description: 'Overview of your scraping operations' },
  '/admin/processes': { title: 'Processes', description: 'Manage scraping process configurations' },
  '/admin/queue': { title: 'Queue', description: 'View running and queued processes' },
  '/admin/stores': { title: 'Stores', description: 'Configure store scraping settings' },
  '/admin/logs': { title: 'Logs', description: 'View system and process logs' },
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  // Find matching page info
  const pageInfo = Object.entries(pageTitles).find(([path]) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  })?.[1] || { title: 'Admin', description: '' };

  // Fetch queue status periodically
  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const res = await fetch('/api/admin/queue?summary=true');
        if (res.ok) {
          const data = await res.json();
          setQueueStatus({
            running: data.running || 0,
            queued: data.queued || 0,
          });
        }
      } catch (error) {
        // Silently fail - status is not critical
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-neutral-900/50 border-b border-white/5 px-4 md:px-6 lg:px-8 py-3 lg:py-4 sticky top-0 z-10 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger Menu - Mobile only */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-bold text-white truncate">{pageInfo.title}</h1>
            <p className="text-xs lg:text-sm text-neutral-500 truncate hidden sm:block">{pageInfo.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          {/* Queue Status Badge */}
          {queueStatus && (queueStatus.running > 0 || queueStatus.queued > 0) && (
            <div className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1 lg:py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              {queueStatus.running > 0 && (
                <span className="flex items-center gap-1 lg:gap-1.5 text-amber-400 text-xs lg:text-sm">
                  <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">{queueStatus.running} running</span>
                  <span className="sm:hidden">{queueStatus.running}</span>
                </span>
              )}
              {queueStatus.queued > 0 && (
                <span className="text-neutral-400 text-xs lg:text-sm hidden md:inline">
                  +{queueStatus.queued} queued
                </span>
              )}
            </div>
          )}

          {/* Current Time */}
          <div className="text-neutral-500 text-xs lg:text-sm hidden md:block">
            {new Date().toLocaleDateString('ro-RO', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
