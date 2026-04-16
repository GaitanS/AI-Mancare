import Link from 'next/link';
import type { Metadata } from 'next';
import { getPriceIndex, STANDARD_BASKET } from '@/lib/price-index';
import PriceIndexWidget from '@/components/PriceIndexWidget';

export const revalidate = 3600;

const currentMonth = new Date().toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

export const metadata: Metadata = {
  title: `Cel mai ieftin supermarket din România ${currentMonth}`,
  description: `Compară prețurile din Kaufland, Lidl, Penny, Carrefour, Mega Image și Auchan. Află care este cel mai ieftin supermarket din România pentru coșul standard de cumpărături, actualizat zilnic.`,
  keywords: [
    'cel mai ieftin supermarket din romania',
    'care este cel mai ieftin supermarket din romania',
    'cel mai ieftin supermarket',
    'comparatie preturi supermarketuri',
    'cel mai ieftin supermarket 2026',
    'comparatie preturi lidl kaufland',
    'compara preturi supermarketuri bucuresti',
    'cele mai ieftine supermarketuri',
    'top supermarketuri romania',
  ].join(', '),
  alternates: {
    canonical: '/cel-mai-ieftin-supermarket',
  },
  openGraph: {
    title: `Cel mai ieftin supermarket din România - ${currentMonth}`,
    description: `Comparăm prețurile unui coș standard de 10 produse esențiale în toate supermarketurile mari din România. Vezi azi care e cel mai ieftin.`,
    url: '/cel-mai-ieftin-supermarket',
    type: 'website',
  },
};

export default async function CelMaiIeftinSupermarketPage() {
  const priceIndex = await getPriceIndex();

  // Safe: JSON-LD is JSON.stringify of controlled server-side data (no user input).
  // Same pattern used in layout.tsx for site-wide structured data.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Care este cel mai ieftin supermarket din România?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: priceIndex.cheapest
            ? `Pe baza coșului standard CatalogSmart cu ${STANDARD_BASKET.length} produse esențiale, ${priceIndex.cheapest.store} este cel mai ieftin supermarket astăzi, cu un total de ${priceIndex.cheapest.total} lei. Comparația se actualizează zilnic.`
            : 'Calculăm zilnic costul unui coș standard cu produse esențiale în toate supermarketurile mari din România pentru a determina care e cel mai ieftin.',
        },
      },
      {
        '@type': 'Question',
        name: 'Cum calculați cel mai ieftin supermarket?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Folosim un coș standard cu 10 produse esențiale (pâine, lapte, ouă, ulei, zahăr, făină, piept de pui, roșii, cartofi, brânză) și comparăm prețurile acestora în toate cataloagele active din Kaufland, Lidl, Penny, Carrefour, Mega Image și Auchan. Rezultatul se actualizează la fiecare oră.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Cât se poate economisi cumpărând din cel mai ieftin supermarket?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: priceIndex.maxSavings > 0
            ? `Azi, diferența între cel mai ieftin și cel mai scump supermarket este de ${priceIndex.maxSavings} lei doar pentru coșul standard. La cumpărături săptămânale, economiile pot ajunge la câteva sute de lei pe lună.`
            : 'Diferența de preț între supermarketuri poate ajunge la 15-20% pentru același coș de cumpărături.',
        },
      },
    ],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonLdHtml = JSON.stringify(jsonLd);

  return (
    <>
      {/* JSON-LD Structured Data - Safe: server-generated, no user input */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />

      {/* Hero */}
      <section className="relative py-10 md:py-16 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.15),transparent_70%)]" />
        <div className="container-custom relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-xs font-semibold text-primary-300 uppercase tracking-wide">
                Actualizat {new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-black leading-tight mb-4">
              Cel mai ieftin supermarket<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-300">
                din România
              </span>
            </h1>
            <p className="text-sm md:text-lg text-neutral-300 max-w-2xl mx-auto">
              Comparăm zilnic prețurile din Kaufland, Lidl, Penny, Carrefour, Mega Image și Auchan pentru un coș standard cu 10 produse esențiale.
            </p>
          </div>
        </div>
      </section>

      {/* Price index widget */}
      <PriceIndexWidget data={priceIndex} />

      {/* Methodology section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              Cum calculăm cel mai ieftin supermarket?
            </h2>
            <p className="text-neutral-700 mb-6 leading-relaxed">
              Folosim un <strong>coș standard</strong> cu 10 produse esențiale pe care orice familie
              din România le cumpără săptămânal. Pentru fiecare produs, găsim cel mai mic preț disponibil
              în cataloagele active ale fiecărui magazin și însumăm totalul.
            </p>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 md:p-6 mb-6">
              <h3 className="font-semibold text-neutral-900 mb-3">Coșul standard CatalogSmart:</h3>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {STANDARD_BASKET.map(item => (
                  <li key={item} className="flex items-center gap-2 text-neutral-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    <span className="capitalize">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 mb-4 mt-10">
              Întrebări frecvente
            </h2>

            <div className="space-y-4">
              <details className="group bg-neutral-50 rounded-xl border border-neutral-200 p-5">
                <summary className="font-semibold text-neutral-900 cursor-pointer">
                  Care este cel mai ieftin supermarket din România?
                </summary>
                <p className="mt-3 text-neutral-700 text-sm leading-relaxed">
                  {priceIndex.cheapest ? (
                    <>
                      Pe baza coșului standard cu {STANDARD_BASKET.length} produse esențiale,{' '}
                      <strong className="capitalize">{priceIndex.cheapest.store}</strong> este cel mai ieftin
                      supermarket astăzi, cu un total de <strong>{priceIndex.cheapest.total} lei</strong>.
                      Comparația se actualizează zilnic, așa că rezultatul poate varia în funcție de ofertele active.
                    </>
                  ) : (
                    'Calculăm zilnic costul unui coș standard cu produse esențiale în toate supermarketurile mari din România.'
                  )}
                </p>
              </details>

              <details className="group bg-neutral-50 rounded-xl border border-neutral-200 p-5">
                <summary className="font-semibold text-neutral-900 cursor-pointer">
                  Cât se poate economisi?
                </summary>
                <p className="mt-3 text-neutral-700 text-sm leading-relaxed">
                  {priceIndex.maxSavings > 0 ? (
                    <>
                      Azi, diferența între cel mai ieftin și cel mai scump supermarket este de{' '}
                      <strong>{priceIndex.maxSavings} lei</strong> doar pentru coșul standard.
                      La cumpărături săptămânale, economiile pot ajunge la câteva sute de lei pe lună.
                    </>
                  ) : (
                    'Diferența de preț între supermarketuri poate ajunge la 15-20% pentru același coș de cumpărături.'
                  )}
                </p>
              </details>

              <details className="group bg-neutral-50 rounded-xl border border-neutral-200 p-5">
                <summary className="font-semibold text-neutral-900 cursor-pointer">
                  Cât de des se actualizează prețurile?
                </summary>
                <p className="mt-3 text-neutral-700 text-sm leading-relaxed">
                  Cataloagele sunt scanate automat zilnic din toate supermarketurile. Indexul de preț se recalculează la fiecare oră pentru a reflecta cele mai recente oferte active.
                </p>
              </details>
            </div>

            <div className="mt-10 p-6 bg-primary-50 border border-primary-200 rounded-xl text-center">
              <h3 className="font-display text-xl font-bold text-neutral-900 mb-2">
                Vrei să economisești și mai mult?
              </h3>
              <p className="text-neutral-700 mb-4 text-sm">
                Folosește coșul nostru inteligent care compară lista ta de cumpărături între magazine.
              </p>
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
              >
                Deschide coșul inteligent
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
