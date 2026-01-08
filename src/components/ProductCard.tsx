'use client';

import { useState, useEffect } from 'react';
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
    }, 60000);
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
  const isValid = isOfferValid(new Date(product.validFrom), new Date(product.validUntil));
  const hasDiscount = product.discountPercentage && product.discountPercentage > 0;
  const storeKey = product.store.toLowerCase().replace(' ', '-');
  const storeStyle = storeColors[storeKey] || { gradient: 'from-neutral-500 to-neutral-600', solid: 'bg-neutral-500', text: 'text-neutral-500' };

  return (
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

      {/* Compact Header - no image, just minimal spacing for badges */}
      <div className="h-12 sm:h-14 bg-gradient-to-br from-neutral-50 to-white rounded-t-2xl" />

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
              <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium truncate">
                {formatDate(product.validFrom)} - {formatDate(product.validUntil)}
              </span>
              <meta itemProp="priceValidUntil" content={new Date(product.validUntil).toISOString().split('T')[0]} />
            </div>

            {/* Live Countdown */}
            <div className="flex items-center justify-center bg-gradient-to-r from-primary-50 to-accent-50 px-3 py-2 rounded-xl border border-primary-100/50">
              <Countdown validUntil={new Date(product.validUntil)} />
            </div>
          </div>

          {/* Availability */}
          <meta itemProp="availability" content={isValid ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'} />
        </div>
      </div>

      {/* Expired Overlay */}
      {!isValid && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-neutral-700 text-white text-sm font-bold shadow-lg">Oferta expirata</span>
        </div>
      )}
    </article>
  );
}

// Skeleton Loading Component
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-soft overflow-hidden">
      <div className="h-12 sm:h-14 skeleton-shimmer rounded-t-2xl" />
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

