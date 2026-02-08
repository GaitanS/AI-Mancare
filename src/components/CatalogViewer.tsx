
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Store, Calendar, Tag, ShoppingCart, Check } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { addProductToCart, isProductInCart } from '@/lib/cart-utils';

interface CatalogViewerProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    catalog: any;
    navigation: {
        prev: { id: string, name: string, catalogPage?: number } | null;
        next: { id: string, name: string, catalogPage?: number } | null;
    };
    onNavigate: (productId: string) => void;
}

export default function CatalogViewer({ isOpen, onClose, product, catalog, navigation, onNavigate }: CatalogViewerProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [touchStart, setTouchStart] = useState(0);
    const [touchOffset, setTouchOffset] = useState(0);
    const router = useRouter();
    const imageRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const [inCart, setInCart] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    // Reset state when product changes
    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setInCart(isProductInCart(product.name));
        setJustAdded(false);
    }, [product.id, product.name]);

    // Lock body scroll when viewer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowLeft' && navigation.prev) goToProduct(navigation.prev.id);
            if (e.key === 'ArrowRight' && navigation.next) goToProduct(navigation.next.id);
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, navigation, onClose, onNavigate]);

    if (!isOpen) return null;

    // Determine current image URL
    // catalogPage is 1-based index. catalog.images is array [0..N]
    const pageIndex = (product.catalogPageNumber || product.catalogPage || 1) - 1;
    const imageUrl = catalog?.images?.[pageIndex] || null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
    const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    // Mouse events for panning
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            e.preventDefault();
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    // Navigation handlers
    const goToProduct = (id: string) => {
        onNavigate(id);
    };

    // Touch handlers for swipe-down to dismiss (mobile only)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (zoom > 1) return; // Don't interfere with panning when zoomed
        setTouchStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (zoom > 1 || touchStart === 0) return;
        const currentTouch = e.touches[0].clientY;
        const diff = currentTouch - touchStart;
        if (diff > 0) { // Only track downward swipes
            setTouchOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        if (touchOffset > 150) { // Threshold for dismissal
            onClose();
        }
        setTouchStart(0);
        setTouchOffset(0);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bottom-16 md:bottom-0 bg-neutral-900/80 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Bottom Sheet Container - Mobile / Full Screen Modal - Desktop */}
            <div
                ref={sheetRef}
                className={`fixed left-0 right-0 z-[9999] bg-background md:bg-neutral-900/95 transition-transform duration-300 ease-out
                    inset-0 bottom-16 md:bottom-0 flex flex-col md:flex-row md:items-center md:justify-center
                    ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
                    ${isOpen ? '' : 'md:opacity-0 md:pointer-events-none'}
                    overflow-hidden`}
                style={{
                    transform: touchOffset > 0 ? `translateY(${touchOffset}px)` : undefined,
                    transition: touchOffset > 0 ? 'none' : undefined
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Swipe Handle - Mobile Only */}
                <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-neutral-400 rounded-full z-[10002]" />

                {/* Main Container */}
                <div className="relative flex flex-col md:flex-row w-full h-full max-w-[1920px] mx-auto overflow-hidden">

                    {/* Close Button - Global */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-[10001] w-11 h-11 md:w-auto md:h-auto md:p-2 flex items-center justify-center bg-neutral-900/90 hover:bg-neutral-900 text-neutral-200 rounded-full transition-colors shadow-elevated backdrop-blur-sm border border-neutral-700 touch-manipulation"
                    >
                        <X size={24} />
                    </button>

                    {/* Left Side: Catalog Viewer (Available Space) */}
                    <div className="flex-1 relative bg-neutral-800 flex items-center justify-center h-full transition-all overflow-hidden">
                        {/* Zoom Controls */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-neutral-900/90 backdrop-blur-sm rounded-full p-1.5 md:p-2 border border-neutral-700 shadow-elevated">
                            <button onClick={handleZoomOut} className="p-2.5 md:p-2 hover:bg-neutral-700 rounded-full text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation" disabled={zoom <= 1}>
                                <ZoomOut size={20} />
                            </button>
                            <span className="text-neutral-200 text-sm font-mono self-center px-2 font-medium">{Math.round(zoom * 100)}%</span>
                            <button onClick={handleZoomIn} className="p-2.5 md:p-2 hover:bg-neutral-700 rounded-full text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation" disabled={zoom >= 2}>
                                <ZoomIn size={20} />
                            </button>
                            {zoom > 1 && (
                                <button onClick={handleResetZoom} className="px-3 text-xs hover:bg-neutral-700 rounded-full text-neutral-200 bg-neutral-800 ml-1 transition-colors">
                                    Reset
                                </button>
                            )}
                        </div>

                        {/* Navigation Arrows (Overlay on Catalog) */}
                        {navigation.prev && (
                            <button
                                onClick={() => goToProduct(navigation.prev!.id)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-neutral-900/90 hover:bg-neutral-900 text-neutral-200 rounded-full transition-all group shadow-elevated backdrop-blur-sm border border-neutral-700"
                            >
                                <ChevronLeft size={32} />
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 bg-neutral-900/95 backdrop-blur-sm p-3 rounded-lg hidden group-hover:block text-xs shadow-elevated border border-neutral-700">
                                    <div className="font-bold text-neutral-400 mb-1">Anteriorul</div>
                                    <div className="truncate text-neutral-200">{navigation.prev.name}</div>
                                </div>
                            </button>
                        )}
                        {navigation.next && (
                            <button
                                onClick={() => goToProduct(navigation.next!.id)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-neutral-900/90 hover:bg-neutral-900 text-neutral-200 rounded-full transition-all group shadow-elevated backdrop-blur-sm border border-neutral-700"
                            >
                                <ChevronRight size={32} />
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 w-48 bg-neutral-900/95 backdrop-blur-sm p-3 rounded-lg hidden group-hover:block text-xs text-right shadow-elevated border border-neutral-700">
                                    <div className="font-bold text-neutral-400 mb-1">Următorul</div>
                                    <div className="truncate text-neutral-200">{navigation.next.name}</div>
                                </div>
                            </button>
                        )}

                        {/* Image Viewer Area */}
                        <div
                            ref={imageRef}
                            className={`relative w-full h-full flex items-center justify-center overflow-hidden ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onWheel={(e) => {
                                if (e.ctrlKey) {
                                    e.preventDefault();
                                    e.deltaY > 0 ? handleZoomOut() : handleZoomIn();
                                }
                            }}
                        >
                            {imageUrl ? (
                                <div
                                    style={{
                                        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                                    }}
                                    className="relative max-w-[95%] max-h-[95%] select-none"
                                >
                                    <img
                                        src={imageUrl}
                                        alt={`Page ${product.catalogPageNumber || product.catalogPage}`}
                                        className="object-contain max-h-[90vh] w-auto shadow-2xl"
                                        draggable={false}
                                    />
                                </div>
                            ) : (
                                <div className="text-neutral-400 flex flex-col items-center">
                                    <p className="font-body">Pagina catalogului nu este disponibilă</p>
                                </div>
                            )}
                        </div>

                        {/* Page Indicator */}
                        {/* Page Indicator Removed as per request */}
                    </div>

                    {/* Right Side / Bottom: Product Details */}
                    <div className="w-full h-auto md:h-full md:w-[400px] lg:w-[450px] shrink-0 bg-background backdrop-blur-xl border-t md:border-t-0 md:border-l border-neutral-200 flex flex-col z-20 md:z-auto shadow-[0_-2px_4px_-1px_rgba(0,0,0,0.05)] md:shadow-none">
                        <div className="p-3 md:p-6 h-full flex flex-col">
                            {/* Product Name - Compact */}
                            <div className="mb-2 md:mb-4 pr-12">
                                <h2 className="text-base md:text-2xl font-display font-bold mb-1 leading-tight text-foreground truncate">{product.name}</h2>
                                <div className="flex items-center gap-2 text-neutral-600 text-xs md:text-sm font-body">
                                    <span className="bg-secondary-100 text-secondary-700 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium border border-secondary-200">
                                        {product.category}
                                    </span>
                                    <span>• {product.unit}</span>
                                </div>
                            </div>

                            {/* Price Block - Ultra Compact */}
                            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 p-2 md:p-5 rounded-lg md:rounded-2xl border border-neutral-200 shadow-sm md:shadow-soft mb-2 md:mb-4">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="text-neutral-600 text-[10px] md:text-xs font-medium uppercase tracking-wider mb-px md:mb-1">Preț</div>
                                        <div className="flex items-baseline gap-1 md:gap-2">
                                            <span className="text-2xl md:text-4xl font-display font-bold text-primary-600">{Number(product.price).toFixed(2)}</span>
                                            <span className="text-sm md:text-lg font-bold text-neutral-700">RON</span>
                                        </div>
                                    </div>
                                    {product.discountPercentage && (
                                        <div className="bg-primary-500 text-white text-[10px] md:text-sm font-bold px-2 md:px-3 py-0.5 md:py-1.5 rounded md:rounded-lg shadow-sm">
                                            -{product.discountPercentage}%
                                        </div>
                                    )}
                                </div>
                                {product.originalPrice && (
                                    <div className="mt-px md:mt-2">
                                        <span className="line-through text-neutral-500 text-[10px] md:text-sm font-medium">{Number(product.originalPrice).toFixed(2)} RON</span>
                                    </div>
                                )}
                            </div>

                            {/* Store & Validity - Ultra Compact Row */}
                            <div className="flex items-center justify-between gap-2 bg-neutral-50 px-2 md:px-3 py-1.5 md:py-2 rounded md:rounded-lg border border-neutral-200 text-[10px] md:text-sm">
                                <div className="flex items-center gap-1.5 text-neutral-700 truncate">
                                    <Store size={12} className="text-primary-500 shrink-0 md:w-4 md:h-4" />
                                    <span className="font-medium truncate">{catalog?.store}</span>
                                </div>
                                <div className="h-3 md:h-4 w-px bg-neutral-300 shrink-0"></div>
                                <div className="flex items-center gap-1.5 text-neutral-700 whitespace-nowrap">
                                    <Calendar size={12} className="text-accent-500 shrink-0 md:w-4 md:h-4" />
                                    <span>
                                        {new Date(product.validFrom).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} - {new Date(product.validUntil).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Add to Cart Button */}
                            <button
                                onClick={() => {
                                    addProductToCart({
                                        id: product.id,
                                        name: product.name,
                                        price: Number(product.price),
                                        originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
                                        discountPercentage: product.discountPercentage || null,
                                        store: catalog?.store || '',
                                        unit: product.unit,
                                        imageUrl: product.catalogPageImage || null,
                                    });
                                    setInCart(true);
                                    setJustAdded(true);
                                    setTimeout(() => setJustAdded(false), 2000);
                                }}
                                className={`mt-3 md:mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all touch-manipulation ${
                                    inCart
                                        ? 'bg-foreground hover:bg-foreground/90 text-white'
                                        : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md'
                                }`}
                            >
                                {inCart ? (
                                    <>
                                        <Check size={18} className={justAdded ? 'animate-bounce' : ''} />
                                        {justAdded ? 'Adăugat!' : 'În coș'}
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={18} />
                                        Adaugă în coș
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
