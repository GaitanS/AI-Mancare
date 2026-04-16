'use client';

import { cn } from '@/lib/utils';

export interface MultiStoreAssignment {
  ingredientName: string;
  store: string;
  productId: string;
  productName: string;
  price: number;
  originalPrice: number | null;
  discount: number | null;
}

export interface MultiStoreResult {
  assignments: MultiStoreAssignment[];
  storeBreakdown: Record<string, { items: number; subtotal: number }>;
  totalCost: number;
  totalSavings: number;
  storeCount: number;
  savingsVsSingleStore: number;
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

function slug(store: string): string {
  return store.toLowerCase().replace(/\s+/g, '-');
}

function formatPrice(v: number): string {
  return v.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  data: MultiStoreResult;
  onClose: () => void;
  onExport?: () => void;
}

export default function MultiStoreBreakdown({ data, onClose, onExport }: Props) {
  const { assignments, storeBreakdown, totalCost, savingsVsSingleStore, storeCount } = data;

  const storesByTotal = Object.entries(storeBreakdown)
    .map(([store, info]) => ({ store, ...info }))
    .sort((a, b) => b.subtotal - a.subtotal);

  const itemsByStore = new Map<string, MultiStoreAssignment[]>();
  for (const a of assignments) {
    if (!itemsByStore.has(a.store)) itemsByStore.set(a.store, []);
    itemsByStore.get(a.store)!.push(a);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-2xl rounded-t-3xl lg:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-neutral-900 text-lg">Împarte coșul pe magazine</h3>
            <p className="text-sm text-neutral-500">Cel mai ieftin produs, magazin cu magazin</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors touch-manipulation flex-shrink-0"
            aria-label="Închide"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="px-4 pt-4 flex-shrink-0">
          <div className="rounded-2xl bg-gradient-to-br from-success-500 to-success-600 text-white p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80 mb-0.5">Total optim</div>
                <div className="font-display text-3xl md:text-4xl font-black leading-none">
                  {formatPrice(totalCost)} <span className="text-lg">lei</span>
                </div>
                <div className="text-xs opacity-90 mt-1">
                  {assignments.length} produse în {storeCount} {storeCount === 1 ? 'magazin' : 'magazine'}
                </div>
              </div>
              {savingsVsSingleStore > 0 && (
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider opacity-80 mb-0.5">Economisești în plus</div>
                  <div className="font-display text-2xl md:text-3xl font-black leading-none">
                    {formatPrice(savingsVsSingleStore)} <span className="text-sm">lei</span>
                  </div>
                  <div className="text-xs opacity-80 mt-1">vs cel mai ieftin magazin unic</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Store groups */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <div className="space-y-4 pb-safe">
            {storesByTotal.map(({ store, items, subtotal }) => {
              const color = STORE_COLORS[slug(store)] || 'from-neutral-700 to-neutral-800';
              const storeItems = itemsByStore.get(store) || [];
              return (
                <div key={store} className="rounded-2xl border border-neutral-200 overflow-hidden">
                  <div className={cn('bg-gradient-to-r text-white px-4 py-3 flex items-center justify-between', color)}>
                    <div>
                      <div className="font-bold capitalize">{store}</div>
                      <div className="text-xs opacity-90">{items} {items === 1 ? 'produs' : 'produse'}</div>
                    </div>
                    <div className="font-display font-black text-xl">
                      {formatPrice(subtotal)} <span className="text-xs">lei</span>
                    </div>
                  </div>
                  <ul className="divide-y divide-neutral-100">
                    {storeItems.map((item) => (
                      <li key={`${item.store}-${item.ingredientName}`} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 capitalize truncate">
                            {item.ingredientName}
                          </div>
                          <div className="text-xs text-neutral-500 truncate">{item.productName}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-neutral-900">{formatPrice(item.price)} lei</div>
                          {item.discount && item.discount > 0 && (
                            <div className="text-[10px] font-bold text-red-600">-{item.discount}%</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {onExport && (
          <div className="p-4 border-t border-neutral-100 flex-shrink-0">
            <button
              onClick={onExport}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold text-base transition-colors shadow-lg shadow-primary-500/20"
            >
              Exportă lista pe magazine
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
