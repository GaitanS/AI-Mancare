'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn, formatPrice, normalizeDifficulty } from '@/lib/utils';
import type { Product, Recipe } from '@/types';

interface SearchResult {
  products: Product[];
  recipes: Recipe[];
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.data);
          setIsOpen(true);
        } else {
          setResults(null);
          setIsOpen(false);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside - only when open
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        setIsOpen(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    },
    []
  );

  const totalResults = results
    ? results.products.length + results.recipes.length
    : 0;

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="search-input" className="sr-only">
          Cauta produse sau retete
        </label>
        <div className="relative group">
          <input
            ref={inputRef}
            id="search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (results) setIsOpen(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Cauta produse sau retete..."
            className={cn(
              'w-full pl-11 pr-4 py-3 rounded-xl',
              'bg-white border border-neutral-300 shadow-sm',
              'text-neutral-900 placeholder:text-neutral-500',
              'transition-all duration-300',
              'focus:outline-none focus:bg-white focus:border-primary-500',
              'focus:ring-4 focus:ring-primary-500/20',
              isFocused && 'border-primary-500 ring-4 ring-primary-500/20'
            )}
            autoComplete="off"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-neutral-300 border-t-primary-500 rounded-full animate-spin" />
            ) : (
              <svg
                className={cn(
                  'w-5 h-5 transition-colors duration-200',
                  isFocused ? 'text-primary-500' : 'text-neutral-400'
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>
          {/* Keyboard shortcut hint */}
          <div className="hidden md:flex absolute inset-y-0 right-3 items-center pointer-events-none">
            {!query && !isFocused && (
              <kbd className="px-2 py-1 text-xs font-medium text-neutral-400 bg-neutral-100 rounded-md border border-neutral-200">
                /
              </kbd>
            )}
          </div>
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && results && totalResults > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-elevated border border-neutral-100 overflow-hidden z-50 animate-fade-in-up"
          role="listbox"
        >
          {/* Products Section */}
          {results.products.length > 0 && (
            <div>
              <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Produse
                </h3>
              </div>
              <ul className="py-1">
                {results.products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/oferte/${product.store.toLowerCase()}?product=${product.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-200 transition-colors">
                        <svg
                          className="w-5 h-5 text-neutral-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
                          {product.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {product.store} &middot; {product.category}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-sm font-bold text-primary-600">
                          {formatPrice(product.price)}
                        </p>
                        {product.discountPercentage && product.discountPercentage > 0 && (
                          <span className="badge-discount text-[10px] px-2 py-0.5">
                            -{product.discountPercentage}%
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recipes Section */}
          {results.recipes.length > 0 && (
            <div>
              <div className={cn(
                'px-4 py-2.5 bg-neutral-50 border-b border-neutral-100',
                results.products.length > 0 && 'border-t'
              )}>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Retete
                </h3>
              </div>
              <ul className="py-1">
                {results.recipes.map((recipe) => (
                  <li key={recipe.id}>
                    <Link
                      href={`/retete/${recipe.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                        <svg
                          className="w-5 h-5 text-primary-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
                          {recipe.title}
                        </p>
                        <p className="text-xs text-neutral-500 flex items-center gap-2">
                          <span className={cn(
                            'inline-block w-1.5 h-1.5 rounded-full',
                            normalizeDifficulty(recipe.difficulty) === 'USOR' ? 'bg-success-500' :
                              normalizeDifficulty(recipe.difficulty) === 'MEDIU' ? 'bg-warning-500' : 'bg-danger-500'
                          )} />
                          {normalizeDifficulty(recipe.difficulty) === 'USOR' ? 'Ușor' : normalizeDifficulty(recipe.difficulty) === 'MEDIU' ? 'Mediu' : 'Dificil'}
                          &middot; {recipe.totalTime} min
                        </p>
                      </div>
                      {recipe.estimatedCost && (
                        <p className="text-sm font-bold text-primary-600">
                          ~{formatPrice(recipe.estimatedCost)}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* View All Results */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-emerald-50 border-t border-neutral-100">
            <button
              onClick={() => {
                if (query.trim()) {
                  setIsOpen(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Vezi toate rezultatele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && results && totalResults === 0 && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-elevated border border-neutral-100 p-6 z-50 animate-fade-in-up"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-900 mb-1">
              Niciun rezultat gasit
            </p>
            <p className="text-xs text-neutral-500">
              Incearca cu alte cuvinte cheie
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
