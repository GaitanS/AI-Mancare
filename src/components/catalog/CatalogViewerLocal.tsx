'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, BookOpen, Calendar, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface CatalogViewerProps {
    catalog: Catalog;
    relatedCatalogs?: Catalog[];
    onClose?: () => void;
    onSelectCatalog?: (catalog: Catalog) => void;
}

export default function CatalogViewerLocal({
    catalog,
    relatedCatalogs = [],
    onClose,
    onSelectCatalog
}: CatalogViewerProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Reset page when catalog changes
    useEffect(() => {
        setCurrentPage(1);
        setIsLoading(true);
    }, [catalog.id]);

    const totalPages = catalog.localImages?.length || 0;

    const getImageUrl = useCallback((page: number) => {
        if (!catalog.localImages || catalog.localImages.length === 0) return null;
        if (page < 1 || page > totalPages) return null;
        const imageName = catalog.localImages[page - 1];
        return `${catalog.imageBasePath}/${imageName}`;
    }, [catalog, totalPages]);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setIsLoading(true);
            setCurrentPage(page);
        }
    };

    const nextPage = () => goToPage(currentPage + 1);
    const prevPage = () => goToPage(currentPage - 1);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                nextPage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevPage();
            } else if (e.key === 'Escape') {
                if (isFullscreen) {
                    setIsFullscreen(false);
                } else if (onClose) {
                    onClose();
                }
            } else if (e.key === 'f' || e.key === 'F') {
                setIsFullscreen(!isFullscreen);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, totalPages, isFullscreen, onClose]);

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
    }

    function cleanTitle(title: string, storeName: string): string {
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        const store = capitalize(storeName);

        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('alimentar')) return `${store} - Alimentar`;
        if (lowerTitle.includes('non-food') || lowerTitle.includes('nealimentar')) return `${store} - Non-Food`;
        if (lowerTitle.includes('weekend')) return `${store} - Weekend`;
        if (lowerTitle.includes('revista')) return `${store} - Revista`;

        return store;
    }

    const currentImageUrl = getImageUrl(currentPage);

    return (
        <div className="fixed inset-0 z-50 bg-neutral-900/95 flex flex-col md:flex-row overflow-hidden backdrop-blur-sm">

            {/* LEFT SIDEBAR - Related Catalogs (Desktop: Left, Mobile: Bottom order) */}
            <div className="order-2 md:order-1 w-full md:w-80 bg-white md:border-r border-neutral-200 flex flex-col md:h-full h-[30vh]">
                <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                    <h3 className="font-bold text-neutral-800">Alte Cataloage</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {relatedCatalogs
                        .filter(c => c.id !== catalog.id)
                        .map((related) => (
                            <button
                                key={related.id}
                                onClick={() => onSelectCatalog?.(related)}
                                className="w-full flex gap-3 p-2 rounded-lg hover:bg-neutral-100 transition-colors text-left group border border-transparent hover:border-neutral-200"
                            >
                                <div className="relative w-16 h-20 bg-neutral-200 rounded overflow-hidden flex-shrink-0">
                                    {related.thumbnail && (
                                        <Image
                                            src={related.thumbnail}
                                            alt={related.title}
                                            fill
                                            sizes="64px"
                                            className="object-cover group-hover:scale-105 transition-transform"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <h4 className="text-sm font-semibold text-neutral-800 line-clamp-2 leading-tight mb-1">
                                        {cleanTitle(related.title, related.store)}
                                    </h4>
                                    <p className="text-xs text-neutral-500">
                                        {formatDate(related.validFrom)} - {formatDate(related.validUntil)}
                                    </p>
                                </div>
                            </button>
                        ))}

                    {relatedCatalogs.length <= 1 && (
                        <div className="p-4 text-center text-neutral-500 text-sm">
                            Nu există alte cataloage recente.
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN VIEWER AREA */}
            <div className="order-1 md:order-2 flex-1 flex flex-col relative h-[70vh] md:h-full bg-neutral-900">

                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                    <div className="text-white pointer-events-auto">
                        <h2 className="text-lg md:text-xl font-bold leading-tight drop-shadow-md">
                            {cleanTitle(catalog.title, catalog.store)}
                        </h2>
                        <p className="text-sm text-neutral-300 drop-shadow flex items-center gap-2">
                            <Calendar size={14} />
                            {formatDate(catalog.validFrom)} - {formatDate(catalog.validUntil)}
                        </p>
                    </div>

                    {/* Close Button - Prominent */}
                    <button
                        onClick={onClose}
                        className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
                        title="Închide Catalogul"
                    >
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Image Viewer */}
                <div className="flex-1 relative flex items-center justify-center p-4">
                    {/* Page Navigation Buttons - Desktop */}
                    {totalPages > 1 && (
                        <>
                            <button
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md disabled:opacity-30 transition-all hover:scale-110"
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md disabled:opacity-30 transition-all hover:scale-110"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </>
                    )}

                    {/* Image */}
                    <div className="relative w-full h-full max-w-4xl max-h-full flex items-center justify-center">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                            </div>
                        )}

                        {currentImageUrl ? (
                            <div className="relative w-full h-full">
                                <Image
                                    src={currentImageUrl}
                                    alt={`Pagina ${currentPage}`}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                                    className={cn(
                                        "object-contain transition-opacity duration-150",
                                        isLoading ? "opacity-0" : "opacity-100"
                                    )}
                                    // FORCE PRIORITY and BYPASS OPTIMIZATION (serve raw file)
                                    priority={true}
                                    unoptimized={true}
                                    loading="eager"
                                    onLoad={() => setIsLoading(false)}
                                    // Make image touchable on mobile for navigation
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const clickX = e.clientX - rect.left;
                                        if (clickX > rect.width / 2) nextPage();
                                        else prevPage();
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="text-white text-center">
                                <BookOpen size={48} className="mx-auto opacity-50 mb-2" />
                                <p>Imagine indisponibilă</p>
                            </div>
                        )}
                    </div>

                    {/* HIDDEN PRELOADER for next 5 pages */}
                    <div className="hidden" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((offset) => {
                            const nextP = currentPage + offset;
                            if (nextP <= totalPages) {
                                const url = getImageUrl(nextP);
                                if (url) {
                                    return (
                                        <Image
                                            key={nextP}
                                            src={url}
                                            alt=""
                                            width={10}
                                            height={10}
                                            priority={true}
                                            loading="eager"
                                            unoptimized={true}
                                        />
                                    );
                                }
                            }
                            return null;
                        })}
                    </div>

                    {/* Mobile Tap Areas Hints */}
                    <div className="md:hidden absolute inset-x-0 bottom-4 flex justify-between px-8 text-white/50 text-xs pointer-events-none">
                        <span>← Anterior</span>
                        <span>Următor →</span>
                    </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="h-16 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between px-4 md:px-8">
                    <span className="text-neutral-400 text-sm font-medium">
                        {currentPage} / {totalPages}
                    </span>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={prevPage}
                            disabled={currentPage === 1}
                            className="md:hidden p-2 text-white disabled:opacity-30"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        {/* Slider for quick navigation */}
                        <input
                            type="range"
                            min="1"
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => goToPage(parseInt(e.target.value))}
                            className="w-32 md:w-64 accent-primary-500 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                        />

                        <button
                            onClick={nextPage}
                            disabled={currentPage === totalPages}
                            className="md:hidden p-2 text-white disabled:opacity-30"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="text-neutral-400 hover:text-white transition-colors"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
