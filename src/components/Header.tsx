'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Acasa', href: '/' },
  { name: 'Rețete', href: '/plan' },
  { name: 'Oferte', href: '/oferte' },
  { name: 'Magazine', href: '/cataloage-digitale' },
  { name: 'Lista', href: '/cart' },
];

const stores = [
  { name: 'Kaufland', href: '/oferte/kaufland', color: 'from-[#e10915] to-[#c00812]' },
  { name: 'Lidl', href: '/oferte/lidl', color: 'from-[#0050aa] to-[#003d82]' },
  { name: 'Penny', href: '/oferte/penny', color: 'from-[#cd1719] to-[#a81315]' },
  { name: 'Profi', href: '/oferte/profi', color: 'from-[#e4002b] to-[#b80022]' },
  { name: 'Carrefour', href: '/oferte/carrefour', color: 'from-[#004e9e] to-[#003a76]' },
  { name: 'Mega Image', href: '/oferte/mega-image', color: 'from-[#e31837] to-[#b8142d]' },
  { name: 'Auchan', href: '/oferte/auchan', color: 'from-[#e2001a] to-[#b80016]' },
  { name: 'Selgros', href: '/oferte/selgros', color: 'from-[#003366] to-[#002244]' },
];

export default function Header() {
  const [isStoresDropdownOpen, setIsStoresDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const blurTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsStoresDropdownOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

  // Handle mobile search submit
  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
      setIsMobileSearchOpen(false);
      setMobileSearchQuery('');
    }
  };

  return (
    <>
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

            {/* Mobile Search Button */}
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors focus-ring"
              aria-label="Caută produse"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

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
                  onBlur={() => {
                    blurTimeoutRef.current = setTimeout(() => setIsStoresDropdownOpen(false), 200);
                  }}
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

            {/* Search Bar - Desktop Only */}
            <div className="hidden lg:block flex-1 max-w-md mx-6">
              <SearchBar />
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Full-Screen Search Overlay - Outside header to avoid stacking context issues */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white lg:hidden">
          <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="flex items-center gap-3 p-4 border-b border-neutral-100">
              <button
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setMobileSearchQuery('');
                }}
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"
                aria-label="Închide căutarea"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <form onSubmit={handleMobileSearch} className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={mobileSearchQuery}
                    onChange={(e) => setMobileSearchQuery(e.target.value)}
                    placeholder="Caută produse, rețete..."
                    autoFocus
                    className="w-full h-10 pl-10 pr-3 bg-neutral-100 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </form>
            </div>

            {/* Quick Links */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Căutări populare</p>
              <div className="flex flex-wrap gap-2">
                {['Carne', 'Lactate', 'Fructe', 'Legume', 'Pâine', 'Băuturi'].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(term)}`);
                      setIsMobileSearchOpen(false);
                    }}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm font-medium text-neutral-700 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 mt-6">Magazine</p>
              <div className="space-y-1">
                {stores.map((store) => (
                  <Link
                    key={store.name}
                    href={store.href}
                    onClick={() => setIsMobileSearchOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <span className={cn('w-3 h-3 rounded-full bg-gradient-to-r', store.color)} />
                    <span className="font-medium text-neutral-800">{store.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
