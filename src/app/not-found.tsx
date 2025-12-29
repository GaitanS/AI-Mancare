import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pagina nu a fost gasita - 404',
  description: 'Pagina pe care o cauti nu exista sau a fost mutata.',
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-12 h-12 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Pagina nu a fost gasita
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Ne pare rau, dar pagina pe care o cauti nu exista sau a fost mutata.
          Verifica adresa URL sau intoarce-te la pagina principala.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn-primary btn-md">
            Inapoi la Acasa
          </Link>
          <Link href="/oferte" className="btn-secondary btn-md">
            Vezi Ofertele
          </Link>
        </div>

        <div className="mt-12">
          <p className="text-sm text-gray-500 mb-4">Sau cauta ce te intereseaza:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/oferte/kaufland"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Kaufland
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/oferte/lidl"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Lidl
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/oferte/penny"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Penny
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/retete"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Retete
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
