'use client';

import { useState } from 'react';
import Image from 'next/image';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isValid = isOfferValid(new Date(product.validFrom), new Date(product.validUntil));
  const hasDiscount = product.discountPercentage && product.discountPercentage > 0;
  const storeKey = product.store.toLowerCase().replace(' ', '-');
  const storeColor = storeColors[storeKey] || 'bg-gray-600';
  const hasCatalogImage = product.catalogPageImage;

  return (
    <>
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

        {/* Product Image - Catalog Page or Placeholder */}
        <div
          className={cn(
            'aspect-product bg-gradient-to-br from-gray-100 to-gray-50 rounded-t-xl flex items-center justify-center overflow-hidden',
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

        {/* Page Number Badge */}
        {product.catalogPageNumber && (
          <div className="absolute bottom-[140px] left-3 z-10">
            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full">
              Pag. {product.catalogPageNumber}
            </span>
          </div>
        )}

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

      {/* Full-size Image Modal */}
      {isModalOpen && hasCatalogImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            onClick={() => setIsModalOpen(false)}
            aria-label="Închide"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Product info header */}
          <div className="absolute top-4 left-4 text-white z-10">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-300">
              {product.store} - Pagina {product.catalogPageNumber}
            </p>
          </div>

          {/* Image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={product.catalogPageImage!}
              alt={`Pagina catalog pentru ${product.name}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Price badge in modal */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg px-6 py-3 shadow-xl">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{product.name}</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="badge-discount">-{product.discountPercentage}%</span>
              )}
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
