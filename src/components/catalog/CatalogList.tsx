'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Store, BookOpen, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import CatalogViewerLocal from './CatalogViewerLocal';

interface Catalog {
  id: string;
  title: string;
  slug: string;
  store: string;
  validFrom: string;
  validUntil: string;
  totalPages: number;
  imageBasePath: string;
  localImages: string[];
  thumbnail: string | null;
}

interface CatalogsResponse {
  success: boolean;
  data: Record<string, Catalog[]>;
  totalCatalogs: number;
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
  { slug: 'supeco', name: 'Supeco', color: 'from-[#f7941d] to-[#d47a17]' },
];

export default function CatalogList() {
  const [catalogs, setCatalogs] = useState<Record<string, Catalog[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  async function fetchCatalogs() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/catalogs');
      const data: CatalogsResponse = await response.json();

      if (data.success) {
        setCatalogs(data.data);
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
      (s) => s.slug.toLowerCase() === storeName.toLowerCase() || s.name.toLowerCase() === storeName.toLowerCase()
    ) || { slug: storeName.toLowerCase(), name: storeName, color: 'from-gray-600 to-gray-800' };
  }

  const filteredCatalogs = selectedStore
    ? { [selectedStore]: catalogs[selectedStore] || [] }
    : catalogs;

  const availableStores = Object.keys(catalogs);
  const totalCount = Object.values(catalogs).flat().length;

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

  // Show catalog viewer if a catalog is selected
  if (activeCatalog) {
    return (
      <CatalogViewerLocal
        catalog={activeCatalog}
        onClose={() => setActiveCatalog(null)}
      />
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
          Toate Magazinele ({totalCount})
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
              <button
                key={catalog.id}
                onClick={() => setActiveCatalog(catalog)}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-neutral-200 hover:border-primary-300 text-left"
              >
                {/* Thumbnail */}
                {catalog.thumbnail && (
                  <div className="relative h-40 bg-neutral-100 overflow-hidden">
                    <Image
                      src={catalog.thumbnail}
                      alt={catalog.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                      {catalog.totalPages} pagini
                    </div>
                  </div>
                )}

                {/* Store Header */}
                <div
                  className={cn(
                    'bg-gradient-to-r p-3 text-white',
                    config.color
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{config.name}</span>
                    <BookOpen className="w-5 h-5 opacity-70" />
                  </div>
                </div>

                {/* Catalog Info */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-neutral-900 line-clamp-2 min-h-[2.5rem]">
                    {catalog.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(catalog.validFrom)} - {formatDate(catalog.validUntil)}
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-semibold group-hover:bg-primary-100 transition">
                      Răsfoiește Catalogul
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

