'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="w-32 h-32 mx-auto mb-8 bg-primary-50 rounded-full flex items-center justify-center">
          <svg className="w-16 h-16 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="font-display text-7xl font-bold text-neutral-900 mb-2">404</h1>

        {/* Title */}
        <h2 className="text-2xl font-bold text-neutral-800 mb-4">
          Pagina nu a fost găsită
        </h2>

        {/* Description */}
        <p className="text-neutral-600 mb-8 max-w-sm mx-auto">
          Ne pare rău, pagina pe care o cauți nu există sau a fost mutată.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
          >
            Înapoi acasă
          </Link>

          <Link
            href="/oferte"
            className="px-6 py-3 bg-white text-neutral-700 rounded-xl font-semibold hover:bg-neutral-50 transition-colors border border-neutral-200"
          >
            Vezi cataloagele
          </Link>
        </div>
      </div>
    </div>
  );
}
