'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Calendar, Store } from 'lucide-react';

interface Catalog {
  id: string;
  title: string;
  store: string;
  sourceUrl: string;
  validFrom: string;
  validUntil: string;
  status: string;
}

interface CatalogsResponse {
  success: boolean;
  catalogs: Record<string, Catalog[]>;
  total: number;
}

const storeConfig = [
  { slug: 'kaufland', name: 'Kaufland', color: 'from-[#e10915] to-[#c00812]' },
  { slug: 'lidl', name: 'Lidl', color: 'from-[#0050aa] to-[#003d82]' },
  { slug: 'penny', name: 'Penny', color: 'from-[#cd1719] to-[#a81315]' },
  { slug: 'profi', name: 'Profi', color: 'from-[#e4002b] to-[#b80022]' },
  { slug: 'carrefour', name: 'Carrefour', color: 'from-[#004e9e] to-[#003a76]' },
  { slug: 'mega image', name: 'Mega Image', color: 'from-[#e31837] to-[#b8142d]' },
  { slug: 'auchan', name: 'Auchan', color: 'from-[#e1001a] to-[#b00014]' },
  { slug: 'selgros', name: 'Selgros', color: 'from-[#ed1b2f] to-[#c9001b]' },
];

export default function CatalogList() {
  const [catalogs, setCatalogs] = useState<Record<string, Catalog[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  async function fetchCatalogs() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/catalogs');
      const data: CatalogsResponse = await response.json();

      if (data.success) {
        setCatalogs(data.catalogs);
        setError(null);
      } else {
        setError('Nu am putut încărca cataloagele');
      }
    } catch (err) {
      console.error('Error fetching catalogs:', err);
      setError('Eroare la încărcarea cataloagelor');
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
    });
  }

  function getStoreConfig(storeName: string) {
    return storeConfig.find(
      (s) => s.slug.toLowerCase() === storeName.toLowerCase()
    ) || { slug: storeName.toLowerCase(), name: storeName, color: 'from-gray-600 to-gray-800' };
  }

  const filteredCatalogs = selectedStore
    ? { [selectedStore]: catalogs[selectedStore] || [] }
    : catalogs;

  const availableStores = Object.keys(catalogs);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-neutral-600">Se încarcă cataloagele...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-semibold">{error}</p>
        <button
          onClick={fetchCatalogs}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  if (availableStores.length === 0) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-12 text-center">
        <Store className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
        <h3 className="text-xl font-bold text-neutral-800 mb-2">
          Niciun catalog disponibil
        </h3>
        <p className="text-neutral-600">
          Cataloagele sunt în curs de actualizare. Revin în curând!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStore(null)}
          className={cn(
            'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
            !selectedStore
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          )}
        >
          Toate Magazinele ({Object.values(catalogs).flat().length})
        </button>

        {availableStores.map((storeName) => {
          const config = getStoreConfig(storeName);
          const count = catalogs[storeName]?.length || 0;

          return (
            <button
              key={storeName}
              onClick={() => setSelectedStore(storeName)}
              className={cn(
                'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                selectedStore === storeName
                  ? `bg-gradient-to-r ${config.color} text-white shadow-md`
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              )}
            >
              {config.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Catalogs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(filteredCatalogs).map(([storeName, storeCatalogs]) =>
          storeCatalogs.map((catalog) => {
            const config = getStoreConfig(storeName);

            return (
              <a
                key={catalog.id}
                href={catalog.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-neutral-200 hover:border-primary-300"
              >
                {/* Store Header */}
                <div
                  className={cn(
                    'bg-gradient-to-r p-4 text-white',
                    config.color
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">{config.name}</span>
                    <ExternalLink className="w-5 h-5 opacity-70 group-hover:opacity-100 transition" />
                  </div>
                </div>

                {/* Catalog Info */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-neutral-900 line-clamp-2 min-h-[3rem]">
                    {catalog.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(catalog.validFrom)} - {formatDate(catalog.validUntil)}
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold group-hover:bg-primary-100 transition">
                      Vezi Catalog
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
