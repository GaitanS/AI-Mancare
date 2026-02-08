
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import SortSelect from '@/components/SortSelect';
import CatalogViewer from '@/components/CatalogViewer';
import AdSenseBanner from '@/components/AdSenseBanner';
import type { Product, ProductFilters } from '@/types';
import { useSearchParams, useRouter } from 'next/navigation';

const productSortOptions = [
    { value: 'created-desc', label: 'Cele mai noi' },
    { value: 'discount-desc', label: 'Reducere (mare -> mic)' },
    { value: 'price-asc', label: 'Pret (mic -> mare)' },
    { value: 'price-desc', label: 'Pret (mare -> mic)' },
    { value: 'name-asc', label: 'Nume (A-Z)' },
];

interface OffersClientProps {
    initialProducts: Product[];
    initialTotal: number;
    initialFilters: ProductFilters;
    filterConfig: any;
}

export default function OffersClient({
    initialProducts,
    initialTotal,
    initialFilters,
    filterConfig
}: OffersClientProps) {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [catalogData, setCatalogData] = useState<any>(null);
    const [navigation, setNavigation] = useState<{
        prev: { id: string; name: string; catalogPage?: number } | null;
        next: { id: string; name: string; catalogPage?: number } | null;
    }>({ prev: null, next: null });
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Filter sidebar state for mobile
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    // Track if component is mounted to avoid hydration mismatches
    const [isMounted, setIsMounted] = useState(false);

    // Set mounted state after hydration
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Lock body scroll when filter is open
    useEffect(() => {
        if (isFilterOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFilterOpen]);

    // Function to fetch product details including catalog info
    const fetchProductDetails = async (productId: string) => {
        setIsLoadingDetails(true);
        try {
            // Calculate navigation locally based on the filtered list
            const currentIndex = initialProducts.findIndex(p => p.id === productId);

            const prevProduct = currentIndex > 0 ? initialProducts[currentIndex - 1] : null;
            const prev = prevProduct ? { id: prevProduct.id, name: prevProduct.name, catalogPage: prevProduct.catalogPageNumber || undefined } : null;

            const nextProduct = currentIndex < initialProducts.length - 1 ? initialProducts[currentIndex + 1] : null;
            const next = nextProduct ? { id: nextProduct.id, name: nextProduct.name, catalogPage: nextProduct.catalogPageNumber || undefined } : null;

            const res = await fetch(`/api/products/${productId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedProduct(data.product);
                setCatalogData(data.catalog);
                // Use local navigation to keep context of the filtered list
                setNavigation({ prev, next });
                setIsViewerOpen(true);
            }
        } catch (error) {
            console.error("Failed to load product details", error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleProductClick = (product: Product) => {
        fetchProductDetails(product.id);
    };

    return (
        <div className="bg-neutral-50 min-h-screen pb-20">
            {/* Catalog Viewer Popup (only render after mount to avoid hydration mismatch) */}
            {isMounted && selectedProduct && (
                <CatalogViewer
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    product={selectedProduct}
                    catalog={catalogData}
                    navigation={navigation}
                    onNavigate={fetchProductDetails}
                />
            )}

            {/* Mobile Sidebar - slides from right (only render after mount to avoid hydration mismatch) */}
            {isMounted && isFilterOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute top-0 bottom-0 right-0 w-[85%] max-w-sm bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
                        <div className="sticky top-0 bg-white z-10 p-4 border-b flex items-center justify-between">
                            <h2 className="font-bold text-lg">Filtrează</h2>
                            <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <FilterSidebar type="products" config={filterConfig} className="" embedded />
                        </div>
                    </div>
                </div>
            )}

            {/* 1. DESKTOP HEADER (Restored - Full Width) */}
            <div className="hidden lg:block relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 overflow-hidden mb-8 shadow-2xl">
                {/* Animated gradient orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '2s' }} />
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

                <div className="relative max-w-7xl mx-auto py-10 z-10 px-8">
                    <div className="flex items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-orange-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                </div>
                                <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Cataloage Online Actualizate Zilnic</span>
                            </div>
                            <h1 className="font-display text-4xl font-bold text-white mb-2 leading-tight">
                                Catalog Kaufland, Lidl, Penny - Oferte Săptămâna Aceasta
                            </h1>
                            <p className="text-neutral-400 text-base max-w-2xl">
                                Vezi toate <strong className="text-white/80">cataloagele online</strong> din Kaufland, Lidl, Penny și Carrefour.
                                Compară <strong className="text-white/80">prețurile și reducerile</strong> din supermarketuri — actualizat zilnic cu ofertele valabile!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto lg:max-w-7xl">
                {/* 1. COMPACT HEADER */}
                <header className="lg:hidden bg-white sticky top-16 z-40 border-b border-neutral-200">
                    <div className="container mx-auto px-3 h-10 flex items-center justify-between">
                        <h1 className="text-base font-bold text-neutral-900">Cataloage & Oferte</h1>

                        {/* Cart Icon / Action */}
                        <Link href="/cart" className="relative w-10 h-10 flex items-center justify-center text-primary-600 rounded-lg active:bg-neutral-100">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </Link>
                    </div>
                </header>



                {/* 2. COMBINED FILTER & SORT BAR (Mobile Only) */}
                <div className="lg:hidden bg-white sticky top-[104px] z-30 shadow-sm px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    {/* Filter Button */}
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700 whitespace-nowrap active:bg-neutral-200 touch-manipulation"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        Filtre
                    </button>

                    {/* Count */}
                    <div className="text-[10px] font-semibold text-neutral-500 whitespace-nowrap">
                        {initialTotal} oferte
                    </div>

                    {/* Sort Dropdown - Compact */}
                    <div className="flex-shrink-0">
                        <SortSelect
                            options={productSortOptions}
                            currentSort={initialFilters.sortBy || 'created'}
                            currentOrder={initialFilters.sortOrder || 'desc'}
                        />
                    </div>
                </div>

                {/* 3. ADSENSE BANNER - OPTION 1 (Top) - Mobile placement */}
                <div className="px-2 pt-2 lg:hidden">
                    <AdSenseBanner slotId="8962383842" className="min-h-[60px] w-full" />
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:p-4">
                    {/* Desktop Sidebar (Optional - kept for large screens, hidden on mobile) */}
                    <aside className="hidden lg:block w-72 flex-shrink-0">
                        <div className="sticky top-28 space-y-6">
                            <FilterSidebar
                                type="products"
                                config={filterConfig}
                                className=""
                            />
                            {/* Desktop Sidebar Ad */}
                            <AdSenseBanner size="rectangle" className="mt-6" />
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        {/* Desktop Toolbar - Restored */}
                        <div className="hidden lg:flex bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm mb-6 gap-4 items-center justify-between">
                            <p className="text-neutral-600 font-medium">
                                <span className="text-neutral-900 font-bold">{initialTotal}</span> oferte găsite
                            </p>
                            <SortSelect
                                options={productSortOptions}
                                currentSort={initialFilters.sortBy || 'created'}
                                currentOrder={initialFilters.sortOrder || 'desc'}
                            />
                        </div>

                        {/* Product Grid - Responsive Gap */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6">
                            {initialProducts.map((product, index) => (
                                <React.Fragment key={product.id}>
                                    <ProductCard
                                        product={product}
                                        onClick={() => handleProductClick(product)}
                                    />
                                    {/* In-Feed Ad - Mobile: after 4th product */}
                                    {index === 3 && (
                                        <div className="col-span-2 lg:hidden my-2">
                                            <AdSenseBanner size="in-feed" />
                                        </div>
                                    )}
                                    {/* In-Feed Ad - Mobile: after 10th product */}
                                    {index === 9 && (
                                        <div className="col-span-2 lg:hidden my-2">
                                            <AdSenseBanner size="in-feed" />
                                        </div>
                                    )}
                                    {/* In-Feed Ad - Desktop: after every 12th product */}
                                    {(index + 1) % 12 === 0 && index !== initialProducts.length - 1 && (
                                        <div className="hidden lg:flex col-span-3 xl:col-span-4 my-4">
                                            <AdSenseBanner size="banner" className="w-full" />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {initialProducts.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl border border-neutral-200 mt-4">
                                <div className="bg-neutral-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-neutral-900 mb-1">Nu am găsit oferte</h3>
                                <p className="text-sm text-neutral-500">
                                    Încearcă alte filtre.
                                </p>
                            </div>
                        )}
                        <div className="mt-12 border-t border-neutral-200 pt-8 pb-4">
                            <section className="bg-white rounded-xl p-6 border border-neutral-100 shadow-sm">
                                <h2 className="font-display text-xl font-bold text-neutral-900 mb-4">
                                    Întrebări Frecvente despre Cataloage și Oferte
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-bold text-neutral-800 text-sm mb-1">Unde găsesc catalogul Kaufland săptămâna aceasta?</h3>
                                        <p className="text-sm text-neutral-600">Pe CatalogSmart găsești toate ofertele din catalogul Kaufland actualizate zilnic. Avem peste mii de produse disponibile din toate supermarketurile, inclusiv Lidl, Penny și Carrefour.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-800 text-sm mb-1">Când se schimbă catalogul Kaufland?</h3>
                                        <p className="text-sm text-neutral-600">Catalogul Kaufland se schimbă de obicei în fiecare joi. Pe CatalogSmart actualizăm automat toate ofertele imediat ce apar noile cataloage, astfel încât să prinzi cele mai bune reduceri.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-800 text-sm mb-1">Cum pot vedea ofertele Lidl și Penny online?</h3>
                                        <p className="text-sm text-neutral-600">Aici poți vedea toate cataloagele online. Folosește filtrele din stânga (sau butonul "Filtrează" pe mobil) pentru a selecta magazinul dorit - Kaufland, Lidl, Penny, etc. - și vezi instant ce produse sunt la reducere.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-800 text-sm mb-1">Care sunt cele mai bune reduceri din supermarketuri azi?</h3>
                                        <p className="text-sm text-neutral-600">Sortează lista de produse după &quot;Reducere (mare {'→'} mic)&quot; pentru a vedea articolele cu cel mai mare discount procentual. Adesea găsești reduceri de până la 50% la carne, lactate și detergenți.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Bottom Ad */}
                            <div className="mt-8">
                                <AdSenseBanner size="rectangle" className="max-w-xl mx-auto" />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
