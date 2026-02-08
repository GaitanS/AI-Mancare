/**
 * Admin Panel Utility Functions
 * Shared utilities for the admin panel
 */

/**
 * Format duration between two timestamps
 * @param start - Start timestamp (ISO string or null)
 * @param end - End timestamp (ISO string or null), defaults to now if not provided
 * @returns Formatted duration string (e.g., "5s", "2m 30s", "1h 15m")
 */
export function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '-';

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const totalSeconds = Math.floor((endTime - startTime) / 1000);

  if (totalSeconds < 0) return '-';

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${hours}h`;
}

/**
 * Format date for Romanian locale
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('ro-RO');
}

/**
 * Format relative time (e.g., "2 hours ago", "just now")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(date);
}

/**
 * Parse JSON progress string safely
 * @param progress - JSON string or null
 * @returns Parsed progress object or null
 */
export function parseProgress(progress: string | null): {
  current?: number;
  total?: number;
  message?: string;
} | null {
  if (!progress) return null;
  try {
    return JSON.parse(progress);
  } catch {
    return null;
  }
}

/**
 * Parse JSON result string safely
 * @param result - JSON string or null
 * @returns Parsed result object or null
 */
export function parseResult(result: string | null): Record<string, unknown> | null {
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}
