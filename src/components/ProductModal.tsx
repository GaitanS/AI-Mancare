'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { cn, formatPrice, formatDate } from '@/lib/utils';
import type { Product } from '@/types';

// Store color mapping
const storeColors: Record<string, { gradient: string; solid: string; text: string }> = {
  kaufland: { gradient: 'from-[#e10915] to-[#c00812]', solid: 'bg-[#e10915]', text: 'text-[#e10915]' },
  lidl: { gradient: 'from-[#0050aa] to-[#003d82]', solid: 'bg-[#0050aa]', text: 'text-[#0050aa]' },
  penny: { gradient: 'from-[#cd1719] to-[#a81315]', solid: 'bg-[#cd1719]', text: 'text-[#cd1719]' },
  'mega-image': { gradient: 'from-[#e31837] to-[#b8142d]', solid: 'bg-[#e31837]', text: 'text-[#e31837]' },
  carrefour: { gradient: 'from-[#004e9e] to-[#003a76]', solid: 'bg-[#004e9e]', text: 'text-[#004e9e]' },
  auchan: { gradient: 'from-[#e2001a] to-[#b80016]', solid: 'bg-[#e2001a]', text: 'text-[#e2001a]' },
};

// Calculate remaining days until offer expires
function getRemainingDays(validUntil: Date | string): number {
  const now = new Date();
  const end = new Date(validUntil);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Countdown component
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

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hasDiscount = product.discountPercentage && product.discountPercentage > 0;
  const storeKey = product.store.toLowerCase().replace(' ', '-');
  const storeStyle = storeColors[storeKey] || { gradient: 'from-neutral-500 to-neutral-600', solid: 'bg-neutral-500', text: 'text-neutral-500' };

  // Calculate savings
  const savings = product.originalPrice && hasDiscount
    ? product.originalPrice - product.price
    : 0;

  // Close modal with animation
  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  }, [onClose]);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when modal is open
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeModal]);

  if (!mounted || !isOpen || !product.catalogPageImage) {
    return null;
  }

  return createPortal(
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
        aria-label="Inchide"
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
        {/* Image Section */}
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

        {/* Content Section */}
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

            {/* Validity */}
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

          {/* Action Bar */}
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
  );
}

// Loading skeleton for modal
export function ProductModalSkeleton() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-pulse">
      <div className="absolute inset-0 bg-neutral-950/50" />
      <div className="relative w-full max-w-5xl h-[80vh] bg-white rounded-2xl lg:rounded-[2rem] overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full">
          <div className="w-full lg:w-[60%] h-1/2 lg:h-full bg-neutral-100" />
          <div className="flex-1 p-6 space-y-4">
            <div className="h-6 w-20 bg-neutral-200 rounded" />
            <div className="h-8 w-3/4 bg-neutral-200 rounded" />
            <div className="h-32 bg-neutral-100 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
