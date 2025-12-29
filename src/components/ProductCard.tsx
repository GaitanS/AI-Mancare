'use client';

import Link from 'next/link';
import { cn, formatPrice, formatDate, isOfferValid } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
  showStore?: boolean;
  priority?: boolean;
}

// Store color mapping
const storeColors: Record<string, string> = {
  kaufland: 'bg-red-600',
  lidl: 'bg-blue-700',
  penny: 'bg-red-700',
  'mega-image': 'bg-red-600',
  carrefour: 'bg-blue-600',
  auchan: 'bg-red-600',
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
  const storeColor = storeColors[storeKey] || 'bg-gray-600';

  return (
    <article
      className={cn(
        'card-hover group relative flex flex-col h-full',
        !isValid && 'opacity-60',
        className
      )}
      itemScope
      itemType="https://schema.org/Product"
    >
      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-3 left-3 z-10">
          <span className="badge-discount text-sm font-bold shadow-md">
            -{product.discountPercentage}%
          </span>
        </div>
      )}

      {/* Store Badge */}
      {showStore && (
        <div className="absolute top-3 right-3 z-10">
          <span
            className={cn(
              'badge text-white text-xs font-medium shadow-md',
              storeColor
            )}
          >
            {product.store}
          </span>
        </div>
      )}

      {/* Product Image Placeholder */}
      <div className="aspect-product bg-gradient-to-br from-gray-100 to-gray-50 rounded-t-xl flex items-center justify-center overflow-hidden">
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
      </div>

      {/* Product Info */}
      <div className="flex flex-col flex-1 p-4">
        {/* Category */}
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {product.category}
            {product.subcategory && ` / ${product.subcategory}`}
          </span>
        </div>

        {/* Product Name */}
        <h3
          className="text-base font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors"
          itemProp="name"
        >
          {product.name}
        </h3>

        {/* Brand */}
        {product.brand && (
          <p className="text-sm text-gray-500 mb-2" itemProp="brand">
            {product.brand}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price Section */}
        <div
          className="mt-auto pt-3 border-t border-gray-100"
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <div className="flex items-end justify-between gap-2">
            <div>
              {/* Original Price */}
              {product.originalPrice && hasDiscount && (
                <p className="price-original">{formatPrice(product.originalPrice)}</p>
              )}
              {/* Current Price */}
              <p className="price-current" itemProp="price" content={product.price.toString()}>
                {formatPrice(product.price)}
              </p>
              <meta itemProp="priceCurrency" content="RON" />
            </div>

            {/* Unit */}
            <span className="text-sm text-gray-500 whitespace-nowrap">
              / {product.unit}
            </span>
          </div>

          {/* Validity Period */}
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <svg
              className="w-3.5 h-3.5"
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
            <span>
              {formatDate(product.validFrom)} - {formatDate(product.validUntil)}
            </span>
            <meta
              itemProp="priceValidUntil"
              content={new Date(product.validUntil).toISOString().split('T')[0]}
            />
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
        <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center">
          <span className="badge bg-gray-500 text-white text-sm">Oferta expirata</span>
        </div>
      )}
    </article>
  );
}

// Skeleton Loading Component
export function ProductCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-product bg-gray-200 rounded-t-xl" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="pt-3 border-t border-gray-100 mt-auto">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
        </div>
      </div>
    </div>
  );
}
