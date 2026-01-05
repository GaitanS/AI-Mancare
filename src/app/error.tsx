'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-32 h-32 mx-auto mb-8 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="font-display text-7xl font-bold text-neutral-900 mb-2">500</h1>

        {/* Title */}
        <h2 className="text-2xl font-bold text-neutral-800 mb-4">
          Ceva nu a mers bine
        </h2>

        {/* Description */}
        <p className="text-neutral-600 mb-8 max-w-sm mx-auto">
          A apărut o eroare neașteptată. Echipa noastră a fost notificată și lucrăm la rezolvarea problemei.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
          >
            Încearcă din nou
          </button>

          <Link
            href="/"
            className="px-6 py-3 bg-white text-neutral-700 rounded-xl font-semibold hover:bg-neutral-50 transition-colors border border-neutral-200"
          >
            Înapoi acasă
          </Link>
        </div>

        {/* Error ID for debugging */}
        {error.digest && (
          <p className="mt-8 text-xs text-neutral-400">
            ID Eroare: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
