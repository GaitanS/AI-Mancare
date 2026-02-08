'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

// Filter options types
interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  type: 'checkbox' | 'radio' | 'range';
}

interface ProductFilterConfig {
  stores: FilterOption[];
  categories: FilterOption[];
  priceRange: { min: number; max: number };
  discountRange: { min: number; max: number };
}

interface RecipeFilterConfig {
  difficulties: FilterOption[];
  tags: FilterOption[];
  costRange: { min: number; max: number };
  timeRange: { min: number; max: number };
}

interface FilterSidebarProps {
  type: 'products' | 'recipes';
  config: ProductFilterConfig | RecipeFilterConfig;
  className?: string;
  embedded?: boolean; // When true, don't render mobile button/drawer (used when inside another mobile panel)
}

// Store colors for visual indicators (hex values for inline styles)
const storeColors: Record<string, string> = {
  kaufland: '#e10915',
  lidl: '#0050aa',
  penny: '#cd1719',
  carrefour: '#004e9e',
  'mega-image': '#e31837',
  auchan: '#e2001a',
};

export default function FilterSidebar({
  type,
  config,
  className,
  embedded = false,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when filter drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Get current filter values from URL
  const getFilterValue = useCallback(
    (key: string): string | string[] => {
      const value = searchParams.get(key);
      if (!value) return '';
      return value.includes(',') ? value.split(',') : value;
    },
    [searchParams]
  );

  // Update filters in URL
  const updateFilter = useCallback(
    (key: string, value: string | string[] | number | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, value.toString());
      }

      // Reset to page 1 when filters change
      params.delete('page');

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.push(window.location.pathname, { scroll: false });
  }, [router]);

  // Non-filter params to exclude from active filter count
  const nonFilterParams = new Set(['sortBy', 'sortOrder', 'page', 'pageSize']);

  // Check if any filters are active (excluding sort/pagination params)
  const filterKeys = Array.from(searchParams.keys()).filter(k => !nonFilterParams.has(k));
  const hasActiveFilters = filterKeys.length > 0;

  // Count active filters
  const activeFilterCount = filterKeys.length;

  // Toggle checkbox filter
  const toggleCheckbox = useCallback(
    (key: string, value: string) => {
      const current = getFilterValue(key);
      const currentArray = Array.isArray(current)
        ? current
        : current
          ? [current]
          : [];

      if (currentArray.includes(value)) {
        updateFilter(
          key,
          currentArray.filter((v) => v !== value)
        );
      } else {
        updateFilter(key, [...currentArray, value]);
      }
    },
    [getFilterValue, updateFilter]
  );

  // Render product filters
  const renderProductFilters = () => {
    const productConfig = config as ProductFilterConfig;

    return (
      <>
        {/* Store Filter */}
        <FilterSection title="Magazine" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }>
          <div className="space-y-1">
            {productConfig.stores.map((store) => {
              const isChecked = Array.isArray(getFilterValue('store'))
                ? getFilterValue('store').includes(store.value)
                : getFilterValue('store') === store.value;

              return (
                <label
                  key={store.value}
                  className={cn(
                    'flex items-center gap-3 cursor-pointer group p-2.5 rounded-xl transition-all duration-200',
                    isChecked ? 'bg-primary-50 border border-primary-200' : 'hover:bg-neutral-50 border border-transparent'
                  )}
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheckbox('store', store.value)}
                      className="peer sr-only"
                    />
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 transition-all duration-200',
                      isChecked
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-neutral-300 group-hover:border-neutral-400'
                    )}>
                      {isChecked && (
                        <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{
                        backgroundColor: storeColors[store.value] || '#a3a3a3',
                      }}
                    />
                    <span className={cn(
                      'text-sm font-medium transition-colors',
                      isChecked ? 'text-neutral-900' : 'text-neutral-600 group-hover:text-neutral-900'
                    )}>
                      {store.label}
                    </span>
                  </div>
                  {store.count !== undefined && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                      isChecked ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'
                    )}>
                      {store.count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </FilterSection>

        {/* Category Filter */}
        <FilterSection title="Categorii" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        }>
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {productConfig.categories.map((category) => {
              const isChecked = Array.isArray(getFilterValue('category'))
                ? getFilterValue('category').includes(category.value)
                : getFilterValue('category') === category.value;

              return (
                <label
                  key={category.value}
                  className={cn(
                    'flex items-center gap-3 cursor-pointer group p-2.5 rounded-xl transition-all duration-200',
                    isChecked ? 'bg-primary-50 border border-primary-200' : 'hover:bg-neutral-50 border border-transparent'
                  )}
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheckbox('category', category.value)}
                      className="peer sr-only"
                    />
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 transition-all duration-200',
                      isChecked
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-neutral-300 group-hover:border-neutral-400'
                    )}>
                      {isChecked && (
                        <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-medium transition-colors flex-1',
                    isChecked ? 'text-neutral-900' : 'text-neutral-600 group-hover:text-neutral-900'
                  )}>
                    {category.label}
                  </span>
                  {category.count !== undefined && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      isChecked ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'
                    )}>
                      {category.count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </FilterSection>

        {/* Price Range Filter */}
        <FilterSection title="Pret" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }>
          <RangeFilter
            min={productConfig.priceRange.min}
            max={productConfig.priceRange.max}
            minValue={Number(getFilterValue('minPrice')) || productConfig.priceRange.min}
            maxValue={Number(getFilterValue('maxPrice')) || productConfig.priceRange.max}
            onMinChange={(v) => updateFilter('minPrice', v > productConfig.priceRange.min ? v : null)}
            onMaxChange={(v) => updateFilter('maxPrice', v < productConfig.priceRange.max ? v : null)}
            unit="lei"
          />
        </FilterSection>

        {/* Discount Filter */}
        <FilterSection title="Reducere minima" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        }>
          <div className="grid grid-cols-2 gap-2">
            {[10, 20, 30, 50].map((discount) => {
              const isSelected = Number(getFilterValue('minDiscount')) === discount;

              return (
                <button
                  key={discount}
                  onClick={() => updateFilter('minDiscount', isSelected ? null : discount)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  {discount}%+
                </button>
              );
            })}
          </div>
        </FilterSection>
      </>
    );
  };

  // Render recipe filters
  const renderRecipeFilters = () => {
    const recipeConfig = config as RecipeFilterConfig;

    return (
      <>
        {/* Difficulty Filter */}
        <FilterSection title="Dificultate" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }>
          <div className="flex flex-wrap gap-2">
            {recipeConfig.difficulties.map((difficulty) => {
              const isSelected = Array.isArray(getFilterValue('difficulty'))
                ? getFilterValue('difficulty').includes(difficulty.value)
                : getFilterValue('difficulty') === difficulty.value;

              const colorClass = isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600';

              return (
                <button
                  key={difficulty.value}
                  onClick={() => toggleCheckbox('difficulty', difficulty.value)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  {difficulty.label}
                  {difficulty.count !== undefined && (
                    <span className={cn(
                      'ml-1.5 text-xs',
                      isSelected ? 'text-white/80' : 'text-neutral-400'
                    )}>
                      ({difficulty.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Cost Range Filter */}
        <FilterSection title="Cost estimat" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }>
          <RangeFilter
            min={recipeConfig.costRange.min}
            max={recipeConfig.costRange.max}
            minValue={Number(getFilterValue('minCost')) || recipeConfig.costRange.min}
            maxValue={Number(getFilterValue('maxCost')) || recipeConfig.costRange.max}
            onMinChange={(v) => updateFilter('minCost', v > recipeConfig.costRange.min ? v : null)}
            onMaxChange={(v) => updateFilter('maxCost', v < recipeConfig.costRange.max ? v : null)}
            unit="lei"
          />
        </FilterSection>

        {/* Time Filter */}
        <FilterSection title="Timp de preparare" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }>
          <div className="grid grid-cols-2 gap-2">
            {[15, 30, 60, 120].map((time) => {
              const isSelected = Number(getFilterValue('maxTime')) === time;
              const label = time >= 60 ? `${time / 60}${time === 60 ? 'h' : 'h'}` : `${time}m`;

              return (
                <button
                  key={time}
                  onClick={() => updateFilter('maxTime', isSelected ? null : time)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5',
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  &lt;{label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Tags Filter */}
        {recipeConfig.tags.length > 0 && (
          <FilterSection title="Etichete" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }>
            <div className="flex flex-wrap gap-2">
              {recipeConfig.tags.map((tag) => {
                const isSelected = Array.isArray(getFilterValue('tags'))
                  ? getFilterValue('tags').includes(tag.value)
                  : getFilterValue('tags') === tag.value;

                return (
                  <button
                    key={tag.value}
                    onClick={() => toggleCheckbox('tags', tag.value)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
                      isSelected
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                    )}
                  >
                    #{tag.label}
                  </button>
                );
              })}
            </div>
          </FilterSection>
        )}
      </>
    );
  };

  // When embedded, just render the filter content directly (no mobile button/drawer)
  if (embedded) {
    return (
      <div className={cn('space-y-1', className)}>
        {type === 'recipes' ? renderRecipeFilters() : renderProductFilters()}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden w-full">
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200',
            hasActiveFilters
              ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/20'
              : 'bg-white text-neutral-900 border border-neutral-200 shadow-sm hover:bg-neutral-50'
          )}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filtre
          {activeFilterCount > 0 && (
            <span className={cn(
              'w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold',
              hasActiveFilters ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'
            )}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 right-0 w-full max-w-[340px] bg-white shadow-2xl flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg shadow-neutral-900/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-neutral-900">Filtre</h2>
                  {activeFilterCount > 0 && (
                    <p className="text-xs text-neutral-500">{activeFilterCount} filtre active</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-xl transition-colors"
                aria-label="Inchide"
              >
                <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {type === 'recipes' ? renderRecipeFilters() : renderProductFilters()}
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-neutral-100 bg-white safe-area-inset-bottom">
              <div className="flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-neutral-600 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!hasActiveFilters}
                >
                  Reseteaza
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-neutral-900 rounded-xl shadow-lg shadow-neutral-900/20 hover:bg-neutral-800 hover:shadow-xl transition-all"
                >
                  Aplica filtre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Filter Sidebar */}
      <aside className={cn('hidden lg:block', className)}>
        <div className="sticky top-24 bg-white rounded-2xl border border-neutral-200/80 shadow-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white">
            <h2 className="font-display text-lg font-bold text-neutral-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtre
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reseteaza
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-5 space-y-1">
            {type === 'recipes' ? renderRecipeFilters() : renderProductFilters()}
          </div>
        </div>
      </aside>
    </>
  );
}

// Filter Section Component with Accordion
function FilterSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="pb-5 mb-5 border-b border-neutral-100 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-1 text-left group"
      >
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          {icon && (
            <span className={cn(
              'transition-colors',
              isExpanded ? 'text-primary-500' : 'text-neutral-400'
            )}>
              {icon}
            </span>
          )}
          {title}
        </h3>
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
          isExpanded
            ? 'bg-primary-50 text-primary-500 rotate-180'
            : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200'
        )}>
          <svg
            className="w-4 h-4 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
      )}>
        {children}
      </div>
    </div>
  );
}

// Range Filter Component
function RangeFilter({
  min,
  max,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  unit,
}: {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  unit: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="number"
            min={min}
            max={maxValue}
            value={minValue}
            onChange={(e) => onMinChange(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
            placeholder={`Min`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">
            {unit}
          </span>
        </div>
        <span className="text-neutral-300 font-medium">—</span>
        <div className="relative flex-1">
          <input
            type="number"
            min={minValue}
            max={max}
            value={maxValue}
            onChange={(e) => onMaxChange(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
            placeholder={`Max`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">
            {unit}
          </span>
        </div>
      </div>



      <div className="flex justify-between text-xs text-neutral-400 font-medium">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

// Export filter config types
export type { ProductFilterConfig, RecipeFilterConfig, FilterOption };
