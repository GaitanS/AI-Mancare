import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';

import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import FilterSidebar, { ProductFilterConfig } from '@/components/FilterSidebar';
import type { Product, ProductFilters } from '@/types';
import type { Metadata } from 'next';

// Valid store slugs
const validStores: Record<string, string> = {
  kaufland: 'Kaufland',
  lidl: 'Lidl',
  penny: 'Penny',
  carrefour: 'Carrefour',
  'mega-image': 'Mega Image',
  auchan: 'Auchan',
};

interface PageProps {
  params: Promise<{ store: string }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    minDiscount?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { store } = await params;
  const storeName = validStores[store];

  if (!storeName) {
    return {
      title: 'Magazin negasit',
    };
  }

  return {
    title: `Cataloage ${storeName} - Cele mai bune reduceri`,
    description: `Descopera cele mai bune oferte si reduceri din ${storeName}. Actualizam zilnic cataloagele pentru tine!`,
    alternates: {
      canonical: `/cataloage/${store}`,
    },
    openGraph: {
      title: `Cataloage ${storeName} - CatalogSmart`,
      description: `Cele mai bune reduceri din ${storeName}, extrase din cataloagele actuale.`,
      url: `/cataloage/${store}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(validStores).map((store) => ({
    store,
  }));
}

// Fetch products for a specific store
async function getStoreProducts(
  storeName: string,
  filters: ProductFilters,
  page: number,
  pageSize: number
) {
  const now = new Date();
  const skip = (page - 1) * pageSize;

  const where: any = {
    store: storeName,
    validFrom: { lte: now },
    validUntil: { gte: now },
  };

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
    products: products.map((p: any) => ({
      ...p,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      extractionConfidence: p.extractionConfidence ? Number(p.extractionConfidence) : null,
      validFrom: p.validFrom.toISOString(),
      validUntil: p.validUntil.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
      allergens: p.allergens as string[] | null,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Get filter options for a specific store
async function getStoreFilterOptions(storeName: string): Promise<ProductFilterConfig> {
  const now = new Date();

  const [categoryGroups, priceStats] = await Promise.all([
    prisma.product.groupBy({
      by: ['category'],
      _count: true,
      where: {
        store: storeName,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    }),
    prisma.product.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: {
        store: storeName,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    }),
  ]);

  return {
    stores: [{ value: storeName, label: storeName, count: 0 }],
    categories: categoryGroups.map((g: any) => ({
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

// Store info and colors
const storeInfo: Record<string, { color: string; description: string }> = {
  Kaufland: {
    color: 'bg-red-600',
    description: 'Hypermarket german cu o gama larga de produse la preturi competitive.',
  },
  Lidl: {
    color: 'bg-blue-700',
    description: 'Discounter german cunoscut pentru ofertele saptamanale atractive.',
  },
  Penny: {
    color: 'bg-red-700',
    description: 'Discounter cu preturi mici si promotii zilnice.',
  },
  Carrefour: {
    color: 'bg-blue-600',
    description: 'Hypermarket francez cu varietate mare de produse.',
  },
  'Mega Image': {
    color: 'bg-red-600',
    description: 'Supermarket de proximitate cu produse proaspete si locale.',
  },
  Auchan: {
    color: 'bg-red-600',
    description: 'Hypermarket cu selectie larga de produse si marci proprii.',
  },
};

export default async function StorePage({ params, searchParams }: PageProps) {
  const { store } = await params;
  const storeName = validStores[store];

  if (!storeName) {
    notFound();
  }

  const search = await searchParams;
  const page = parseInt(search.page || '1', 10);
  const pageSize = 24;

  const filters: ProductFilters = {
    category: search.category,
    minPrice: search.minPrice ? parseFloat(search.minPrice) : undefined,
    maxPrice: search.maxPrice ? parseFloat(search.maxPrice) : undefined,
    minDiscount: search.minDiscount ? parseFloat(search.minDiscount) : undefined,
    search: search.search,
    sortBy: search.sortBy as ProductFilters['sortBy'],
    sortOrder: search.sortOrder as ProductFilters['sortOrder'],
  };

  const [{ products, total, totalPages }, filterOptions] = await Promise.all([
    getStoreProducts(storeName, filters, page, pageSize),
    getStoreFilterOptions(storeName),
  ]);

  const info = storeInfo[storeName];

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeName,
    description: info.description,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro'}/cataloage/${store}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-gray-50 min-h-screen">
        {/* Store Header */}
        <div className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white overflow-hidden mb-8">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

          <div className="relative container-custom py-8 md:py-10 z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>


                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${info.color}`}>
                    <span className="font-bold text-white leading-none">{storeName.charAt(0)}</span>
                  </div>
                  <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Ofertă Specială</span>
                </div>
                <h1 className="font-display text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
                  Cataloage {storeName}
                </h1>
                <p className="text-neutral-400 text-sm md:text-base max-w-lg">
                  {info.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-custom py-8">
          {/* Mobile Filter & Sort (Simplified) */}
          <div className="lg:hidden mb-6 flex flex-col gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200">
              <p className="text-sm font-semibold mb-2">Filtre & Sortare</p>
              {/* Re-using FilterSidebar might be complex if it doesnt support mobile mode natively. 
                        For now, we just stack them or show a message. 
                        In a real scenario, we'd replicate the Retete page pattern perfectly. 
                        Here we'll ensure at least the layout isn't broken. */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {/* Placeholder for mobile filters if needed, or we just rely on the user scrolling down if we keep it visible? 
                            Actually, best to hide the huge sidebar and maybe show a summary or just the sort.
                        */}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filter Sidebar - Desktop Only */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <Suspense fallback={<FilterSidebarSkeleton />}>
                <FilterSidebar
                  type="products"
                  config={filterOptions}
                  className="w-full"
                />
              </Suspense>
            </div>

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
                    {products.map((product: any) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        showStore={false}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Niciun produs gasit"
                    description="Incearca sa modifici filtrele sau revino mai tarziu."
                  />
                )}
              </Suspense>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath={`/cataloage/${store}`}
                  searchParams={search}
                />
              )}
            </div>
          </div>
        </div>

        {/* Other Stores */}
        <section className="bg-white py-12 border-t border-gray-100">
          <div className="container-custom">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Alte magazine
            </h2>
            <div className="flex flex-wrap gap-4">
              {Object.entries(validStores)
                .filter(([slug]) => slug !== store)
                .map(([slug, name]) => (
                  <Link
                    key={slug}
                    href={`/cataloage/${slug}`}
                    className={`px-6 py-3 ${storeInfo[name]?.color || 'bg-gray-600'} text-white font-medium rounded-lg hover:opacity-90 transition-opacity`}
                  >
                    {name}
                  </Link>
                ))}
            </div>
          </div>
        </section>
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
        <li>
          <a
            href={currentPage > 1 ? getPageUrl(currentPage - 1) : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${currentPage > 1
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
              }`}
            aria-disabled={currentPage <= 1}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
        </li>
        {pages.map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className="flex items-center justify-center w-10 h-10 text-gray-400">...</span>
            ) : (
              <a
                href={getPageUrl(page as number)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium ${page === currentPage
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
        <li>
          <a
            href={currentPage < totalPages ? getPageUrl(currentPage + 1) : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${currentPage < totalPages
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
              }`}
            aria-disabled={currentPage >= totalPages}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
