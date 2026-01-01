'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortSelectProps {
  options: SortOption[];
  currentSort?: string;
  currentOrder?: string;
  className?: string;
}

// Default icons for common sort types
const sortIcons: Record<string, React.ReactNode> = {
  'price-asc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ),
  'price-desc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  ),
  'discount-desc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  'created-desc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'name-asc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ),
  'totalTime-asc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'estimatedCost-asc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function SortSelect({
  options,
  currentSort,
  currentOrder,
  className = '',
}: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentValue = `${currentSort || options[0]?.value.split('-')[0] || 'created'}-${currentOrder || 'desc'}`;
  const currentOption = options.find(opt => opt.value === currentValue) || options[0];

  const handleSelect = useCallback((value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    const params = new URLSearchParams(searchParams.toString());

    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.delete('page'); // Reset to page 1 when sorting changes

    router.push(`?${params.toString()}`, { scroll: false });
    setIsOpen(false);
  }, [router, searchParams]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
          'bg-white border border-neutral-200 text-neutral-700',
          'hover:border-primary-300 hover:shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400',
          isOpen && 'border-primary-400 shadow-sm ring-2 ring-primary-500/20'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Icon */}
          <span className={cn(
            'transition-colors flex-shrink-0',
            isOpen ? 'text-primary-500' : 'text-neutral-400'
          )}>
            {sortIcons[currentValue] || (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            )}
          </span>

          {/* Label */}
          <span className="truncate">{currentOption?.label || 'Sorteaza'}</span>
        </div>

        {/* Chevron */}
        <svg
          className={cn(
            'w-4 h-4 text-neutral-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-primary-500'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 min-w-[200px] bg-white rounded-2xl border border-neutral-100 shadow-elevated overflow-hidden z-50 animate-fade-in-up"
          role="listbox"
        >
          <div className="p-2">
            {options.map((option, index) => {
              const isSelected = option.value === currentValue;

              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isSelected
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  {/* Icon */}
                  <span className={cn(
                    'transition-colors',
                    isSelected ? 'text-primary-500' : 'text-neutral-400'
                  )}>
                    {option.icon || sortIcons[option.value] || (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-left">{option.label}</span>

                  {/* Check icon for selected */}
                  {isSelected && (
                    <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Export types
export type { SortOption };
