import { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { getPriceTrendsBatch } from '@/lib/price-history';

export const revalidate = 3600; // Re-generează la fiecare oră pentru freshness

// Helper: formatează data în română (ex: "14 aprilie")
function formatDateRO(date: Date): string {
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });
}

// Helper: formatează data scurtă (ex: "14.04.2026")
function formatDateShort(date: Date): string {
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Fetch catalog date range + products for Lidl
async function getLidlCatalogData() {
  const now = new Date();

  try {
    const [products, catalogRange] = await Promise.all([
      prisma.product.findMany({
        where: {
          store: 'Lidl',
          validFrom: { lte: now },
          validUntil: { gte: now },
        },
        orderBy: { discountPercentage: 'desc' },
        take: 24,
      }),
      // Get the actual catalog validity window from the products
      prisma.product.aggregate({
        where: {
          store: 'Lidl',
          validFrom: { lte: now },
          validUntil: { gte: now },
        },
        _min: { validFrom: true },
        _max: { validUntil: true },
        _count: true,
      }),
    ]);

    const validFrom = catalogRange._min.validFrom;
    const validUntil = catalogRange._max.validUntil;
    const total = catalogRange._count;

    // Fetch catalog images
    const catalogIds = [...new Set(products.map((p: any) => p.catalogId).filter(Boolean))];
    const catalogs = catalogIds.length > 0 ? await prisma.catalog.findMany({
      where: { id: { in: catalogIds } },
      select: { id: true, imageBasePath: true },
    }) : [];
    const catalogMap = new Map(catalogs.map((c: any) => [c.id, c.imageBasePath]));

    return {
      products: products.map((p: any) => {
        const imageBasePath = p.catalogId ? catalogMap.get(p.catalogId) : null;
        const catalogPageImage = imageBasePath && p.catalogPage
          ? `${imageBasePath}/page-${String(p.catalogPage).padStart(2, '0')}.webp`
          : null;
        return {
          ...p,
          price: Number(p.price),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
          validFrom: p.validFrom.toISOString(),
          validUntil: p.validUntil.toISOString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          catalogPageImage,
          catalogPageNumber: p.catalogPage,
        };
      }),
      validFrom,
      validUntil,
      total,
    };
  } catch {
    return { products: [], validFrom: null, validUntil: null, total: 0 };
  }
}

// ─── generateMetadata (server-side, cu date reale din DB) ───────────────────
export async function generateMetadata(): Promise<Metadata> {
  const { validFrom, validUntil, total } = await getLidlCatalogData();
  const now = new Date();

  let titleDate = '';
  let descDate = '';

  if (validFrom && validUntil) {
    const fromStr = formatDateShort(validFrom);
    const untilStr = formatDateShort(validUntil);
    titleDate = ` ${fromStr} - ${untilStr}`;
    descDate = ` valabil ${formatDateRO(validFrom)} - ${formatDateRO(validUntil)} ${now.getFullYear()}`;
  }

  const title = `Catalog Lidl${titleDate} ✅ Oferte și Reduceri Săptămâna Aceasta`;
  const description = `Catalog Lidl${descDate}. ${total > 0 ? `${total} produse` : 'Toate produsele'} cu reduceri și promoții. Pliant Lidl actualiza zilnic - vezi ofertele la alimente, non-alimentare și bazar!`;

  return {
    title,
    description,
    keywords: [
      'catalog lidl', 'catalog lidl actual', 'catalog lidl saptamana aceasta',
      'pliant lidl actual', 'revista lidl actuala', 'catalog lidl online',
      'oferte lidl', 'lidl catalog actual', 'lidl oferte saptamana aceasta',
      'catalog lidl saptamana viitoare', 'catalog lidl nou', 'reduceri lidl',
      'promotii lidl', 'bazar lidl', 'lidl romania catalog',
    ].join(', '),
    alternates: {
      canonical: '/catalog-lidl',
    },
    openGraph: {
      title,
      description,
      url: '/catalog-lidl',
      type: 'website',
      locale: 'ro_RO',
      siteName: 'CatalogSmart',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CatalogLidlPage() {
  const { products, validFrom, validUntil, total } = await getLidlCatalogData();
  const now = new Date();
  const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';

  // Date strings for display
  const fromStr = validFrom ? formatDateRO(validFrom) : '';
  const untilStr = validUntil ? formatDateRO(validUntil) : '';
  const fromShort = validFrom ? formatDateShort(validFrom) : '';
  const untilShort = validUntil ? formatDateShort(validUntil) : '';
  const yearStr = now.getFullYear().toString();

  const h1Title = validFrom && validUntil
    ? `Catalog Lidl ${fromShort} - ${untilShort}`
    : `Catalog Lidl Actual ${now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}`;

  const subtitle = validFrom && validUntil
    ? `Oferte valabile ${fromStr} - ${untilStr} ${yearStr} · ${total} produse disponibile`
    : `Oferte și reduceri săptămâna aceasta`;

  // Compute price trends
  const trends = await getPriceTrendsBatch(
    products.map((p: any) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price, store: p.store }))
  );

  // JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/catalog-lidl#webpage`,
    name: h1Title,
    description: subtitle,
    url: `${SITE_URL}/catalog-lidl`,
    dateModified: now.toISOString(),
    inLanguage: 'ro',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      name: 'CatalogSmart',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Acasă', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Oferte', item: `${SITE_URL}/oferte` },
        { '@type': 'ListItem', position: 3, name: h1Title, item: `${SITE_URL}/catalog-lidl` },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: total,
      itemListElement: products.slice(0, 10).map((p: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          brand: p.brand || 'Lidl',
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: 'RON',
            availability: 'https://schema.org/InStock',
            priceValidUntil: p.validUntil,
            seller: { '@type': 'Organization', name: 'Lidl' },
          },
        },
      })),
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Când se schimbă catalogul Lidl?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Catalogul Lidl se schimbă de două ori pe săptămână: lunea pentru produse non-alimentare (bazarul) și joia pentru produsele principale alimentare. Catalogul actual${validFrom && validUntil ? ` este valabil ${fromStr} - ${untilStr} ${yearStr}` : ''}.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Unde pot vedea catalogul Lidl online?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Pe CatalogSmart găsești toate ofertele din catalogul Lidl${validFrom && validUntil ? ` ${fromShort} - ${untilShort}` : ''} actualizate zilnic. Poți filtra după categorie și sorta după reducere pentru a găsi rapid produsele dorite.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Ce produse sunt la ofertă la Lidl săptămâna aceasta?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Catalogul Lidl${validFrom && validUntil ? ` ${fromShort} - ${untilShort}` : ''} cuprinde ${total} produse cu reduceri, inclusiv alimente, produse lactate, carne, produse non-alimentare și bazarul săptămânal.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Cum pot vedea ofertele Lidl saptamana viitoare?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ofertele Lidl pentru săptămâna viitoare sunt publicate de obicei duminică seara sau luni dimineața. Verifică CatalogSmart pentru a vedea noul catalog Lidl imediat ce apare.',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="bg-gray-50 min-h-screen">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white overflow-hidden mb-8">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-yellow-400 rounded-full filter blur-[120px] opacity-10" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-300 rounded-full filter blur-[100px] opacity-15" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

          <div className="relative container-custom py-8 md:py-12 z-10">
            {/* Breadcrumb */}
            <nav className="mb-4 text-sm" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-blue-200">
                <li><Link href="/" className="hover:text-white transition-colors">Acasă</Link></li>
                <li>/</li>
                <li><Link href="/oferte" className="hover:text-white transition-colors">Oferte</Link></li>
                <li>/</li>
                <li><Link href="/oferte/lidl" className="hover:text-white transition-colors">Lidl</Link></li>
                <li>/</li>
                <li className="text-white font-medium">Catalog actual</li>
              </ol>
            </nav>

            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
                <span className="font-black text-blue-900 text-sm leading-none">L</span>
              </div>
              <span className="text-blue-200 text-xs font-semibold tracking-widest uppercase">
                {validFrom && validUntil ? `Valabil ${fromShort} – ${untilShort}` : 'Catalog curent'}
              </span>
            </div>

            {/* H1 — cu date exacte */}
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
              {h1Title}
            </h1>
            <p className="text-blue-200 text-sm md:text-base max-w-xl">
              {subtitle}
            </p>

            {/* Quick stats */}
            {total > 0 && (
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm">
                  <span className="font-bold text-white">{total}</span>
                  <span className="text-blue-200 ml-1">produse</span>
                </div>
                {validFrom && validUntil && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm">
                    <span className="text-blue-200">Expiră:</span>
                    <span className="font-bold text-white ml-1">{untilStr}</span>
                  </div>
                )}
                <div className="bg-yellow-400/20 backdrop-blur-sm rounded-xl px-4 py-2 text-sm border border-yellow-400/30">
                  <span className="text-yellow-300 font-semibold">✓ Actualizat zilnic</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container-custom pb-16">

          {/* Products Grid */}
          {products.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Oferte Lidl {validFrom && validUntil ? `${fromStr} – ${untilStr}` : 'săptămâna aceasta'}
                </h2>
                <Link
                  href="/oferte/lidl"
                  className="text-sm text-blue-700 font-semibold hover:text-blue-900 transition-colors"
                >
                  Vezi toate ({total}) →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-10">
                {products.map((product: any) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showStore={false}
                    trend={trends[product.id]}
                  />
                ))}
              </div>

              <div className="text-center mb-12">
                <Link
                  href="/oferte/lidl"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-lg"
                >
                  Vezi toate ofertele Lidl ({total} produse)
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100 mb-10">
              <p className="text-gray-500">Nicio ofertă Lidl disponibilă momentan. Revino în curând!</p>
            </div>
          )}

          {/* SEO Text + FAQ Section */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Catalog Lidl {validFrom && validUntil ? `${fromShort} – ${untilShort}` : now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })} — Tot ce trebuie să știi
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
              <p>
                Catalogul Lidl{validFrom && validUntil ? ` valabil ${fromStr} – ${untilStr} ${yearStr}` : ''} este disponibil online pe CatalogSmart,
                actualizat automat imediat ce apar noile promoții. Găsești {total > 0 ? `${total} produse` : 'toate produsele'} cu reduceri
                la alimente, lactate, carne, produse de curățenie și celebrul <strong>bazar Lidl</strong> cu produse non-alimentare.
              </p>
              <p className="mt-3">
                <strong>Când se schimbă catalogul Lidl?</strong> Lidl publică două cataloage pe săptămână:
                unul <strong>lunea</strong> (bazarul — produse non-alimentare: unelte, haine, electronice) și
                unul <strong>joia</strong> (produse alimentare principale). Catalogul pentru săptămâna viitoare
                apare de obicei duminică seara sau luni dimineața.
              </p>
              <p className="mt-3">
                <strong>Cum economisești mai mult la Lidl?</strong> Folosește aplicația <strong>Lidl Plus</strong> pentru cupoane
                suplimentare de 5–50% pe lângă ofertele din catalog. Pe CatalogSmart poți filtra după categorie
                și sorta după procentul de reducere pentru a găsi rapid cele mai bune prețuri.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Întrebări frecvente — Catalog Lidl</h2>
            <div className="space-y-5">
              {[
                {
                  q: 'Când se schimbă catalogul Lidl?',
                  a: `Catalogul Lidl se schimbă de două ori pe săptămână: lunea pentru bazar (non-alimentare) și joia pentru alimentele principale. Catalogul actual${validFrom && validUntil ? ` este valabil ${fromStr} – ${untilStr} ${yearStr}` : ''}.`,
                },
                {
                  q: 'Ce este bazarul Lidl?',
                  a: 'Bazarul Lidl apare lunea și conține produse non-alimentare: unelte, haine, electronice, articole de grădină, sport. Produsele se epuizează rapid, deci mergi devreme!',
                },
                {
                  q: 'Cum văd ofertele Lidl săptămâna viitoare?',
                  a: 'Ofertele Lidl săptămâna viitoare sunt publicate duminică seara sau luni dimineața. Verifică CatalogSmart — actualizăm automat de îndată ce apare noul catalog.',
                },
                {
                  q: 'Cum funcționează Lidl Plus?',
                  a: 'Lidl Plus este aplicația de fidelitate Lidl care oferă cupoane personalizate de 5–50%, loterii cu premii și reduceri exclusive în plus față de ofertele din catalog.',
                },
              ].map(({ q, a }) => (
                <details key={q} className="group border border-gray-100 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between p-4 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50 transition-colors list-none">
                    {q}
                    <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="p-4 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-50">{a}</div>
                </details>
              ))}
            </div>
          </section>

          {/* Related stores */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Cataloage alte magazine</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { slug: 'kaufland', label: 'Catalog Kaufland', href: '/oferte/kaufland', color: 'bg-red-600' },
                { slug: 'penny', label: 'Catalog Penny', href: '/oferte/penny', color: 'bg-red-700' },
                { slug: 'carrefour', label: 'Catalog Carrefour', href: '/oferte/carrefour', color: 'bg-blue-600' },
                { slug: 'mega-image', label: 'Catalog Mega Image', href: '/oferte/mega-image', color: 'bg-red-600' },
                { slug: 'auchan', label: 'Catalog Auchan', href: '/oferte/auchan', color: 'bg-red-600' },
              ].map(({ label, href, color }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-5 py-2.5 ${color} text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
