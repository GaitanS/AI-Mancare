'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { cn, formatPrice, formatDate, isOfferValid } from '@/lib/utils';
import type { Product } from '@/types';

// Calculate remaining days until offer expires
function getRemainingDays(validUntil: Date): number {
  const now = new Date();
  const end = new Date(validUntil);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Countdown component that updates live
function Countdown({ validUntil }: { validUntil: Date }) {
  const [remainingDays, setRemainingDays] = useState(() => getRemainingDays(validUntil));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingDays(getRemainingDays(validUntil));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [validUntil]);

  if (remainingDays <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs sm:text-sm">
        <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Expirat
      </span>
    );
  }

  if (remainingDays === 1) {
    return (
      <span className="inline-flex items-center gap-1 text-orange-600 font-semibold text-xs sm:text-sm animate-pulse">
        <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Ultima zi!
      </span>
    );
  }

  if (remainingDays <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-orange-500 font-semibold text-xs sm:text-sm">
        <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {remainingDays} zile
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-primary-600 font-medium text-xs sm:text-sm">
      <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

// Store color mapping - Modern gradient colors
const storeColors: Record<string, { gradient: string; solid: string; text: string }> = {
  kaufland: { gradient: 'from-red-500 to-red-600', solid: 'bg-red-500', text: 'text-red-500' },
  lidl: { gradient: 'from-blue-500 to-blue-600', solid: 'bg-blue-500', text: 'text-blue-500' },
  penny: { gradient: 'from-amber-500 to-orange-500', solid: 'bg-amber-500', text: 'text-amber-500' },
  'mega-image': { gradient: 'from-rose-500 to-pink-500', solid: 'bg-rose-500', text: 'text-rose-500' },
  carrefour: { gradient: 'from-sky-500 to-blue-500', solid: 'bg-sky-500', text: 'text-sky-500' },
  auchan: { gradient: 'from-red-500 to-rose-500', solid: 'bg-red-500', text: 'text-red-500' },
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
  const storeStyle = storeColors[storeKey] || { gradient: 'from-gray-500 to-gray-600', solid: 'bg-gray-500', text: 'text-gray-500' };
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
          'group relative flex flex-col h-full bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft hover:shadow-medium hover:border-primary-200 transition-all duration-300 hover:-translate-y-1 overflow-hidden',
          !isValid && 'opacity-60',
          className
        )}
        itemScope
        itemType="https://schema.org/Product"
      >
        {/* Discount Badge - Compact on mobile */}
        {hasDiscount && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
            <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-primary-500 to-emerald-500 text-white shadow-lg shadow-primary-500/30">
              -{product.discountPercentage}%
            </span>
          </div>
        )}

        {/* Store Badge - Compact on mobile */}
        {showStore && (
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10">
            <span
              className={cn(
                'inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-white text-[10px] sm:text-xs font-semibold shadow-md bg-gradient-to-r',
                storeStyle.gradient
              )}
            >
              {product.store}
            </span>
          </div>
        )}

        {/* Product Image - Catalog Page or Placeholder */}
        <div
          className={cn(
            'aspect-product bg-gradient-to-br from-gray-50 to-white rounded-t-2xl flex items-center justify-center overflow-hidden relative',
            hasCatalogImage && 'cursor-pointer'
          )}
          onClick={() => hasCatalogImage && setIsModalOpen(true)}
        >
          {hasCatalogImage ? (
            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-300">
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
                <svg
                  className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
              {/* Page Number Badge - Inside image area */}
              {product.catalogPageNumber && (
                <div className="absolute bottom-2 left-2 z-10">
                  <span className="bg-black/70 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-md">
                    Pag. {product.catalogPageNumber}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-20 h-20 text-gray-300 group-hover:scale-110 transition-transform duration-300">
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
          {/* Category - Hidden on mobile for compactness */}
          <div className="mb-1.5 sm:mb-2 hidden sm:block">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-xs font-medium">
              {product.category}
              {product.subcategory && ` / ${product.subcategory}`}
            </span>
          </div>

          {/* Product Name */}
          <h3
            className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 mb-1 sm:mb-2 group-hover:text-primary-600 transition-colors font-heading"
            itemProp="name"
          >
            {product.name}
          </h3>

          {/* Brand - Smaller on mobile */}
          {product.brand && (
            <p className="text-xs sm:text-sm text-foreground/60 mb-1 sm:mb-2 font-body line-clamp-1" itemProp="brand">
              {product.brand}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Price Section */}
          <div
            className="mt-auto pt-2 sm:pt-3 border-t border-gray-100"
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
          >
            <div className="flex items-end justify-between gap-1 sm:gap-2">
              <div>
                {/* Original Price */}
                {product.originalPrice && hasDiscount && (
                  <p className="text-xs sm:text-sm text-foreground/40 line-through font-body">{formatPrice(product.originalPrice)}</p>
                )}
                {/* Current Price */}
                <p className="text-lg sm:text-xl font-bold text-primary-600 font-heading" itemProp="price" content={product.price.toString()}>
                  {formatPrice(product.price)}
                </p>
                <meta itemProp="priceCurrency" content="RON" />
              </div>

              {/* Unit */}
              <span className="text-xs sm:text-base font-semibold text-foreground/80 whitespace-nowrap font-body bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                / {product.unit}
              </span>
            </div>

            {/* Validity - Compact on mobile */}
            <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
              {/* Date range - Smaller on mobile */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-foreground/70 bg-gray-50 sm:bg-gray-100 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                <svg
                  className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-primary-600 flex-shrink-0"
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
              <div className="flex items-center justify-center bg-gradient-to-r from-primary-50 to-emerald-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-primary-100">
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
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-gray-600 text-white text-sm font-semibold shadow-lg">Oferta expirata</span>
          </div>
        )}
      </article>

      {/* ═══════════════════════════════════════════════════════════════
          REDESIGNED PRODUCT DETAIL MODAL - Premium Editorial Aesthetic
          ═══════════════════════════════════════════════════════════════ */}
      {isModalOpen && hasCatalogImage && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex flex-col",
            isClosing ? "animate-modal-fade-out" : "animate-modal-fade"
          )}
          onClick={closeModal}
        >
          {/* Cinematic dark overlay with noise texture */}
          <div className="absolute inset-0 bg-[#0a0a0a]">
            {/* Subtle noise texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            {/* Subtle vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
          </div>

          {/* ═══ DESKTOP LAYOUT ═══ */}
          <div className="hidden lg:flex relative z-10 h-full items-center justify-center p-8">
            {/* Close button - Top right */}
            <button
              className="absolute top-6 right-6 z-30 group"
              onClick={(e) => {
                e.stopPropagation();
                closeModal();
              }}
              aria-label="Închide"
            >
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-xl transition-all duration-300">
                <svg
                  className="w-6 h-6 text-white/70 group-hover:text-white group-hover:rotate-90 transition-all duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </button>

            {/* Main content container */}
            <div
              className={cn(
                "relative flex max-w-6xl w-full max-h-[85vh] rounded-3xl overflow-hidden",
                "bg-gradient-to-br from-white/[0.08] to-white/[0.02]",
                "border border-white/10 backdrop-blur-sm",
                "shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]",
                isClosing ? "animate-modal-scale-out" : "animate-modal-scale"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left side - Image */}
              <div className="relative w-[55%] bg-black/40">
                {/* Store badge */}
                <div className="absolute top-5 left-5 z-20">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl",
                    "bg-gradient-to-r backdrop-blur-md shadow-lg",
                    storeStyle.gradient
                  )}>
                    <span className="text-white font-bold text-sm tracking-wide uppercase">
                      {product.store}
                    </span>
                    {product.catalogPageNumber && (
                      <>
                        <div className="w-px h-4 bg-white/30" />
                        <span className="text-white/80 text-xs font-medium">
                          Pag. {product.catalogPageNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Catalog image */}
                <div className="relative w-full h-full">
                  <Image
                    src={product.catalogPageImage!}
                    alt={`Catalog ${product.store} - ${product.name}`}
                    fill
                    className="object-contain p-4"
                    sizes="(min-width: 1024px) 55vw"
                    priority
                  />
                </div>
              </div>

              {/* Right side - Product info panel */}
              <div className="relative w-[45%] flex flex-col bg-white">
                {/* Decorative gradient line at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-emerald-400 to-primary-400" />

                <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                  {/* Category tag */}
                  <div className="mb-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider",
                      "bg-gray-100 text-gray-600"
                    )}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {product.category}
                    </span>
                  </div>

                  {/* Product name - Editorial typography */}
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight mb-2 font-heading">
                    {product.name}
                  </h2>

                  {/* Brand */}
                  {product.brand && (
                    <p className="text-base text-gray-500 mb-6 font-body">
                      {product.brand}
                    </p>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Price section - Hero treatment */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    {/* Savings highlight */}
                    {savings > 0 && (
                      <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Economisești</p>
                              <p className="text-lg font-extrabold text-primary-600">{formatPrice(savings)}</p>
                            </div>
                          </div>
                          {/* Discount badge */}
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-xl blur-lg opacity-40 animate-pulse" />
                            <div className="relative px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-emerald-500 text-white font-extrabold text-xl shadow-lg">
                              -{product.discountPercentage}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Price display */}
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        {product.originalPrice && hasDiscount && (
                          <p className="text-lg text-gray-400 line-through font-medium mb-1">
                            {formatPrice(product.originalPrice)}
                          </p>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-gray-900 tracking-tight font-heading">
                            {product.price.toFixed(2).split('.')[0]}
                          </span>
                          <span className="text-2xl font-bold text-gray-900">
                            ,{product.price.toFixed(2).split('.')[1]}
                          </span>
                          <span className="text-xl font-bold text-primary-600 uppercase">RON</span>
                        </div>
                      </div>
                      <span className="text-base font-semibold text-gray-500 px-4 py-2 bg-gray-100 rounded-xl">
                        / {product.unit}
                      </span>
                    </div>

                    {/* Validity period */}
                    <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Valabil</p>
                          <p className="text-sm font-semibold text-gray-700">
                            {formatDate(product.validFrom)} — {formatDate(product.validUntil)}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <Countdown validUntil={new Date(product.validUntil)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ MOBILE LAYOUT ═══ */}
          <div className="lg:hidden flex flex-col h-full relative z-10">
            {/* Header bar */}
            <div className={cn(
              "flex items-center justify-between px-4 py-3 safe-top",
              isClosing ? "animate-fade-out" : "animate-fade-in"
            )}>
              {/* Store badge */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-gradient-to-r shadow-lg",
                storeStyle.gradient
              )}>
                <span className="text-white font-bold text-xs tracking-wide uppercase">
                  {product.store}
                </span>
                {product.catalogPageNumber && (
                  <span className="text-white/70 text-[10px] font-medium border-l border-white/30 pl-2">
                    Pag. {product.catalogPageNumber}
                  </span>
                )}
              </div>

              {/* Close button */}
              <button
                className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-xl border border-white/10 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  closeModal();
                }}
                aria-label="Închide"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image area */}
            <div
              className={cn(
                "flex-1 relative flex items-center justify-center px-2",
                isClosing ? "animate-modal-scale-out" : "animate-modal-scale"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full max-h-[50vh]">
                <Image
                  src={product.catalogPageImage!}
                  alt={`Catalog ${product.store} - ${product.name}`}
                  fill
                  className="object-contain drop-shadow-2xl"
                  sizes="100vw"
                  priority
                />
              </div>
            </div>

            {/* Bottom drawer */}
            <div
              ref={drawerRef}
              className={cn(
                "relative safe-bottom",
                isClosing ? "animate-drawer-slide-down" : "animate-drawer-slide-up"
              )}
              style={{
                transform: touchDelta > 0 ? `translateY(${touchDelta}px)` : undefined,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Gradient fade above drawer */}
              <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />

              {/* Drawer content */}
              <div className="relative bg-white rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.3)]">
                {/* Decorative gradient line */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px] bg-gradient-to-r from-primary-400 via-emerald-400 to-primary-400" />

                {/* Drag handle */}
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-12 h-1.5 rounded-full bg-gray-300" />
                </div>

                <div className="px-5 pb-6">
                  {/* Category */}
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold uppercase tracking-wider">
                      {product.category}
                    </span>
                  </div>

                  {/* Product name */}
                  <h2 className="text-lg font-extrabold text-gray-900 leading-tight tracking-tight mb-1 font-heading line-clamp-2">
                    {product.name}
                  </h2>

                  {/* Brand */}
                  {product.brand && (
                    <p className="text-sm text-gray-500 mb-4 font-body">{product.brand}</p>
                  )}

                  {/* Price row */}
                  <div className="flex items-center justify-between gap-3 py-3 border-y border-gray-100">
                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-gray-900 tracking-tight font-heading">
                        {product.price.toFixed(2).split('.')[0]}
                      </span>
                      <span className="text-xl font-bold text-gray-900">
                        ,{product.price.toFixed(2).split('.')[1]}
                      </span>
                      <span className="text-base font-bold text-primary-600 ml-1">RON</span>
                      {product.originalPrice && hasDiscount && (
                        <span className="text-sm text-gray-400 line-through ml-2">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Discount badge */}
                    {hasDiscount && (
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-xl blur-md opacity-40" />
                        <div className="relative px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-emerald-500 text-white font-extrabold text-base shadow-lg shadow-primary-500/30">
                          -{product.discountPercentage}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Savings + Validity row */}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {/* Savings */}
                    {savings > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 border border-primary-100">
                        <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold text-primary-700">
                          Economisești {formatPrice(savings)}
                        </span>
                      </div>
                    )}

                    {/* Validity */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">
                        {formatDate(product.validFrom)} - {formatDate(product.validUntil)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Skeleton Loading Component
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden animate-pulse">
      <div className="aspect-product bg-gradient-to-br from-gray-100 to-gray-50" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-100 rounded-md w-1/3" />
        <div className="h-5 bg-gray-100 rounded-md w-full" />
        <div className="h-4 bg-gray-100 rounded-md w-2/3" />
        <div className="pt-3 border-t border-gray-100 mt-auto">
          <div className="h-7 bg-primary-100 rounded-md w-1/2" />
          <div className="h-8 bg-gray-50 rounded-lg w-full mt-3" />
        </div>
      </div>
    </div>
  );
}
