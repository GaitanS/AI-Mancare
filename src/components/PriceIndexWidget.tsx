import Link from 'next/link';
import type { PriceIndexResult } from '@/lib/price-index';

interface Props {
  data: PriceIndexResult;
}

const STORE_COLORS: Record<string, string> = {
  kaufland: 'from-[#e10915] to-[#c00812]',
  lidl: 'from-[#0050aa] to-[#003d82]',
  penny: 'from-[#cd1719] to-[#a81315]',
  carrefour: 'from-[#004e9e] to-[#003a76]',
  'mega-image': 'from-[#e31837] to-[#b8142d]',
  auchan: 'from-[#e2001a] to-[#b80016]',
  selgros: 'from-[#d2001e] to-[#a00017]',
  profi: 'from-[#e30613] to-[#b80510]',
};

function formatPrice(value: number): string {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PriceIndexWidget({ data }: Props) {
  if (!data.cheapest || data.stores.length === 0) {
    return null;
  }

  const { cheapest, stores, maxSavings } = data;
  const cheapestColor = STORE_COLORS[cheapest.slug] || 'from-primary-600 to-primary-700';

  return (
    <section className="relative py-8 md:py-12 bg-gradient-to-b from-neutral-50 to-white border-b border-neutral-200">
      <div className="container-custom">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
              </span>
              <span className="text-xs font-semibold text-primary-800 uppercase tracking-wide">
                Index de preț actualizat azi
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-neutral-900 mb-2">
              Cel mai ieftin supermarket azi
            </h2>
            <p className="text-sm md:text-base text-neutral-600 max-w-2xl mx-auto">
              Am calculat prețul unui coș standard cu {data.basket.length} produse esențiale
              (pâine, lapte, ouă, ulei, carne, legume...) în fiecare magazin.
            </p>
          </div>

          {/* Winner card */}
          <div className={`relative rounded-2xl bg-gradient-to-br ${cheapestColor} text-white p-5 md:p-8 mb-4 shadow-xl overflow-hidden`}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs md:text-sm uppercase tracking-wider opacity-80 mb-1">
                  🏆 Cel mai ieftin azi
                </div>
                <div className="font-display text-3xl md:text-5xl font-black capitalize">
                  {cheapest.store}
                </div>
                {maxSavings > 0 && (
                  <div className="text-sm md:text-base mt-2 opacity-90">
                    Economisești până la <strong>{formatPrice(maxSavings)} lei</strong> față de cel mai scump magazin
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Coș standard</div>
                <div className="font-display text-4xl md:text-6xl font-black leading-none">
                  {formatPrice(cheapest.total)}
                </div>
                <div className="text-sm opacity-80 mt-1">lei</div>
              </div>
            </div>
          </div>

          {/* Ranking of all stores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {stores.map((store, idx) => {
              const isCheapest = idx === 0;
              const diff = store.total - cheapest.total;
              return (
                <Link
                  key={store.slug}
                  href={`/oferte/${store.slug}`}
                  className={`group flex items-center justify-between rounded-xl border p-3 md:p-4 transition-all hover:shadow-md ${
                    isCheapest
                      ? 'bg-primary-50 border-primary-300'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      isCheapest ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-900 capitalize truncate">
                        {store.store}
                      </div>
                      {diff > 0 && (
                        <div className="text-xs text-neutral-500">
                          +{formatPrice(diff)} lei
                        </div>
                      )}
                      {isCheapest && (
                        <div className="text-xs text-primary-700 font-medium">Recomandat</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-display font-bold text-lg text-neutral-900">
                      {formatPrice(store.total)}
                    </div>
                    <div className="text-xs text-neutral-500">lei</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-xs text-neutral-500 text-center mt-4 max-w-3xl mx-auto">
            * Prețurile sunt calculate automat pe baza celor mai ieftine produse disponibile din cataloagele active în fiecare magazin.
            Actualizat la fiecare oră.
          </p>
        </div>
      </div>
    </section>
  );
}
