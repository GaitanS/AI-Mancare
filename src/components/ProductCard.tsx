'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn, formatPrice, formatDate, isOfferValid } from '@/lib/utils';
import { addProductToCart, removeProductFromCart, isProductInCart } from '@/lib/cart-utils';
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
  // Initialize with null to avoid hydration mismatch, then calculate on client
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRemainingDays(getRemainingDays(validUntil));
    const timer = setInterval(() => {
      setRemainingDays(getRemainingDays(validUntil));
    }, 60000);
    return () => clearInterval(timer);
  }, [validUntil]);

  // Show loading state during SSR to avoid hydration mismatch
  if (!mounted || remainingDays === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-primary-600 font-semibold text-xs sm:text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        ...
      </span>
    );
  }

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
  onClick?: () => void;
}

// Store color mapping - Premium gradient colors
const storeColors: Record<string, { gradient: string; solid: string; text: string }> = {
  kaufland: { gradient: 'from-[#e10915] to-[#c00812]', solid: 'bg-[#e10915]', text: 'text-[#e10915]' },
  lidl: { gradient: 'from-[#0050aa] to-[#003d82]', solid: 'bg-[#0050aa]', text: 'text-[#0050aa]' },
  penny: { gradient: 'from-[#cd1719] to-[#a81315]', solid: 'bg-[#cd1719]', text: 'text-[#cd1719]' },
  'mega-image': { gradient: 'from-[#e31837] to-[#b8142d]', solid: 'bg-[#e31837]', text: 'text-[#e31837]' },
  carrefour: { gradient: 'from-[#004e9e] to-[#003a76]', solid: 'bg-[#004e9e]', text: 'text-[#004e9e]' },
  auchan: { gradient: 'from-[#e2001a] to-[#b80016]', solid: 'bg-[#e2001a]', text: 'text-[#e2001a]' },
  selgros: { gradient: 'from-[#d2001e] to-[#a00017]', solid: 'bg-[#d2001e]', text: 'text-[#d2001e]' },
};

export default function ProductCard({
  product,
  className,
  showStore = true,
  priority = false,
  onClick
}: ProductCardProps) {
  const [isInCart, setIsInCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isValid = isOfferValid(new Date(product.validFrom), new Date(product.validUntil));
  const hasDiscount = product.discountPercentage && product.discountPercentage > 0;
  const storeKey = product.store.toLowerCase().replace(' ', '-');
  const storeStyle = storeColors[storeKey] || { gradient: 'from-neutral-500 to-neutral-600', solid: 'bg-neutral-500', text: 'text-neutral-500' };

  // Reset image error when product changes
  useEffect(() => {
    setImageError(false);
  }, [product.catalogPageImage]);

  // Check if product is in cart on mount and listen for updates
  useEffect(() => {
    setIsInCart(isProductInCart(product.name));

    const handleCartUpdate = () => {
      setIsInCart(isProductInCart(product.name));
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [product.name]);

  const handleAddToCartClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    doToggleCart();
  };

  const doToggleCart = () => {
    if (isInCart) {
      // Remove from cart
      removeProductFromCart(product.name);
      setIsInCart(false);
    } else {
      // Add to cart
      addProductToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        discountPercentage: product.discountPercentage,
        store: product.store,
        unit: product.unit,
        imageUrl: product.catalogPageImage,
      });
      setIsInCart(true);
      setJustAdded(true);
      // Reset the animation after a delay
      setTimeout(() => setJustAdded(false), 1500);
    }
  };

  return (
    <article
      onClick={onClick}
      className={cn(
        'group relative flex flex-col h-full bg-white rounded-xl lg:rounded-2xl transition-all duration-300',
        isInCart ? 'border-2 border-foreground shadow-sm lg:shadow-soft' : 'border border-neutral-200/60 shadow-sm lg:shadow-soft',
        'hover:shadow-md lg:hover:shadow-hard hover:border-primary-200 hover:-translate-y-1 lg:hover:-translate-y-1.5 cursor-pointer',
        !isValid && 'opacity-60',
        className
      )}
      itemScope
      itemType="https://schema.org/Product"
    >
      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-2 left-2 lg:top-3 lg:left-3 z-10">
          <span className={cn(
            'inline-flex items-center px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-xl',
            'text-[10px] lg:text-xs font-bold text-white',
            'bg-gradient-to-r from-primary-500 to-primary-600',
            'shadow-sm lg:shadow-warm',
            product.discountPercentage && product.discountPercentage >= 30 && 'animate-pulse-warm'
          )}>
            -{product.discountPercentage}%
          </span>
        </div>
      )}

      {/* Store Badge */}
      {showStore && (
        <div className="absolute top-2 right-2 lg:top-3 lg:right-3 z-10">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-xl',
              'text-white text-[9px] lg:text-[10px] font-bold uppercase tracking-wider',
              'shadow-sm lg:shadow-md bg-gradient-to-r',
              storeStyle.gradient
            )}
          >
            {product.store}
          </span>
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        type="button"
        onClick={handleAddToCartClick}
        className={cn(
          'absolute bottom-2 right-2 lg:bottom-3 lg:right-3 z-20',
          'w-8 h-8 lg:w-9 lg:h-9 rounded-full',
          'flex items-center justify-center',
          'shadow-md transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'touch-manipulation',
          isInCart
            ? 'bg-foreground text-white focus:ring-foreground/50'
            : 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500 hover:scale-110',
          justAdded && 'animate-bounce'
        )}
        title={isInCart ? 'Elimină din listă' : 'Adaugă în listă'}
      >
        {isInCart ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        )}
      </button>

      {/* Catalog Page Image Preview */}
      <div className="relative h-24 lg:h-32 bg-gradient-to-br from-neutral-100 to-neutral-50 rounded-t-xl lg:rounded-t-2xl overflow-hidden">
        {product.catalogPageImage && !imageError ? (
          <>
            <Image
              src={product.catalogPageImage}
              alt={`${product.name} - pagina catalog`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              priority={priority}
              onError={() => setImageError(true)}
            />
            {/* Page number badge */}
            {product.catalogPageNumber && (
              <div className="absolute bottom-1 left-1 lg:bottom-2 lg:left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] lg:text-[10px] text-white font-medium">
                Pag. {product.catalogPageNumber}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 lg:w-10 lg:h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-col flex-1 p-2 lg:p-4">
        {/* Category - Hidden on mobile, Visible on Desktop */}
        <div className="mb-1 lg:mb-2 hidden lg:block">
          <span className="inline-flex items-center px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded bg-primary-50 text-primary-700 text-[10px] lg:text-xs font-semibold">
            {product.category}
            {product.subcategory && ` / ${product.subcategory}`}
          </span>
        </div>

        {/* Product Name */}
        <h3
          className="text-sm lg:text-base font-bold text-neutral-900 line-clamp-2 mb-1 lg:mb-2 group-hover:text-primary-600 transition-colors font-display leading-tight"
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
          className="mt-auto pt-2 lg:pt-3 border-t border-neutral-100/50 lg:border-neutral-100"
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <div className="flex items-end justify-between gap-1 lg:gap-2">
            <div>
              {/* Original Price - Calculated if missing (guard against 100% discount division by zero) */}
              {(product.originalPrice || (hasDiscount && product.discountPercentage && product.discountPercentage < 100)) && (
                <p className="text-[10px] lg:text-sm text-neutral-400 line-through decoration-1 lg:decoration-2">
                  {formatPrice(product.originalPrice || (hasDiscount && product.discountPercentage && product.discountPercentage < 100
                    ? product.price / (1 - product.discountPercentage / 100)
                    : null))}
                </p>
              )}
              {/* Current Price - Compact Mobile / Normal Desktop */}
              <div className="flex items-baseline gap-0.5" itemProp="price" content={product.price.toString()}>
                <span className="text-lg lg:text-3xl font-display font-bold text-primary-600">
                  {product.price.toFixed(2).split('.')[0]}
                </span>
                <span className="text-sm lg:text-lg font-display font-bold text-primary-600">
                  ,{product.price.toFixed(2).split('.')[1]}
                </span>
                <span className="text-[10px] lg:text-sm font-semibold text-primary-500 ml-0.5 lg:ml-1">lei</span>
              </div>
              <meta itemProp="priceCurrency" content="RON" />
            </div>

            {/* Unit - adjusted to leave room for + button */}
            <span className="text-[10px] lg:text-sm font-medium lg:font-semibold text-neutral-500 lg:text-neutral-600 bg-neutral-50 lg:bg-neutral-100 px-1.5 py-0.5 lg:px-2.5 lg:py-1.5 rounded lg:rounded-lg mr-8 lg:mr-9">
              / {product.unit}
            </span>
          </div>

          {/* Validity Countdown */}
          <div className="mt-2 lg:mt-3">
            <div className="flex items-center justify-center bg-gradient-to-r from-primary-50 to-accent-50 px-2 py-1.5 lg:px-3 lg:py-2 rounded-lg lg:rounded-xl border border-primary-100/50">
              <Countdown validUntil={new Date(product.validUntil)} />
            </div>
          </div>

          {/* Availability */}
          <meta itemProp="availability" content={isValid ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'} />
        </div>
      </div>

      {/* Expired Overlay */}
      {!isValid && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl flex items-center justify-center">
          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-neutral-700 text-white text-sm font-bold shadow-lg">Oferta expirata</span>
        </div>
      )}
    </article>
  );
}

// Skeleton Loading Component
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl lg:rounded-2xl border border-neutral-200/60 shadow-soft overflow-hidden">
      <div className="h-24 lg:h-32 skeleton-shimmer rounded-t-xl lg:rounded-t-2xl" />
      <div className="p-2 lg:p-4 space-y-2 lg:space-y-3">
        <div className="h-4 lg:h-5 skeleton-shimmer rounded-lg w-1/3 hidden lg:block" />
        <div className="h-4 lg:h-5 skeleton-shimmer rounded-lg w-full" />
        <div className="h-3 lg:h-4 skeleton-shimmer rounded-lg w-2/3" />
        <div className="pt-2 lg:pt-3 border-t border-neutral-100 mt-auto">
          <div className="h-6 lg:h-8 skeleton-shimmer rounded-lg w-1/2" />
          <div className="h-8 lg:h-10 skeleton-shimmer rounded-xl w-full mt-2 lg:mt-3" />
        </div>
      </div>
    </div>
  );
}
