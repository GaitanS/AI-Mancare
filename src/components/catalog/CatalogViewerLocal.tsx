/**
 * Catalog Viewer Component
 * Displays catalog pages from locally hosted images
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Catalog {
    id: string;
    store: string;
    title: string;
    slug: string;
    validFrom: string;
    validUntil: string;
    totalPages: number;
    imageBasePath: string;
    localImages: string[];
}

interface CatalogViewerProps {
    catalog: Catalog;
    onClose?: () => void;
}

export default function CatalogViewerLocal({ catalog, onClose }: CatalogViewerProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const totalPages = catalog.localImages?.length || 0;

    const getCurrentImageUrl = useCallback(() => {
        if (!catalog.localImages || catalog.localImages.length === 0) {
            return null;
        }
        const pageIndex = currentPage - 1;
        const imageName = catalog.localImages[pageIndex];
        return `${catalog.imageBasePath}/${imageName}`;
    }, [catalog, currentPage]);

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

    const imageUrl = getCurrentImageUrl();

    if (!imageUrl) {
        return (
            <div className="flex items-center justify-center h-96 bg-stone-100 dark:bg-stone-800 rounded-lg">
                <p className="text-stone-500">Nu există imagini pentru acest catalog.</p>
            </div>
        );
    }

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'relative'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 ${isFullscreen ? 'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent z-10' : 'bg-stone-100 dark:bg-stone-800 rounded-t-lg'}`}>
                <div>
                    <h2 className={`font-semibold ${isFullscreen ? 'text-white' : 'text-stone-900 dark:text-white'}`}>
                        {catalog.title}
                    </h2>
                    <p className={`text-sm ${isFullscreen ? 'text-stone-300' : 'text-stone-500'}`}>
                        {catalog.store} • Valabil până la {new Date(catalog.validUntil).toLocaleDateString('ro-RO')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className={`p-2 rounded-lg transition-colors ${isFullscreen ? 'text-white hover:bg-white/20' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                        title={isFullscreen ? 'Ieșire din ecran complet (F)' : 'Ecran complet (F)'}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isFullscreen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            )}
                        </svg>
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${isFullscreen ? 'text-white hover:bg-white/20' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Image Container */}
            <div className={`relative ${isFullscreen ? 'h-screen' : 'h-[600px]'} flex items-center justify-center bg-stone-200 dark:bg-stone-900`}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-stone-800">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    </div>
                )}

                <Image
                    src={imageUrl}
                    alt={`${catalog.title} - Pagina ${currentPage}`}
                    fill
                    className="object-contain"
                    onLoad={() => setIsLoading(false)}
                    priority
                />

                {/* Navigation Arrows */}
                {currentPage > 1 && (
                    <button
                        onClick={prevPage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {currentPage < totalPages && (
                    <button
                        onClick={nextPage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Footer - Page Navigation */}
            <div className={`flex items-center justify-center gap-4 p-4 ${isFullscreen ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent' : 'bg-stone-100 dark:bg-stone-800 rounded-b-lg'}`}>
                <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isFullscreen ? 'text-white hover:bg-white/20' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                </button>

                <div className={`flex items-center gap-2 ${isFullscreen ? 'text-white' : ''}`}>
                    <span className="text-sm">Pagina</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-center rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white"
                    />
                    <span className="text-sm">din {totalPages}</span>
                </div>

                <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isFullscreen ? 'text-white hover:bg-white/20' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Keyboard Hints */}
            <div className={`text-center py-2 text-xs ${isFullscreen ? 'absolute bottom-20 left-0 right-0 text-stone-400' : 'text-stone-500'}`}>
                ← → pentru navigare • F pentru ecran complet • Esc pentru închidere
            </div>
        </div>
    );
}
