'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CatalogData {
    store: string;
    storeName: string;
    pages: string[];
    totalPages: number;
}

const stores = [
    { slug: 'kaufland', name: 'Kaufland', color: 'from-[#e10915] to-[#c00812]' },
    { slug: 'lidl', name: 'Lidl', color: 'from-[#0050aa] to-[#003d82]' },
    { slug: 'penny', name: 'Penny', color: 'from-[#cd1719] to-[#a81315]' },
    { slug: 'carrefour', name: 'Carrefour', color: 'from-[#004e9e] to-[#003a76]' },
    { slug: 'mega-image', name: 'Mega Image', color: 'from-[#e31837] to-[#b8142d]' },
];

export default function CatalogViewer() {
    const [selectedStore, setSelectedStore] = useState(stores[0].slug);
    const [currentPage, setCurrentPage] = useState(1);
    const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const minSwipeDistance = 50;

    // Load catalog data when store changes
    useEffect(() => {
        setIsLoading(true);
        setCurrentPage(1);

        // Simulate API call - in real app this would fetch from /api/catalogs
        setTimeout(() => {
            const mockData = getCatalogPages(selectedStore);
            setCatalogData(mockData);
            setIsLoading(false);
        }, 300);
    }, [selectedStore]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!catalogData) return;

            if (e.key === 'ArrowLeft') {
                handlePreviousPage();
            } else if (e.key === 'ArrowRight') {
                handleNextPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, catalogData]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (catalogData && currentPage < catalogData.totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    // Touch event handlers for swipe
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNextPage();
        } else if (isRightSwipe) {
            handlePreviousPage();
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Store selector skeleton */}
                <div className="flex gap-3 flex-wrap animate-pulse">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-10 w-24 bg-neutral-200 rounded-xl" />
                    ))}
                </div>
                {/* Viewer skeleton */}
                <div className="bg-neutral-200 rounded-2xl animate-pulse" style={{ aspectRatio: '210/297', width: '100%', maxWidth: '800px', margin: '0 auto' }} />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Store Selector Pills - Compact Single Row */}
            <div className="overflow-x-auto scrollbar-hide pb-2">
                <div className="flex gap-2 min-w-max px-1">
                    {stores.map((store) => (
                        <button
                            key={store.slug}
                            onClick={() => setSelectedStore(store.slug)}
                            className={cn(
                                'px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap',
                                selectedStore === store.slug
                                    ? `bg-gradient-to-r ${store.color} text-white shadow-md scale-105`
                                    : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                            )}
                        >
                            {store.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Catalog Viewer */}
            {catalogData && catalogData.totalPages === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary-50 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h3 className="font-display text-xl font-bold text-neutral-900 mb-2">Niciun catalog disponibil</h3>
                    <p className="text-neutral-500">
                        Cataloagele pentru acest magazin nu sunt încă disponibile. Încearcă alt magazin sau revino mai târziu!
                    </p>
                </div>
            ) : catalogData && (
                <div className="w-full max-w-4xl mx-auto">
                    {/* Page Counter */}
                    <div className="text-center mb-1">
                        <span className="text-xs sm:text-sm font-medium text-neutral-600">
                            Pagina {currentPage} / {catalogData.totalPages}
                        </span>
                    </div>

                    {/* Catalog Image with Navigation - Fits in Viewport */}
                    <div
                        className="relative group mx-auto"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        style={{
                            maxHeight: 'calc(100vh - 240px)', // Header (80px) + Store pills (50px) + Counter (30px) + Bottom nav (80px)
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div className="relative w-full h-full flex items-center justify-center">
                            <Image
                                src={catalogData.pages[currentPage - 1]}
                                alt={`${catalogData.storeName} - Pagina ${currentPage}`}
                                width={800}
                                height={1200}
                                className="rounded-lg shadow-warm object-contain"
                                style={{
                                    maxHeight: 'calc(100vh - 240px)',
                                    maxWidth: '100%',
                                    height: 'auto',
                                    width: 'auto'
                                }}
                                priority={currentPage === 1}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                            />
                        </div>

                        {/* Navigation Buttons */}
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className={cn(
                                'absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300',
                                currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 opacity-0 group-hover:opacity-100'
                            )}
                            aria-label="Pagina anterioară"
                        >
                            <svg className="w-6 h-6 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === catalogData.totalPages}
                            className={cn(
                                'absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300',
                                currentPage === catalogData.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 opacity-0 group-hover:opacity-100'
                            )}
                            aria-label="Pagina următoare"
                        >
                            <svg className="w-6 h-6 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Keyboard Hint - Hidden on mobile for space */}
                    <div className="text-center mt-2 text-xs text-neutral-500 hidden lg:block">
                        💡 Folosește săgețile ← → pentru navigare
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper function to get catalog pages from public folder
function getCatalogPages(store: string): CatalogData {
    // Catalog patterns - empty until catalogs are uploaded
    const catalogPatterns: Record<string, { pattern: string; count: number; ext: string }> = {
        // Will be populated when catalogs are scraped
    };

    const config = catalogPatterns[store];

    if (!config) {
        return {
            store,
            storeName: store.charAt(0).toUpperCase() + store.slice(1),
            pages: [],
            totalPages: 0
        };
    }

    const pages = Array.from({ length: config.count }, (_, i) => {
        const pageNum = String(i + 1).padStart(2, '0');
        return `${config.pattern}${pageNum}${config.ext}`;
    });

    return {
        store,
        storeName: store.charAt(0).toUpperCase() + store.slice(1),
        pages,
        totalPages: config.count
    };
}
