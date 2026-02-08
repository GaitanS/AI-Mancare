'use client';

export default function CartError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Eroare la incarcarea cosului</h1>
        <p className="text-neutral-500 mb-6">Nu am putut incarca cosul de cumparaturi. Va rugam incercati din nou.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors">
            Incearca din nou
          </button>
          <a href="/" className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-colors">
            Acasa
          </a>
        </div>
      </div>
    </div>
  );
}
