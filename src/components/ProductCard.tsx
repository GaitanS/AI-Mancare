'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { cn, formatPrice, formatDate, isOfferValid } from '@/lib/utils';
import type { Product } from '@/types';

// Calculate remaining days until offer expires
function getRemainingDays(validUntil: Date | string): number {
  const now = new Date();
  const end = new Date(validUntil);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Countdown component that updates live
function Countdown({ validUntil }: { validUntil: Date | string }) {
  const [remainingDays, setRemainingDays] = useState(() => getRemainingDays(validUntil));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingDays(getRemainingDays(validUntil));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [validUntil]);

  if (remainingDays <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger-600 font-bold text-xs sm:text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Expirat
      </span>
    );
  }

  if (remainingDays === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-danger-50 text-danger-600 font-bold text-xs sm:text-sm animate-pulse shadow-sm shadow-danger-500/20">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Ultima zi!
      </span>
    );
  }

  if (remainingDays <= 3) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning-50 text-warning-600 font-bold text-xs sm:text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {remainingDays} zile
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-primary-600 font-semibold text-xs sm:text-sm">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {remainingDays} zile
    </span>
  );
}

interface ProductCardProps {
  product: Product;
  className?: string;
  showStore?: boolean;
  priority?: boolean;
}

// Store color mapping - Premium gradient colors
const storeColors: Record<string, { gradient: string; solid: string; text: string }> = {
  kaufland: { gradient: 'from-[#e10915] to-[#c00812]', solid: 'bg-[#e10915]', text: 'text-[#e10915]' },
  lidl: { gradient: 'from-[#0050aa] to-[#003d82]', solid: 'bg-[#0050aa]', text: 'text-[#0050aa]' },
  penny: { gradient: 'from-[#cd1719] to-[#a81315]', solid: 'bg-[#cd1719]', text: 'text-[#cd1719]' },
  'mega-image': { gradient: 'from-[#e31837] to-[#b8142d]', solid: 'bg-[#e31837]', text: 'text-[#e31837]' },
  carrefour: { gradient: 'from-[#004e9e] to-[#003a76]', solid: 'bg-[#004e9e]', text: 'text-[#004e9e]' },
  auchan: { gradient: 'from-[#e2001a] to-[#b80016]', solid: 'bg-[#e2001a]', text: 'text-[#e2001a]' },
};

export default function ProductCard({
  product,
  className,
  showStore = true,
  priority = false,
}: ProductCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const isValid = isOfferValid(new Date(product.validFrom), new Date(product.validUntil));
  const hasDiscount = product.discountPercentage && product.discountPercentage > 0;
  const storeKey = product.store.toLowerCase().replace(' ', '-');
  const storeStyle = storeColors[storeKey] || { gradient: 'from-neutral-500 to-neutral-600', solid: 'bg-neutral-500', text: 'text-neutral-500' };
  const hasCatalogImage = product.catalogPageImage;

  // Calculate savings
  const savings = product.originalPrice && hasDiscount
    ? product.originalPrice - product.price
    : 0;

  // Close modal with animation
  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setTouchDelta(0);
    }, 300);
  }, []);

  // Handle touch events for swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - touchStart;
    if (delta > 0) {
      setTouchDelta(delta);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (touchDelta > 100) {
      closeModal();
    } else {
      setTouchDelta(0);
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, closeModal]);

  return (
    <>
      <article
        className={cn(
          'group relative flex flex-col h-full bg-white rounded-2xl border border-neutral-200/60',
          'shadow-soft transition-all duration-300',
          'hover:shadow-hard hover:border-primary-200 hover:-translate-y-1.5',
          !isValid && 'opacity-60',
          className
        )}
        itemScope
        itemType="https://schema.org/Product"
      >
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 z-10">
            <span className={cn(
              'inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl',
              'text-xs sm:text-sm font-bold text-white',
              'bg-gradient-to-r from-primary-500 to-primary-600',
              'shadow-warm',
              product.discountPercentage && product.discountPercentage >= 30 && 'animate-pulse-warm'
            )}>
              -{product.discountPercentage}%
            </span>
          </div>
        )}

        {/* Store Badge */}
        {showStore && (
          <div className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-10">
            <span
              className={cn(
                'inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl',
                'text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider',
                'shadow-md bg-gradient-to-r',
                storeStyle.gradient
              )}
            >
              {product.store}
            </span>
          </div>
        )}

        {/* Product Image */}
        <div
          className={cn(
            'aspect-product bg-gradient-to-br from-neutral-50 to-white rounded-t-2xl flex items-center justify-center overflow-hidden relative',
            hasCatalogImage && 'cursor-pointer'
          )}
          onClick={() => hasCatalogImage && setIsModalOpen(true)}
        >
          {hasCatalogImage ? (
            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
              <Image
                src={product.catalogPageImage!}
                alt={`Pagina catalog pentru ${product.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                priority={priority}
              />
              {/* Zoom indicator */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 shadow-lg">
                  <svg
                    className="w-6 h-6 text-neutral-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
              {/* Page Number Badge */}
              {product.catalogPageNumber && (
                <div className="absolute bottom-2 left-2 z-10">
                  <span className="bg-neutral-900/80 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-medium shadow-md">
                    Pag. {product.catalogPageNumber}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-20 h-20 text-neutral-300 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-full h-full"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col flex-1 p-3 sm:p-4">
          {/* Category */}
          <div className="mb-1.5 sm:mb-2 hidden sm:block">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold">
              {product.category}
              {product.subcategory && ` / ${product.subcategory}`}
            </span>
          </div>

          {/* Product Name */}
          <h3
            className="text-sm sm:text-base font-bold text-neutral-900 line-clamp-2 mb-1 sm:mb-2 group-hover:text-primary-600 transition-colors font-display"
            itemProp="name"
          >
            {product.name}
          </h3>

          {/* Brand */}
          {product.brand && (
            <p className="text-xs sm:text-sm text-neutral-500 mb-1 sm:mb-2 line-clamp-1" itemProp="brand">
              {product.brand}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Price Section */}
          <div
            className="mt-auto pt-3 border-t border-neutral-100"
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
          >
            <div className="flex items-end justify-between gap-2">
              <div>
                {/* Original Price */}
                {product.originalPrice && hasDiscount && (
                  <p className="text-xs sm:text-sm text-neutral-400 line-through decoration-2">{formatPrice(product.originalPrice)}</p>
                )}
                {/* Current Price - Split display */}
                <div className="flex items-baseline gap-0.5" itemProp="price" content={product.price.toString()}>
                  <span className="text-2xl sm:text-3xl font-display font-bold text-primary-600">
                    {product.price.toFixed(2).split('.')[0]}
                  </span>
                  <span className="text-base sm:text-lg font-display font-bold text-primary-600">
                    ,{product.price.toFixed(2).split('.')[1]}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-primary-500 ml-1">lei</span>
                </div>
                <meta itemProp="priceCurrency" content="RON" />
              </div>

              {/* Unit */}
              <span className="text-xs sm:text-sm font-semibold text-neutral-600 bg-neutral-100 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg">
                / {product.unit}
              </span>
            </div>

            {/* Validity */}
            <div className="mt-3 space-y-2">
              {/* Date range */}
              <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded-xl">
                <svg
                  className="w-4 h-4 text-primary-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium truncate">
                  {formatDate(product.validFrom)} - {formatDate(product.validUntil)}
                </span>
                <meta
                  itemProp="priceValidUntil"
                  content={new Date(product.validUntil).toISOString().split('T')[0]}
                />
              </div>

              {/* Live Countdown */}
              <div className="flex items-center justify-center bg-gradient-to-r from-primary-50 to-accent-50 px-3 py-2 rounded-xl border border-primary-100/50">
                <Countdown validUntil={new Date(product.validUntil)} />
              </div>
            </div>

            {/* Availability */}
            <meta
              itemProp="availability"
              content={isValid ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}
            />
          </div>
        </div>

        {/* Expired Overlay */}
        {!isValid && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <span className="inline-flex items-center px-4 py-2 rounded-xl bg-neutral-700 text-white text-sm font-bold shadow-lg">Oferta expirata</span>
          </div>
        )}
      </article>

      {/* Modal - Render via Portal to escape parent transforms */}
      {typeof window !== 'undefined' && isModalOpen && hasCatalogImage && createPortal(
        <div
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-10",
            isClosing ? "animate-modal-fade-out" : "animate-modal-fade"
          )}
          onClick={closeModal}
        >
          {/* Dark overlay backdrop */}
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md" />

          {/* Close button (global) */}
          <button
            className="absolute top-4 right-4 sm:top-8 sm:right-8 z-[10001] group"
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
            aria-label="Închide"
          >
            <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-xl transition-all duration-300">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </button>

          {/* Main content container */}
          <div
            className={cn(
              "relative w-full max-w-5xl h-full max-h-[90vh] lg:max-h-[80vh] flex flex-col lg:flex-row bg-white rounded-2xl lg:rounded-[2rem] overflow-hidden shadow-2xl z-[10000]",
              isClosing ? "animate-modal-scale-out" : "animate-modal-scale"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Section - Left (Desktop) / Top (Mobile) */}
            <div className="relative w-full lg:w-[60%] h-[25vh] sm:h-[40vh] lg:h-full bg-neutral-50 flex items-center justify-center p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-neutral-100 text-left flex-shrink-0">
              <div className="absolute top-3 left-3 z-30">
                <span className={cn("px-2.5 py-1 rounded-lg text-white font-bold text-[10px] lg:text-xs uppercase shadow-md", storeStyle.solid)}>
                  {product.store}
                </span>
              </div>

              <div className="relative w-full h-full">
                <Image
                  src={product.catalogPageImage!}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
              </div>
            </div>

            {/* Content Section - Right (Desktop) / Bottom (Mobile) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden text-left">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 z-10" />

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-4 lg:space-y-6">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2">
                    {product.category}
                  </span>
                  <h2 className="text-xl sm:text-3xl font-display font-bold text-neutral-900 leading-tight">
                    {product.name}
                  </h2>
                  {product.brand && <p className="text-sm lg:text-lg text-neutral-500 mt-1">{product.brand}</p>}
                </div>

                {/* Pricing Block */}
                <div className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-neutral-50 border border-neutral-100 space-y-3 lg:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {product.originalPrice && hasDiscount && (
                        <p className="text-base lg:text-lg text-neutral-400 line-through font-medium mb-0.5">
                          {formatPrice(product.originalPrice)}
                        </p>
                      )}
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-4xl lg:text-5xl font-display font-black text-neutral-900">
                          {product.price.toFixed(2).split('.')[0]}
                        </span>
                        <span className="text-xl lg:text-2xl font-display font-bold text-neutral-900">
                          ,{product.price.toFixed(2).split('.')[1]}
                        </span>
                        <span className="text-base lg:text-xl font-bold text-primary-600 uppercase ml-1">lei</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs lg:text-sm font-semibold text-neutral-500 block mb-1">per {product.unit}</span>
                      {hasDiscount && (
                        <span className="inline-block bg-primary-600 text-white font-black px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl text-lg lg:text-xl shadow-warm">
                          -{product.discountPercentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  {savings > 0 && (
                    <div className="pt-3 lg:pt-4 border-t border-neutral-200 flex items-center gap-2 lg:gap-3">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-success-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="font-bold text-sm lg:text-base text-success-700 leading-tight">Economisesti {formatPrice(savings)}!</p>
                    </div>
                  )}
                </div>

                {/* Validity and Other Details */}
                <div className="space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl lg:rounded-2xl bg-white border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] lg:text-xs text-neutral-500 font-bold uppercase tracking-wider">Perioada oferta</p>
                        <p className="text-xs lg:text-sm font-semibold text-neutral-800">
                          {formatDate(product.validFrom)} — {formatDate(product.validUntil)}
                        </p>
                      </div>
                    </div>
                    <Countdown validUntil={new Date(product.validUntil)} />
                  </div>
                </div>
              </div>

              {/* Action Bar - Compact */}
              <div className="p-4 lg:p-6 border-t border-neutral-100 bg-neutral-50/80 backdrop-blur-sm flex items-center justify-between mt-auto">
                <p className="text-[10px] lg:text-xs text-neutral-400 italic hidden sm:block">Pret raft variabil.</p>
                <button
                  onClick={closeModal}
                  className="w-full sm:w-auto px-6 py-2.5 bg-neutral-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg text-sm"
                >
                  Inchide
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Skeleton Loading Component
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-soft overflow-hidden">
      <div className="aspect-product skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-5 skeleton-shimmer rounded-lg w-1/3" />
        <div className="h-5 skeleton-shimmer rounded-lg w-full" />
        <div className="h-4 skeleton-shimmer rounded-lg w-2/3" />
        <div className="pt-3 border-t border-neutral-100 mt-auto">
          <div className="h-8 skeleton-shimmer rounded-lg w-1/2" />
          <div className="h-10 skeleton-shimmer rounded-xl w-full mt-3" />
        </div>
      </div>
    </div>
  );
}
