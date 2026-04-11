import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';

import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import FilterSidebar, { ProductFilterConfig } from '@/components/FilterSidebar';
import SortSelect from '@/components/SortSelect';
import type { Product, ProductFilters } from '@/types';
import type { Metadata } from 'next';
import { generateBreadcrumbSchema } from '@/lib/seo/schema-generators';
import { getPriceTrendsBatch } from '@/lib/price-history';

// Valid store slugs
const validStores: Record<string, string> = {
  kaufland: 'Kaufland',
  lidl: 'Lidl',
  penny: 'Penny',
  carrefour: 'Carrefour',
  'mega-image': 'Mega Image',
  auchan: 'Auchan',
  profi: 'Profi',
  selgros: 'Selgros',
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

// Store-specific keywords from GSC data
const storeKeywords: Record<string, string[]> = {
  kaufland: [
    'catalog kaufland actual', 'catalog kaufland', 'catalog kaufland saptamana aceasta',
    'oferte kaufland', 'kaufland catalog actual', 'kaufland preturi la zi',
    'catalog kaufland online actual', 'kaufland oferte azi',
  ],
  lidl: [
    'catalog lidl actual', 'catalog lidl', 'lidl catalog actual', 'pliant lidl actual',
    'revista lidl actuala', 'oferte lidl', 'lidl oferte', 'catalog lidl saptamana aceasta',
    'catalog saptamanal lidl', 'lidl ro catalog',
  ],
  penny: [
    'catalog penny actual', 'catalog penny', 'oferte penny', 'penny catalog',
    'promotii penny', 'catalog penny saptamana aceasta',
  ],
  carrefour: [
    'catalog carrefour actual', 'catalog carrefour', 'oferte carrefour',
    'promotii carrefour', 'carrefour oferta', 'carrefour catalog nou', 'reduceri carrefour',
  ],
  'mega-image': [
    'catalog mega image actual', 'catalog mega image', 'mega image catalog',
    'oferte mega image', 'mega image catalog actual', 'oferte mega image azi',
    'mega image catalog nou',
  ],
  auchan: [
    'catalog auchan actual', 'catalog auchan', 'auchan catalog', 'oferte auchan',
    'auchan catalog nou', 'auchan catalog oferte',
  ],
  profi: [
    'catalog profi actual', 'oferte profi', 'profi catalog', 'profi piept de pui',
  ],
  selgros: [
    'catalog selgros', 'oferte selgros', 'selgros catalog',
  ],
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { store } = await params;
  const resolvedSearchParams = await searchParams;
  const storeName = validStores[store];

  if (!storeName) {
    return {
      title: 'Magazin negasit',
    };
  }

  const monthYear = new Date().toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  const pageNum = parseInt(resolvedSearchParams.page || '1', 10);
  const isPaginated = pageNum > 1;
  const keywords = storeKeywords[store] || [];

  return {
    title: `Catalog ${storeName} Actual ${monthYear} - Oferte și Reduceri Săptămâna Aceasta`,
    description: `Catalog ${storeName} ${monthYear} actualizat zilnic cu toate ofertele și reducerile săptămânii. Descoperă promoțiile active și economisește până la 50% la ${storeName}!`,
    keywords: keywords.join(', '),
    alternates: {
      canonical: `/oferte/${store}`,
    },
    openGraph: {
      title: `Catalog ${storeName} Actual ${monthYear} - Oferte Săptămâna Aceasta`,
      description: `Toate ofertele din catalogul ${storeName} pentru ${monthYear}. Prețuri actualizate zilnic. Economisește la ${storeName}!`,
      url: `/oferte/${store}`,
      type: 'website',
      locale: 'ro_RO',
      siteName: 'CatalogSmart',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Catalog ${storeName} Actual ${monthYear}`,
      description: `Ofertele și reducerile din catalogul ${storeName} pentru ${monthYear}. Actualizat zilnic!`,
    },
    // Noindex paginated pages to prevent crawl budget waste
    ...(isPaginated && {
      robots: {
        index: false,
        follow: true,
      },
    }),
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
      { name: { contains: filters.search } },
      { brand: { contains: filters.search } },
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

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    // Collect unique catalogIds to fetch catalog info
    const catalogIds = [...new Set(products.map((p: any) => p.catalogId).filter(Boolean))];

    // Fetch catalog info for image paths
    const catalogs = catalogIds.length > 0 ? await prisma.catalog.findMany({
      where: { id: { in: catalogIds } },
      select: { id: true, imageBasePath: true }
    }) : [];

    const catalogMap = new Map(catalogs.map((c: any) => [c.id, c.imageBasePath]));

    return {
      products: products.map((p: any) => {
        let catalogPageImage: string | null = null;
        if (p.catalogId && p.catalogPage) {
          const imageBasePath = catalogMap.get(p.catalogId);
          if (imageBasePath) {
            const pageNum = String(p.catalogPage).padStart(2, '0');
            catalogPageImage = `${imageBasePath}/page-${pageNum}.webp`;
          }
        }

        return {
          ...p,
          price: Number(p.price),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
          validFrom: p.validFrom.toISOString(),
          validUntil: p.validUntil.toISOString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
          allergens: p.allergens as string[] | null,
          catalogPageImage,
          catalogPageNumber: p.catalogPage,
        };
      }),
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error(`Failed to fetch store products for ${storeName}:`, error);
    return {
      products: [],
      total: 0,
      totalPages: 0,
    };
  }
}

// Get filter options for a specific store
async function getStoreFilterOptions(storeName: string): Promise<ProductFilterConfig> {
  const now = new Date();

  try {
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
  } catch (error) {
    console.warn(`Failed to fetch options for ${storeName}:`, error);
    return {
      stores: [{ value: storeName, label: storeName, count: 0 }],
      categories: [],
      priceRange: { min: 0, max: 100 },
      discountRange: { min: 0, max: 100 },
    };
  }
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
  Profi: {
    color: 'bg-green-600',
    description: 'Supermarket cu preturi accesibile si o retea extinsa de magazine.',
  },
  Selgros: {
    color: 'bg-red-800',
    description: 'Cash & Carry cu o gama variata de produse alimentare si nealimentare pentru profesionisti si pasionati.',
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

  // Compute price trends for all products on this page
  const trends = await getPriceTrendsBatch(
    products.map((p: any) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price, store: p.store }))
  );

  const info = storeInfo[storeName];

  const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';

  const monthYear = new Date().toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeName,
    description: info.description,
    url: `${SITE_URL}/oferte/${store}`,
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Acasă', url: SITE_URL },
    { name: 'Oferte', url: `${SITE_URL}/oferte` },
    { name: `Catalog ${storeName} Actual`, url: `${SITE_URL}/oferte/${store}` },
  ]);

  // FAQ Schema per store - targeting real GSC queries
  const storeFaqMap: Record<string, Array<{ q: string; a: string }>> = {
    Lidl: [
      { q: `Când se schimbă catalogul Lidl?`, a: `Catalogul Lidl se schimbă de două ori pe săptămână: lunea pentru produse non-alimentare și joia pentru produsele principale. Pe CatalogSmart găsești mereu cel mai nou pliant Lidl actualizat.` },
      { q: `Cum văd ofertele Lidl săptămâna aceasta?`, a: `Pe CatalogSmart poți vedea toate ofertele Lidl pentru ${monthYear} actualizate zilnic. Folosește filtrele pentru a găsi rapid ce te interesează.` },
      { q: `Unde găsesc revista Lidl actuală?`, a: `Revista Lidl actuală pentru ${monthYear} este disponibilă pe CatalogSmart cu toate ofertele săptămânii, inclusiv bazarul de mijloc de săptămână.` },
    ],
    Kaufland: [
      { q: `Când se schimbă catalogul Kaufland?`, a: `Catalogul Kaufland se schimbă de obicei miercurea. Pe CatalogSmart actualizăm automat ofertele imediat ce apare noul catalog Kaufland pentru ${monthYear}.` },
      { q: `Cum văd ofertele Kaufland azi?`, a: `Pe CatalogSmart găsești toate ofertele Kaufland din ${monthYear} actualizate zilnic, cu prețurile la zi pentru carne, fructe, legume și nenumărate alte categorii.` },
    ],
    Penny: [
      { q: `Când apare catalogul Penny actual?`, a: `Catalogul Penny actual se schimbă lunea. Pe CatalogSmart găsești toate promoțiile Penny pentru ${monthYear} actualizate imediat ce apar.` },
      { q: `Care sunt ofertele Penny săptămâna aceasta?`, a: `Pe CatalogSmart poți vedea toate ofertele din catalogul Penny pentru ${monthYear}, inclusiv reducerile la produse alimentare și non-alimentare.` },
    ],
    Carrefour: [
      { q: `Unde văd catalogul Carrefour actual?`, a: `Catalogul Carrefour actual pentru ${monthYear} este disponibil pe CatalogSmart cu toate ofertele și reducerile actualizate zilnic.` },
      { q: `Cum văd reducerile Carrefour azi?`, a: `Pe CatalogSmart poți filtra ofertele Carrefour după categorie, preț sau reducere pentru a găsi rapid cele mai bune promoții din ${monthYear}.` },
    ],
    'Mega Image': [
      { q: `Unde găsesc catalogul Mega Image actual?`, a: `Catalogul Mega Image actual pentru ${monthYear} este disponibil pe CatalogSmart. Mega Image actualizează ofertele frecvent, iar noi le preluăm automat.` },
      { q: `Care sunt ofertele Mega Image azi?`, a: `Pe CatalogSmart găsești toate ofertele Mega Image pentru ${monthYear}, de la produse proaspete până la produse de uz casnic.` },
    ],
    Auchan: [
      { q: `Când apare catalogul Auchan nou?`, a: `Catalogul Auchan nou pentru ${monthYear} este disponibil pe CatalogSmart imediat după lansare. Verifică zilnic pentru cele mai noi oferte.` },
    ],
    Profi: [
      { q: `Unde văd ofertele Profi actuale?`, a: `Ofertele Profi pentru ${monthYear} sunt disponibile pe CatalogSmart, actualizate regulat cu toate promoțiile active.` },
    ],
    Selgros: [
      { q: `Unde găsesc ofertele Selgros actuale?`, a: `Catalogul Selgros pentru ${monthYear} este disponibil pe CatalogSmart, cu toate ofertele pentru profesionști și cumpărători en-gros.` },
    ],
  };

  const storeFaqs = storeFaqMap[storeName] || [
    { q: `Unde văd catalogul ${storeName} actual?`, a: `Catalogul ${storeName} actual pentru ${monthYear} este disponibil pe CatalogSmart, actualizat zilnic cu toate ofertele și reducerile active.` },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: storeFaqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      {/* JSON-LD: Safe - using JSON.stringify on controlled static schema objects, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
                  Catalog {storeName} Actual - Oferte și Reduceri
                </h1>
                <p className="text-neutral-400 text-sm md:text-base max-w-lg">
                  {info.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-custom py-8">
          {/* Mobile Filter & Sort Bar */}
          <div className="lg:hidden mb-4 flex items-center justify-between gap-2">
            <FilterSidebar
              type="products"
              config={filterOptions}
            />
            <SortSelect
              options={[
                { value: 'created-desc', label: 'Cele mai noi' },
                { value: 'discount-desc', label: 'Reducere (mare -> mic)' },
                { value: 'price-asc', label: 'Pret (mic -> mare)' },
                { value: 'price-desc', label: 'Pret (mare -> mic)' },
                { value: 'name-asc', label: 'Nume (A-Z)' },
              ]}
              currentSort={filters.sortBy}
              currentOrder={filters.sortOrder}
            />
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
                    options={[
                      { value: 'created-desc', label: 'Cele mai noi' },
                      { value: 'discount-desc', label: 'Reducere (mare -> mic)' },
                      { value: 'price-asc', label: 'Pret (mic -> mare)' },
                      { value: 'price-desc', label: 'Pret (mare -> mic)' },
                      { value: 'name-asc', label: 'Nume (A-Z)' },
                    ]}
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
                        trend={trends[product.id]}
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
                  basePath={`/oferte/${store}`}
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
                    href={`/oferte/${slug}`}
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
