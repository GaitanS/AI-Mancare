'use client';

import React, { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import CatalogViewer from '@/components/CatalogViewer';
import type { Product } from '@/types';

interface FeaturedOffersSectionProps {
    offers: Product[];
}

export default function FeaturedOffersSection({ offers }: FeaturedOffersSectionProps) {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [catalogData, setCatalogData] = useState<any>(null);
    const [navigation, setNavigation] = useState({ prev: null, next: null });
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Function to fetch product details including catalog info
    const fetchProductDetails = async (productId: string) => {
        setIsLoadingDetails(true);
        try {
            // Calculate navigation locally based on the filtered list
            const currentIndex = offers.findIndex(p => p.id === productId);

            const prevProduct = currentIndex > 0 ? offers[currentIndex - 1] : null;
            const prev = prevProduct ? { id: prevProduct.id, name: prevProduct.name, catalogPage: prevProduct.catalogPageNumber || undefined } : null;

            const nextProduct = currentIndex < offers.length - 1 ? offers[currentIndex + 1] : null;
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

    if (offers.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary-100">
                    <svg
                        className="w-10 h-10 text-primary-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">Nicio oferta disponibila</h3>
                <p className="text-neutral-600">Revino curand pentru noi oferte!</p>
            </div>
        );
    }

    return (
        <>
            {/* Catalog Viewer Popup */}
            {selectedProduct && (
                <CatalogViewer
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    product={selectedProduct}
                    catalog={catalogData}
                    navigation={navigation}
                    onNavigate={fetchProductDetails}
                />
            )}

            {/* Loading Overlay */}
            {isLoadingDetails && (
                <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-4 rounded-full shadow-xl">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {offers.map((product, index) => (
                    <div key={product.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                        <ProductCard
                            product={product}
                            onClick={() => handleProductClick(product)}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}
