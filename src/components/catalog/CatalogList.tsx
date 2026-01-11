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

  function getDaysRemaining(validUntil: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(validUntil);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getStoreConfig(storeName: string) {
    return storeConfig.find(
      (s) => s.slug.toLowerCase() === storeName.toLowerCase() || s.name.toLowerCase() === storeName.toLowerCase()
    ) || { slug: storeName.toLowerCase(), name: storeName, color: 'from-gray-600 to-gray-800' };
  }

  function cleanTitle(title: string, storeName: string): string {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const store = capitalize(storeName);

    // If title contains explicit categories, attempt to preserve them
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('alimentar')) return `${store} - Alimentar`;
    if (lowerTitle.includes('non-food') || lowerTitle.includes('nealimentar')) return `${store} - Non-Food`;
    if (lowerTitle.includes('weekend')) return `${store} - Weekend`;
    if (lowerTitle.includes('revista')) return `${store} - Revista`;

    // Otherwise, just return the Store Name as requested to avoid weird IDs
    return store;
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
    // Get all catalogs flattened to pass to the viewer
    const allCatalogs = Object.values(catalogs).flat();

    return (
      <CatalogViewerLocal
        catalog={activeCatalog}
        relatedCatalogs={allCatalogs}
        onClose={() => setActiveCatalog(null)}
        onSelectCatalog={setActiveCatalog}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Filter - Horizontal Scroll */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedStore(null)}
            className={cn(
              'px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap',
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
                  'px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap',
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
      </div>

      {/* Catalogs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(filteredCatalogs).map(([storeName, storeCatalogs]) =>
          storeCatalogs.map((catalog) => {
            const config = getStoreConfig(storeName);
            const daysRemaining = getDaysRemaining(catalog.validUntil);
            const displayTitle = cleanTitle(catalog.title, config.name);

            return (
              <button
                key={catalog.id}
                onClick={() => setActiveCatalog(catalog)}
                className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-neutral-100 hover:border-primary-200 text-left flex flex-col h-full"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-neutral-100 overflow-hidden w-full">
                  {catalog.thumbnail ? (
                    <Image
                      src={catalog.thumbnail}
                      alt={catalog.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-300">
                      <BookOpen size={48} />
                    </div>
                  )}

                  {/* Page Count Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-sm">
                    {catalog.totalPages} pagini
                  </div>

                  {/* Store Badge (Title overlay) */}
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 p-2 text-white bg-gradient-to-t from-black/80 to-transparent",
                  )}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded shadow-sm bg-gradient-to-r",
                        config.color
                      )}>
                        {config.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Catalog Info - Compact */}
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="font-bold text-neutral-800 text-sm mb-2 line-clamp-2 leading-tight min-h-[2.5rem]">
                    {displayTitle}
                  </h3>

                  <div className="mt-auto space-y-2">
                    {/* Days Remaining Badge */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">
                        <Calendar size={12} className="text-neutral-400" />
                        <span>
                          {formatDate(catalog.validFrom)} - {formatDate(catalog.validUntil)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-neutral-50 pt-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                        daysRemaining > 3
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700 animate-pulse"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", daysRemaining > 3 ? "bg-emerald-500" : "bg-amber-500")} />
                        {daysRemaining > 0 ? `Expiră în ${daysRemaining} zile` : 'Expiră azi'}
                      </span>

                      <span className="text-[11px] font-semibold text-primary-600 group-hover:underline flex items-center">
                        Deschide
                        <ChevronRight size={14} />
                      </span>
                    </div>
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

