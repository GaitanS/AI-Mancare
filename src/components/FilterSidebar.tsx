'use client';

import { useState, useCallback } from 'react';
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
}

export default function FilterSidebar({
  type,
  config,
  className,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

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

  // Check if any filters are active
  const hasActiveFilters = searchParams.toString().length > 0;

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
        <FilterSection title="Magazine">
          <div className="space-y-2">
            {productConfig.stores.map((store) => (
              <label
                key={store.value}
                className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-primary-50/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(getFilterValue('store'))
                      ? getFilterValue('store').includes(store.value)
                      : getFilterValue('store') === store.value
                  }
                  onChange={() => toggleCheckbox('store', store.value)}
                  className="w-4 h-4 rounded-md border-gray-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                />
                <span className="text-sm text-foreground/80 group-hover:text-foreground font-body flex-1">
                  {store.label}
                </span>
                {store.count !== undefined && (
                  <span className="text-xs text-foreground/40 bg-gray-100 px-2 py-0.5 rounded-full font-medium">({store.count})</span>
                )}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Category Filter */}
        <FilterSection title="Categorii">
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {productConfig.categories.map((category) => (
              <label
                key={category.value}
                className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-primary-50/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(getFilterValue('category'))
                      ? getFilterValue('category').includes(category.value)
                      : getFilterValue('category') === category.value
                  }
                  onChange={() => toggleCheckbox('category', category.value)}
                  className="w-4 h-4 rounded-md border-gray-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                />
                <span className="text-sm text-foreground/80 group-hover:text-foreground font-body flex-1">
                  {category.label}
                </span>
                {category.count !== undefined && (
                  <span className="text-xs text-foreground/40 bg-gray-100 px-2 py-0.5 rounded-full font-medium">({category.count})</span>
                )}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Price Range Filter */}
        <FilterSection title="Pret">
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
        <FilterSection title="Reducere minima">
          <div className="space-y-2">
            {[10, 20, 30, 50].map((discount) => (
              <label
                key={discount}
                className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-primary-50/50 transition-colors"
              >
                <input
                  type="radio"
                  name="minDiscount"
                  checked={Number(getFilterValue('minDiscount')) === discount}
                  onChange={() => updateFilter('minDiscount', discount)}
                  className="w-4 h-4 border-gray-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                />
                <span className="text-sm text-foreground/80 group-hover:text-foreground font-body">
                  Minim {discount}%
                </span>
              </label>
            ))}
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
        <FilterSection title="Dificultate">
          <div className="space-y-2">
            {recipeConfig.difficulties.map((difficulty) => (
              <label
                key={difficulty.value}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(getFilterValue('difficulty'))
                      ? getFilterValue('difficulty').includes(difficulty.value)
                      : getFilterValue('difficulty') === difficulty.value
                  }
                  onChange={() => toggleCheckbox('difficulty', difficulty.value)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  {difficulty.label}
                </span>
                {difficulty.count !== undefined && (
                  <span className="text-xs text-gray-400 ml-auto">({difficulty.count})</span>
                )}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Cost Range Filter */}
        <FilterSection title="Cost estimat">
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
        <FilterSection title="Timp de preparare">
          <div className="space-y-2">
            {[15, 30, 60, 120].map((time) => (
              <label
                key={time}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="maxTime"
                  checked={Number(getFilterValue('maxTime')) === time}
                  onChange={() => updateFilter('maxTime', time)}
                  className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Sub {time >= 60 ? `${time / 60} ${time === 60 ? 'ora' : 'ore'}` : `${time} min`}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Tags Filter */}
        {recipeConfig.tags.length > 0 && (
          <FilterSection title="Etichete">
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
                      'px-3 py-1 text-sm rounded-full transition-colors',
                      isSelected
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                    )}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </FilterSection>
        )}
      </>
    );
  };

  return (
    <>
      {/* Mobile Filter Button - Fixed at bottom on mobile for better UX */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all w-auto"
        >
          <svg
            className="w-4 h-4 text-primary-600"
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
          <span className="font-semibold text-sm text-foreground">Filtre</span>
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">!</span>
          )}
        </button>
      </div>

      {/* Mobile Filter Drawer - Full screen on mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-[320px] bg-white shadow-2xl animate-slide-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-foreground font-heading">Filtre</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Inchide"
              >
                <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {type === 'products' ? renderProductFilters() : renderRecipeFilters()}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-white safe-area-inset-bottom">
              <div className="flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground/70 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={!hasActiveFilters}
                >
                  Reseteaza
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-emerald-500 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Aplica
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Filter Sidebar */}
      <aside className={cn('hidden lg:block', className)}>
        <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-foreground font-heading flex items-center gap-2">
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
          <div className="space-y-6">
            {type === 'products' ? renderProductFilters() : renderRecipeFilters()}
          </div>
        </div>
      </aside>
    </>
  );
}

// Filter Section Component
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b border-gray-100 pb-5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-2 text-left group"
      >
        <h3 className="text-sm font-bold text-foreground font-heading group-hover:text-primary-600 transition-colors">{title}</h3>
        <div className={cn(
          'w-6 h-6 rounded-lg flex items-center justify-center transition-all',
          isExpanded ? 'bg-primary-50 text-primary-500' : 'bg-gray-50 text-gray-400'
        )}>
          <svg
            className={cn(
              'w-4 h-4 transition-transform',
              isExpanded ? 'rotate-180' : ''
            )}
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
      {isExpanded && <div className="mt-3">{children}</div>}
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
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={maxValue}
          value={minValue}
          onChange={(e) => onMinChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-foreground font-body focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
          placeholder={`Min ${unit}`}
        />
        <span className="text-foreground/40 font-body">-</span>
        <input
          type="number"
          min={minValue}
          max={max}
          value={maxValue}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-foreground font-body focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
          placeholder={`Max ${unit}`}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={maxValue}
        onChange={(e) => onMaxChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-500"
      />
      <div className="flex justify-between text-xs text-foreground/50 font-body">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

// Export filter config types
export type { ProductFilterConfig, RecipeFilterConfig, FilterOption };
