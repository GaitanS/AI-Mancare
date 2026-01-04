'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Acasa', href: '/' },
  { name: 'Plan', href: '/plan' },
  { name: 'Oferte', href: '/cataloage' },
  { name: 'Cataloage', href: '/cataloage-digitale' },
  { name: 'Retete', href: '/retete' },
  { name: 'Lista', href: '/cart' },
  { name: 'Profil', href: '/profile' },
];

const stores = [
  { name: 'Kaufland', href: '/cataloage/kaufland', color: 'from-[#e10915] to-[#c00812]' },
  { name: 'Lidl', href: '/cataloage/lidl', color: 'from-[#0050aa] to-[#003d82]' },
  { name: 'Penny', href: '/cataloage/penny', color: 'from-[#cd1719] to-[#a81315]' },
  { name: 'Carrefour', href: '/cataloage/carrefour', color: 'from-[#004e9e] to-[#003a76]' },
  { name: 'Mega Image', href: '/cataloage/mega-image', color: 'from-[#e31837] to-[#b8142d]' },
  { name: 'Auchan', href: '/cataloage/auchan', color: 'from-[#e2001a] to-[#b80016]' },
];

export default function Header() {
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

  // Close dropdown on route change
  useEffect(() => {
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
        <div className="flex items-center justify-center lg:justify-between h-16 md:h-18">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3.5 focus-ring rounded-xl group"
          >
            <div className="w-14 h-14 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="CatalogSmart Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="hidden sm:flex items-baseline gap-1">
              <span className="text-xl font-display font-bold text-foreground">Catalog</span>
              <span className="text-xl font-display font-bold text-gradient-warm">Smart</span>
            </span>
          </Link>

          {/* Desktop Navigation - Hidden on Mobile/Tablet (lg) */}
          <div className="hidden lg:flex items-center gap-1">
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
                  pathname.startsWith('/cataloage/') && stores.some(s => pathname.includes(s.href))
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

          {/* Search Bar - Desktop Only */}
          <div className="hidden lg:block flex-1 max-w-md mx-6">
            <SearchBar />
          </div>
        </div>
      </nav>
    </header>
  );
}
