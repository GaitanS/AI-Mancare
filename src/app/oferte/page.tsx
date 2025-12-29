import { Suspense } from 'react';
import prisma from '@/lib/db';
import { cached, productsCache, cacheKeys } from '@/lib/cache';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import FilterSidebar, { ProductFilterConfig } from '@/components/FilterSidebar';
import type { Product, ProductFilters } from '@/types';
import type { Metadata } from 'next';

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

      <div className="bg-gray-50 min-h-screen">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container-custom py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Oferte si Reduceri
            </h1>
            <p className="text-gray-600">
              {total.toLocaleString('ro-RO')} produse in oferta din toate magazinele
            </p>
          </div>
        </div>

        <div className="container-custom py-8">
          <div className="flex gap-8">
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
              {/* Sorting and View Options */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Afisez {products.length} din {total.toLocaleString('ro-RO')} rezultate
                </p>

                <div className="flex items-center gap-4">
                  <label htmlFor="sortBy" className="text-sm text-gray-600">
                    Sorteaza dupa:
                  </label>
                  <SortSelect
                    currentSort={filters.sortBy}
                    currentOrder={filters.sortOrder}
                  />
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

// Sort Select Component
function SortSelect({
  currentSort,
  currentOrder,
}: {
  currentSort?: string;
  currentOrder?: string;
}) {
  const sortOptions = [
    { value: 'created-desc', label: 'Cele mai noi' },
    { value: 'discount-desc', label: 'Reducere (mare -> mic)' },
    { value: 'price-asc', label: 'Pret (mic -> mare)' },
    { value: 'price-desc', label: 'Pret (mare -> mic)' },
    { value: 'name-asc', label: 'Nume (A-Z)' },
  ];

  const currentValue = `${currentSort || 'created'}-${currentOrder || 'desc'}`;

  return (
    <form method="get">
      <select
        name="sort"
        id="sortBy"
        defaultValue={currentValue}
        className="input py-1.5 text-sm w-auto"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn btn-sm ml-2">Aplica</button>
      </noscript>
    </form>
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
    <nav className="mt-8 flex justify-center" aria-label="Paginare">
      <ul className="flex items-center gap-1">
        {/* Previous */}
        <li>
          <a
            href={currentPage > 1 ? getPageUrl(currentPage - 1) : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              currentPage > 1
                ? 'text-gray-700 hover:bg-gray-100'
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
              <span className="flex items-center justify-center w-10 h-10 text-gray-400">
                ...
              </span>
            ) : (
              <a
                href={getPageUrl(page as number)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium ${
                  page === currentPage
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
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
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              currentPage < totalPages
                ? 'text-gray-700 hover:bg-gray-100'
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
      <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-20 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded w-full" />
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
    <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
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
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
