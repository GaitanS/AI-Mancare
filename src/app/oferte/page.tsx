import { Suspense } from 'react';
import prisma from '@/lib/db';
import { cached, productsCache, cacheKeys } from '@/lib/cache';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import FilterSidebar, { ProductFilterConfig } from '@/components/FilterSidebar';
import SortSelect from '@/components/SortSelect';
import type { Product, ProductFilters } from '@/types';
import type { Metadata } from 'next';

// Sort options for products page
const productSortOptions = [
  { value: 'created-desc', label: 'Cele mai noi' },
  { value: 'discount-desc', label: 'Reducere (mare -> mic)' },
  { value: 'price-asc', label: 'Pret (mic -> mare)' },
  { value: 'price-desc', label: 'Pret (mare -> mic)' },
  { value: 'name-asc', label: 'Nume (A-Z)' },
];

export const metadata: Metadata = {
  title: 'Oferte - Cele mai bune reduceri din supermarketuri',
  description:
    'Descopera cele mai bune oferte si reduceri din Kaufland, Lidl, Penny, Carrefour, Mega Image si Auchan. Actualizam zilnic preturile pentru tine!',
  alternates: {
    canonical: '/oferte',
  },
  openGraph: {
    title: 'Oferte - Retete Ieftine',
    description: 'Cele mai bune reduceri din supermarketuri, actualizate zilnic.',
    url: '/oferte',
  },
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    store?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    minDiscount?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

// Fetch products with filters
async function getProducts(filters: ProductFilters, page: number, pageSize: number) {
  const now = new Date();
  const skip = (page - 1) * pageSize;

  const where: any = {
    validFrom: { lte: now },
    validUntil: { gte: now },
  };

  if (filters.store) {
    where.store = {
      in: filters.store.split(',').map((s) => s.trim()),
    };
  }

  if (filters.category) {
    where.category = {
      in: filters.category.split(',').map((c) => c.trim()),
    };
  }

  if (filters.minPrice) {
    where.price = { ...where.price, gte: filters.minPrice };
  }

  if (filters.maxPrice) {
    where.price = { ...where.price, lte: filters.maxPrice };
  }

  if (filters.minDiscount) {
    where.discountPercentage = { gte: filters.minDiscount };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { brand: { contains: filters.search, mode: 'insensitive' } },
      { category: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: any = {};
  switch (filters.sortBy) {
    case 'price':
      orderBy.price = filters.sortOrder || 'asc';
      break;
    case 'discount':
      orderBy.discountPercentage = filters.sortOrder || 'desc';
      break;
    case 'name':
      orderBy.name = filters.sortOrder || 'asc';
      break;
    case 'created':
    default:
      orderBy.createdAt = filters.sortOrder || 'desc';
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      ...p,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
      allergens: p.allergens as string[] | null,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Get filter options
async function getFilterOptions(): Promise<ProductFilterConfig> {
  const now = new Date();

  const [storeGroups, categoryGroups, priceStats] = await Promise.all([
    prisma.product.groupBy({
      by: ['store'],
      _count: true,
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    }),
    prisma.product.groupBy({
      by: ['category'],
      _count: true,
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    }),
    prisma.product.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    }),
  ]);

  return {
    stores: storeGroups.map((g) => ({
      value: g.store,
      label: g.store,
      count: g._count,
    })),
    categories: categoryGroups.map((g) => ({
      value: g.category,
      label: g.category,
      count: g._count,
    })),
    priceRange: {
      min: Number(priceStats._min.price) || 0,
      max: Number(priceStats._max.price) || 1000,
    },
    discountRange: {
      min: 0,
      max: 100,
    },
  };
}

export default async function OfertePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = 24;

  const filters: ProductFilters = {
    store: params.store,
    category: params.category,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    minDiscount: params.minDiscount ? parseFloat(params.minDiscount) : undefined,
    search: params.search,
    sortBy: params.sortBy as ProductFilters['sortBy'],
    sortOrder: params.sortOrder as ProductFilters['sortOrder'],
  };

  const [{ products, total, totalPages }, filterOptions] = await Promise.all([
    getProducts(filters, page, pageSize),
    getFilterOptions(),
  ]);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Oferte si Reduceri Supermarketuri',
    description: 'Cele mai bune oferte din supermarketurile din Romania',
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro'}/oferte`,
    numberOfItems: total,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-background min-h-screen">
        {/* Page Header - Compact on mobile */}
        <div className="relative bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800 overflow-hidden">
          {/* Animated background blobs - smaller on mobile */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 w-40 sm:w-60 h-40 sm:h-60 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
            <div className="absolute -bottom-10 sm:-bottom-20 -left-10 sm:-left-20 w-40 sm:w-60 h-40 sm:h-60 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
          </div>
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] sm:bg-[size:30px_30px]" />

          <div className="container-custom py-6 sm:py-12 relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <span className="text-white/80 text-xs sm:text-sm font-medium font-body">Catalog oferte</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 font-heading">
              Oferte si{' '}
              <span className="bg-gradient-to-r from-primary-300 to-emerald-300 bg-clip-text text-transparent">
                Reduceri
              </span>
            </h1>
            <p className="text-white/80 font-body flex items-center gap-2 text-sm sm:text-base">
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold">
                {total.toLocaleString('ro-RO')}
              </span>
              <span className="hidden sm:inline">produse in oferta din toate magazinele</span>
              <span className="sm:hidden">produse</span>
            </p>
          </div>
        </div>

        <div className="container-custom py-4 sm:py-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            {/* Filter Sidebar */}
            <Suspense fallback={<FilterSidebarSkeleton />}>
              <FilterSidebar
                type="products"
                config={filterOptions}
                className="w-64 flex-shrink-0"
              />
            </Suspense>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Sorting and View Options - Mobile optimized */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm text-foreground/60 font-body">
                    <span className="font-semibold text-foreground">{products.length}</span> / <span className="font-semibold text-foreground">{total.toLocaleString('ro-RO')}</span>
                    <span className="hidden sm:inline"> rezultate</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <label htmlFor="sortBy" className="text-xs sm:text-sm text-foreground/60 font-body hidden sm:block">
                      Sorteaza:
                    </label>
                    <SortSelect
                      options={productSortOptions}
                      currentSort={filters.sortBy}
                      currentOrder={filters.sortOrder}
                    />
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <Suspense fallback={<ProductsGridSkeleton />}>
                {products.length > 0 ? (
                  <div className="grid-products">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Niciun produs gasit"
                    description="Incearca sa modifici filtrele sau cauta alt produs."
                  />
                )}
              </Suspense>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath="/oferte"
                  searchParams={params}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') {
        params.set(key, value);
      }
    });
    params.set('page', page.toString());
    return `${basePath}?${params.toString()}`;
  };

  const pages: (number | string)[] = [];
  const showPages = 5;

  if (totalPages <= showPages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  return (
    <nav className="mt-10 flex justify-center" aria-label="Paginare">
      <ul className="flex items-center gap-2 bg-white rounded-2xl shadow-soft border border-gray-100 p-2">
        {/* Previous */}
        <li>
          <a
            href={currentPage > 1 ? getPageUrl(currentPage - 1) : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
              currentPage > 1
                ? 'text-foreground hover:bg-primary-50 hover:text-primary-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            aria-disabled={currentPage <= 1}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </a>
        </li>

        {/* Pages */}
        {pages.map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className="flex items-center justify-center w-10 h-10 text-foreground/40">
                ...
              </span>
            ) : (
              <a
                href={getPageUrl(page as number)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                  page === currentPage
                    ? 'bg-gradient-to-r from-primary-500 to-emerald-500 text-white shadow-md shadow-primary-500/30'
                    : 'text-foreground hover:bg-primary-50 hover:text-primary-600'
                }`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </a>
            )}
          </li>
        ))}

        {/* Next */}
        <li>
          <a
            href={currentPage < totalPages ? getPageUrl(currentPage + 1) : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
              currentPage < totalPages
                ? 'text-foreground hover:bg-primary-50 hover:text-primary-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            aria-disabled={currentPage >= totalPages}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </li>
      </ul>
    </nav>
  );
}

// Skeleton components
function FilterSidebarSkeleton() {
  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 animate-pulse">
        <div className="h-6 bg-gray-100 rounded-lg w-20 mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-100 rounded-lg w-16 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-5 bg-gray-50 rounded-lg w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsGridSkeleton() {
  return (
    <div className="grid-products">
      {Array.from({ length: 24 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-soft">
      <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-primary-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2 font-heading">{title}</h3>
      <p className="text-foreground/60 font-body">{description}</p>
    </div>
  );
}
