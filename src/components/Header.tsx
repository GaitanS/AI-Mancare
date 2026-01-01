'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Acasa', href: '/' },
  { name: 'Oferte', href: '/oferte' },
  { name: 'Retete', href: '/retete' },
];

const stores = [
  { name: 'Kaufland', href: '/oferte/kaufland', color: 'from-[#e10915] to-[#c00812]' },
  { name: 'Lidl', href: '/oferte/lidl', color: 'from-[#0050aa] to-[#003d82]' },
  { name: 'Penny', href: '/oferte/penny', color: 'from-[#cd1719] to-[#a81315]' },
  { name: 'Carrefour', href: '/oferte/carrefour', color: 'from-[#004e9e] to-[#003a76]' },
  { name: 'Mega Image', href: '/oferte/mega-image', color: 'from-[#e31837] to-[#b8142d]' },
  { name: 'Auchan', href: '/oferte/auchan', color: 'from-[#e2001a] to-[#b80016]' },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStoresDropdownOpen, setIsStoresDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsStoresDropdownOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-md border-b border-neutral-200/50'
          : 'bg-white/80 backdrop-blur-lg border-b border-neutral-100'
      )}
    >
      <nav className="container-custom" aria-label="Navigare principala">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-ring rounded-xl group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-warm group-hover:shadow-lg transition-shadow">
              {/* Kitchen pot icon */}
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <span className="hidden sm:flex items-baseline gap-1">
              <span className="text-xl font-display font-bold text-foreground">Retete</span>
              <span className="text-xl font-display font-bold text-gradient-warm">Ieftine</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-ring',
                  pathname === item.href
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-neutral-800 hover:text-black hover:bg-neutral-100'
                )}
              >
                {item.name}
              </Link>
            ))}

            {/* Stores Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsStoresDropdownOpen(!isStoresDropdownOpen)}
                onBlur={() => setTimeout(() => setIsStoresDropdownOpen(false), 200)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-ring',
                  pathname.startsWith('/oferte/') && stores.some(s => pathname.includes(s.href))
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-neutral-800 hover:text-black hover:bg-neutral-100'
                )}
                aria-expanded={isStoresDropdownOpen}
                aria-haspopup="true"
              >
                Magazine
                <svg
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isStoresDropdownOpen ? 'rotate-180' : ''
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
              </button>

              {isStoresDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-elevated border border-neutral-100 p-2 animate-fade-in-up">
                  <div className="grid gap-1">
                    {stores.map((store) => (
                      <Link
                        key={store.name}
                        href={store.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors group"
                      >
                        <span className={cn(
                          'w-2 h-2 rounded-full bg-gradient-to-r shadow-sm',
                          store.color
                        )} />
                        <span className="group-hover:text-black transition-colors">
                          {store.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:block flex-1 max-w-md mx-6">
            <SearchBar />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                'p-2.5 rounded-xl transition-all duration-200 focus-ring',
                isMobileMenuOpen
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              )}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Inchide meniu' : 'Deschide meniu'}
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-100 animate-fade-in-up">
            {/* Mobile Search */}
            <div className="mb-4">
              <SearchBar />
            </div>

            {/* Mobile Navigation */}
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all',
                    pathname === item.href
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Mobile Stores */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Magazine
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {stores.map((store) => (
                  <Link
                    key={store.name}
                    href={store.href}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full bg-gradient-to-r shadow-sm',
                      store.color
                    )} />
                    {store.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
