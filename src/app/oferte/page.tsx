import prisma from '@/lib/db';
import type { Product, ProductFilters, ProductFilterConfig } from '@/types';
import type { Metadata } from 'next';
import OffersClient from '@/components/OffersClient';
import { getPriceTrendsBatch } from '@/lib/price-history';

// Sort options for products page
const productSortOptions = [
  { value: 'created-desc', label: 'Cele mai noi' },
  { value: 'discount-desc', label: 'Reducere (mare -> mic)' },
  { value: 'price-asc', label: 'Pret (mic -> mare)' },
  { value: 'price-desc', label: 'Pret (mare -> mic)' },
  { value: 'name-asc', label: 'Nume (A-Z)' },
];

// Dynamic date for SEO (current week/month)
const now = new Date();
const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const currentMonth = monthNames[now.getMonth()];
const currentYear = now.getFullYear();

export const revalidate = 300; // ISR: regenerate offers page every 5 minutes

export const metadata: Metadata = {
  title: `Catalog Kaufland, Lidl, Profi Actual ${currentMonth} ${currentYear} | Oferte Săptămâna Aceasta`,
  description: `📢 Catalog Kaufland actual ${currentMonth} ${currentYear} - vezi ofertele valabile săptămâna aceasta! Reduceri la produse din Lidl, Profi, Penny. Cataloage actualizate zilnic ✓`,
  keywords: [
    // Primary keywords (high volume from research)
    'catalog kaufland actual',
    'catalog lidl actual',
    'catalog profi actual',
    'catalog profi online',
    'catalog profi loco',
    'catalog kaufland nou',
    'catalog lidl saptamana viitoare',
    // Base keywords
    'catalog kaufland',
    'catalog lidl',
    'catalog profi',
    'oferte kaufland',
    'oferte lidl',
    'oferte profi',
    // Long-tail (weekly/daily)
    'catalog kaufland saptamana aceasta',
    'catalog kaufland azi',
    'catalog lidl saptamana aceasta',
    'catalog lidl nou',
    'oferte supermarket saptamana aceasta',
    // Date-specific
    `catalog kaufland ${currentMonth.toLowerCase()} ${currentYear}`,
    `catalog lidl ${currentMonth.toLowerCase()} ${currentYear}`,
    `catalog profi ${currentMonth.toLowerCase()} ${currentYear}`,
    // Action-based
    'catalog kaufland online',
    'catalog lidl online',
    'cataloage supermarket romania',
    'reduceri supermarket azi',
  ].join(', '),
  alternates: {
    canonical: '/oferte',
  },
  openGraph: {
    title: `Catalog Kaufland, Lidl, Profi Actual - Oferte ${currentMonth} ${currentYear}`,
    description: `Cele mai bune reduceri din supermarketuri săptămâna aceasta. Catalog Kaufland, Lidl, Profi actual actualizat zilnic. Economisește până la 50%!`,
    url: '/oferte',
    type: 'website',
    locale: 'ro_RO',
    siteName: 'CatalogSmart',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Catalog Kaufland, Lidl, Profi Actual ${currentMonth} ${currentYear}`,
    description: 'Vezi cataloagele și reducerile actual din Kaufland, Lidl, Profi. Actualizat zilnic!',
  },
  robots: {
    index: true,
    follow: true,
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
      { name: { contains: filters.search } },
      { brand: { contains: filters.search } },
      { category: { contains: filters.search } },
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

    // Create a map for quick lookup
    const catalogMap = new Map(catalogs.map((c: any) => [c.id, c.imageBasePath]));

    return {
      products: products.map((p: any) => {
        // Calculate catalog page image URL
        let catalogPageImage: string | null = null;
        if (p.catalogId && p.catalogPage) {
          const imageBasePath = catalogMap.get(p.catalogId);
          if (imageBasePath) {
            // Format page number with leading zeros (e.g., 01, 02, ... 10, 11)
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
    console.error('Failed to fetch products:', error);
    return {
      products: [],
      total: 0,
      totalPages: 0,
    };
  }
}

// Get filter options
async function getFilterOptions(): Promise<ProductFilterConfig> {
  const now = new Date();

  try {
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
      stores: storeGroups.map((g: any) => ({
        value: g.store,
        label: g.store,
        count: g._count,
      })),
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
    console.warn('Failed to fetch filter options:', error);
    return {
      stores: [],
      categories: [],
      priceRange: { min: 0, max: 100 },
      discountRange: { min: 0, max: 100 },
    };
  }
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

  // Compute price trends for all products on this page
  const trends = await getPriceTrendsBatch(
    products.map((p) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price, store: p.store }))
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';

  // Get store list from filter options for dynamic content
  const storeNames = filterOptions.stores.map(s => s.label).join(', ') || 'Kaufland, Lidl, Penny, Carrefour';

  // Enhanced JSON-LD structured data - WebPage with ItemList
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/oferte#webpage`,
    name: `Catalog Kaufland, Lidl, Penny ${currentMonth} ${currentYear}`,
    description: `Cele mai bune oferte și reduceri din supermarketuri - ${total} produse disponibile săptămâna aceasta`,
    url: `${baseUrl}/oferte`,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${baseUrl}#website`,
      name: 'CatalogSmart',
      url: baseUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Acasă', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'Oferte & Cataloage', item: `${baseUrl}/oferte` },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: total,
      itemListElement: products.slice(0, 10).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          description: `${product.name} la ${product.store}`,
          brand: product.brand || product.store,
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'RON',
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: product.store,
            },
            priceValidUntil: product.validUntil,
          },
        },
      })),
    },
  };

  // FAQ Schema targeting common "catalog kaufland" searches
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Unde găsesc catalogul Kaufland săptămâna aceasta?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Pe CatalogSmart găsești toate ofertele din catalogul Kaufland ${currentMonth} ${currentYear} actualizate zilnic. Avem peste ${total} produse disponibile din toate supermarketurile.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Când se schimbă catalogul Kaufland?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Catalogul Kaufland se schimbă de obicei în fiecare joi. Pe CatalogSmart actualizăm automat toate ofertele imediat ce apar noile cataloage.',
        },
      },
      {
        '@type': 'Question',
        name: 'Cum pot vedea ofertele Lidl și Penny online?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Pe CatalogSmart poți vedea toate cataloagele online - Kaufland, Lidl, Penny, Carrefour și altele. Folosește filtrele pentru a selecta magazinul dorit și a vedea ofertele valabile.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Care sunt cele mai bune reduceri din supermarketuri azi?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Verifică pagina noastră de oferte pentru cele mai mari reduceri din ${storeNames}. Sortează după "Reducere" pentru a vedea produsele cu cele mai mari discount-uri.`,
        },
      },
    ],
  };

  const initialProducts = products;

  return (
    <>
      {/* WebPage + ItemList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      {/* FAQ Schema for rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <OffersClient
        initialProducts={initialProducts}
        initialTotal={total}
        initialFilters={filters}
        filterConfig={filterOptions}
        initialTrends={trends}
      />
    </>
  );
}

