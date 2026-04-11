import { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { getPriceTrendsBatch } from '@/lib/price-history';

export const revalidate = 3600;

function formatDateRO(date: Date): string {
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });
}
function formatDateShort(date: Date): string {
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function getKauflandCatalogData() {
  const now = new Date();
  try {
    const [products, catalogRange] = await Promise.all([
      prisma.product.findMany({
        where: { store: 'Kaufland', validFrom: { lte: now }, validUntil: { gte: now } },
        orderBy: { discountPercentage: 'desc' },
        take: 24,
      }),
      prisma.product.aggregate({
        where: { store: 'Kaufland', validFrom: { lte: now }, validUntil: { gte: now } },
        _min: { validFrom: true },
        _max: { validUntil: true },
        _count: true,
      }),
    ]);
    const validFrom = catalogRange._min.validFrom;
    const validUntil = catalogRange._max.validUntil;
    const total = catalogRange._count;

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
          ? `${imageBasePath}/page-${String(p.catalogPage).padStart(2, '0')}.webp` : null;
        return {
          ...p, price: Number(p.price),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
          validFrom: p.validFrom.toISOString(), validUntil: p.validUntil.toISOString(),
          createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
          catalogPageImage, catalogPageNumber: p.catalogPage,
        };
      }),
      validFrom, validUntil, total,
    };
  } catch {
    return { products: [], validFrom: null, validUntil: null, total: 0 };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { validFrom, validUntil, total } = await getKauflandCatalogData();
  const now = new Date();

  let titleDate = '';
  let descDate = '';
  if (validFrom && validUntil) {
    titleDate = ` ${formatDateShort(validFrom)} - ${formatDateShort(validUntil)}`;
    descDate = ` valabil ${formatDateRO(validFrom)} - ${formatDateRO(validUntil)} ${now.getFullYear()}`;
  }

  const title = `Catalog Kaufland${titleDate} ✅ Oferte și Reduceri Săptămâna Aceasta`;
  const description = `Catalog Kaufland${descDate}. ${total > 0 ? `${total} produse` : 'Toate produsele'} la reducere. Oferte la carne, fructe, legume, lactate și electrocasnice. Actualizat zilnic!`;

  return {
    title,
    description,
    keywords: [
      'catalog kaufland', 'catalog kaufland actual', 'catalog kaufland saptamana aceasta',
      'catalog kaufland azi', 'catalog kaufland online actual', 'kaufland catalog actual',
      'oferte kaufland', 'kaufland preturi la zi', 'kaufland oferte azi',
      'catalog kaufland saptamana viitoare', 'catalog kaufland nou', 'reduceri kaufland',
      'promotii kaufland', 'kaufland romania catalog',
    ].join(', '),
    alternates: { canonical: '/catalog-kaufland' },
    openGraph: { title, description, url: '/catalog-kaufland', type: 'website', locale: 'ro_RO', siteName: 'CatalogSmart' },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function CatalogKauflandPage() {
  const { products, validFrom, validUntil, total } = await getKauflandCatalogData();
  const now = new Date();
  const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';

  const fromStr = validFrom ? formatDateRO(validFrom) : '';
  const untilStr = validUntil ? formatDateRO(validUntil) : '';
  const fromShort = validFrom ? formatDateShort(validFrom) : '';
  const untilShort = validUntil ? formatDateShort(validUntil) : '';
  const yearStr = now.getFullYear().toString();

  const h1Title = validFrom && validUntil
    ? `Catalog Kaufland ${fromShort} - ${untilShort}`
    : `Catalog Kaufland Actual ${now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}`;

  const subtitle = validFrom && validUntil
    ? `Oferte valabile ${fromStr} - ${untilStr} ${yearStr} · ${total} produse disponibile`
    : `Oferte și reduceri săptămâna aceasta`;

  const trends = await getPriceTrendsBatch(
    products.map((p: any) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price, store: p.store }))
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/catalog-kaufland#webpage`,
    name: h1Title,
    description: subtitle,
    url: `${SITE_URL}/catalog-kaufland`,
    dateModified: now.toISOString(),
    inLanguage: 'ro',
    isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}#website`, name: 'CatalogSmart' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Acasă', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Oferte', item: `${SITE_URL}/oferte` },
        { '@type': 'ListItem', position: 3, name: h1Title, item: `${SITE_URL}/catalog-kaufland` },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: total,
      itemListElement: products.slice(0, 10).map((p: any, i: number) => ({
        '@type': 'ListItem', position: i + 1,
        item: {
          '@type': 'Product', name: p.name, brand: p.brand || 'Kaufland',
          offers: {
            '@type': 'Offer', price: p.price, priceCurrency: 'RON',
            availability: 'https://schema.org/InStock',
            priceValidUntil: p.validUntil,
            seller: { '@type': 'Organization', name: 'Kaufland' },
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
        name: 'Când se schimbă catalogul Kaufland?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Catalogul Kaufland se schimbă de obicei miercurea. Pe CatalogSmart actualizăm automat ofertele imediat ce apare noul catalog Kaufland${validFrom && validUntil ? `. Catalogul actual este valabil ${fromStr} - ${untilStr} ${yearStr}` : ''}.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Cum văd ofertele Kaufland azi?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Pe CatalogSmart găsești toate ofertele Kaufland${validFrom && validUntil ? ` ${fromShort} - ${untilShort}` : ''} actualizate zilnic, cu prețurile la zi pentru carne, fructe, legume și nenumărate alte categorii.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Ce produse sunt la ofertă la Kaufland săptămâna aceasta?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Catalogul Kaufland${validFrom && validUntil ? ` ${fromShort} - ${untilShort}` : ''} cuprinde ${total > 0 ? `${total} produse` : 'sute de produse'} cu reduceri la carne, fructe și legume proaspete, lactate, produse de panificație și electrocasnice.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Cum văd catalogul Kaufland online?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pe CatalogSmart poți vedea toate ofertele din catalogul Kaufland online, filtra după categorie (carne, lactate, legume) și sorta după procentul de reducere pentru a găsi rapid cele mai bune prețuri.',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="bg-gray-50 min-h-screen">
        {/* Hero — roșu Kaufland */}
        <div className="relative bg-gradient-to-br from-red-700 via-red-600 to-red-800 text-white overflow-hidden mb-8">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-yellow-300 rounded-full filter blur-[120px] opacity-10" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-red-300 rounded-full filter blur-[100px] opacity-15" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

          <div className="relative container-custom py-8 md:py-12 z-10">
            <nav className="mb-4 text-sm" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-red-200">
                <li><Link href="/" className="hover:text-white transition-colors">Acasă</Link></li>
                <li>/</li>
                <li><Link href="/oferte" className="hover:text-white transition-colors">Oferte</Link></li>
                <li>/</li>
                <li><Link href="/oferte/kaufland" className="hover:text-white transition-colors">Kaufland</Link></li>
                <li>/</li>
                <li className="text-white font-medium">Catalog actual</li>
              </ol>
            </nav>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-300 flex items-center justify-center">
                <span className="font-black text-red-700 text-sm leading-none">K</span>
              </div>
              <span className="text-red-200 text-xs font-semibold tracking-widest uppercase">
                {validFrom && validUntil ? `Valabil ${fromShort} – ${untilShort}` : 'Catalog curent'}
              </span>
            </div>

            <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
              {h1Title}
            </h1>
            <p className="text-red-200 text-sm md:text-base max-w-xl">{subtitle}</p>

            {total > 0 && (
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm">
                  <span className="font-bold text-white">{total}</span>
                  <span className="text-red-200 ml-1">produse</span>
                </div>
                {validFrom && validUntil && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm">
                    <span className="text-red-200">Expiră:</span>
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
          {products.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Oferte Kaufland {validFrom && validUntil ? `${fromStr} – ${untilStr}` : 'săptămâna aceasta'}
                </h2>
                <Link href="/oferte/kaufland" className="text-sm text-red-700 font-semibold hover:text-red-900 transition-colors">
                  Vezi toate ({total}) →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-10">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} showStore={false} trend={trends[product.id]} />
                ))}
              </div>
              <div className="text-center mb-12">
                <Link
                  href="/oferte/kaufland"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg"
                >
                  Vezi toate ofertele Kaufland ({total} produse)
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100 mb-10">
              <p className="text-gray-500">Nicio ofertă Kaufland disponibilă momentan. Revino în curând!</p>
            </div>
          )}

          {/* SEO Text */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Catalog Kaufland {validFrom && validUntil ? `${fromShort} – ${untilShort}` : now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })} — Tot ce trebuie să știi
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
              <p>
                Catalogul Kaufland{validFrom && validUntil ? ` valabil ${fromStr} – ${untilStr} ${yearStr}` : ''} este disponibil
                online pe CatalogSmart, actualizat automat imediat ce apar noile promoții. Gasești {total > 0 ? `${total} produse` : 'sute de produse'} cu
                reduceri la <strong>carne</strong>, <strong>fructe și legume</strong>, <strong>lactate</strong>,
                produse de panificație și electrocasnice.
              </p>
              <p className="mt-3">
                <strong>Când se schimbă catalogul Kaufland?</strong> Kaufland publică un nou catalog în fiecare <strong>miercuri</strong>.
                Ofertele sunt valabile de miercuri până marți săptămâna următoare. Pe CatalogSmart actualizăm automat imediat
                ce apare noul catalog.
              </p>
              <p className="mt-3">
                <strong>Cel mai ieftin la carne și legume.</strong> Kaufland câștigă constant comparațiile de preț la
                carne (piept pui, carne tocată, costiță) și fructe/legume de sezon, cu economii de 15–25% față de media pieței.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Întrebări frecvente — Catalog Kaufland</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Când se schimbă catalogul Kaufland?',
                  a: `Catalogul Kaufland se schimbă miercurea. Pe CatalogSmart actualizăm automat${validFrom && validUntil ? `. Catalogul actual este valabil ${fromStr} – ${untilStr} ${yearStr}` : ''}.`,
                },
                {
                  q: 'Cum văd ofertele Kaufland azi online?',
                  a: `Pe CatalogSmart găsești toate ofertele Kaufland${validFrom && validUntil ? ` ${fromShort} - ${untilShort}` : ''} actualizate zilnic, cu filtre după categorie și sortare după reducere.`,
                },
                {
                  q: 'La ce este cel mai ieftin Kaufland?',
                  a: 'Kaufland este cel mai ieftin la carne (piept pui, carne tocată, costiță) și fructe/legume de sezon. De obicei cu 15-25% mai ieftin decât media pieței la aceste categorii.',
                },
                {
                  q: 'Cum văd catalogul Kaufland online fără să merg în magazin?',
                  a: 'Pe CatalogSmart poți vedea toate ofertele din catalogul Kaufland online, filtrate și organizate pe categorii. Nu mai trebuie să răsfoiești fizic catalogul!',
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
                { label: 'Catalog Lidl', href: '/catalog-lidl', color: 'bg-blue-700' },
                { label: 'Catalog Penny', href: '/oferte/penny', color: 'bg-red-700' },
                { label: 'Catalog Carrefour', href: '/oferte/carrefour', color: 'bg-blue-600' },
                { label: 'Catalog Mega Image', href: '/oferte/mega-image', color: 'bg-red-600' },
                { label: 'Catalog Auchan', href: '/oferte/auchan', color: 'bg-red-600' },
              ].map(({ label, href, color }) => (
                <Link key={href} href={href} className={`px-5 py-2.5 ${color} text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity`}>
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
