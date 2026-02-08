'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pagination } from '@/components/admin/Pagination';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { StatusBadge } from '@/components/admin/StatusBadge';

type CatalogStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface Catalog {
  id: string;
  store: string;
  title: string;
  status: CatalogStatus;
  totalPages: number;
  processedPages: number;
  productCount: number;
  validFrom: string;
  validUntil: string;
  imageBasePath: string;
  createdAt: string;
  updatedAt: string;
}

interface CatalogsResponse {
  catalogs: Catalog[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    stores: string[];
    statuses: CatalogStatus[];
  };
}

interface ViewPagesModalProps {
  catalog: Catalog;
  onClose: () => void;
}

function ViewPagesModal({ catalog, onClose }: ViewPagesModalProps) {
  const pageNumbers = Array.from({ length: catalog.totalPages }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="bg-neutral-900 rounded-xl border border-white/5 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-white">{catalog.title}</h2>
            <p className="text-sm text-neutral-400 mt-1">{catalog.totalPages} pagini</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-2"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pageNumbers.map((pageNum) => {
              const imageUrl = `${catalog.imageBasePath}/page-${String(pageNum).padStart(2, '0')}.webp`;
              return (
                <div key={pageNum} className="bg-neutral-800 rounded-lg overflow-hidden border border-white/5">
                  <div className="aspect-[3/4] relative">
                    <img
                      src={imageUrl}
                      alt={`Pagina ${pageNum}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"%3E%3Crect fill="%23262626" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%23737373" text-anchor="middle" dominant-baseline="middle"%3EImagine lipsă%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className="p-2 text-center">
                    <span className="text-xs text-neutral-400">Pagina {pageNum}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCatalogsPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [stores, setStores] = useState<string[]>([]);
  const [statuses] = useState<CatalogStatus[]>(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);

  // Modals
  const [viewingCatalog, setViewingCatalog] = useState<Catalog | null>(null);
  const [deletingCatalog, setDeletingCatalog] = useState<Catalog | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const fetchCatalogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        ...(selectedStore && { store: selectedStore }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(showExpiredOnly && { expired: 'true' }),
      });

      const response = await fetch(`/api/admin/catalogs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch catalogs');

      const data: CatalogsResponse = await response.json();
      setCatalogs(data.catalogs);
      setTotal(data.total);
      setTotalPages(data.totalPages);

      // Update stores list from filters
      if (data.filters.stores) {
        setStores(data.filters.stores);
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error);
      showNotification('error', 'Eroare la încărcarea cataloagelor');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStore, selectedStatus, showExpiredOnly, showNotification]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const handleReprocess = async (catalogId: string) => {
    try {
      const response = await fetch(`/api/admin/catalogs/${catalogId}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to reprocess catalog');

      const data = await response.json();
      showNotification('success', data.message || 'Catalog adăugat în coada de procesare');
      fetchCatalogs();
    } catch (error) {
      console.error('Error reprocessing catalog:', error);
      showNotification('error', 'Eroare la reprocesarea catalogului');
    }
  };

  const handleDelete = async (catalogId: string) => {
    try {
      const response = await fetch(`/api/admin/catalogs/${catalogId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete catalog');

      const data = await response.json();
      showNotification('success', data.message || 'Catalog șters cu succes');
      setDeletingCatalog(null);
      fetchCatalogs();
    } catch (error) {
      console.error('Error deleting catalog:', error);
      showNotification('error', 'Eroare la ștergerea catalogului');
    }
  };

  const handleBulkDeleteExpired = async () => {
    try {
      const response = await fetch('/api/admin/catalogs?mode=expired', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete expired catalogs');

      const data = await response.json();
      showNotification('success', data.message || 'Cataloage expirate șterse cu succes');
      setShowBulkDeleteConfirm(false);
      fetchCatalogs();
    } catch (error) {
      console.error('Error deleting expired catalogs:', error);
      showNotification('error', 'Eroare la ștergerea cataloagelor expirate');
    }
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Cataloage</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {total} {total === 1 ? 'catalog' : 'cataloage'} în total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 p-4 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Store Filter */}
          <div>
            <label htmlFor="store-filter" className="block text-sm font-medium text-neutral-300 mb-2">
              Magazin
            </label>
            <select
              id="store-filter"
              value={selectedStore}
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toate magazinele</option>
              {stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-neutral-300 mb-2">
              Status
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toate statusurile</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Expired Only Toggle */}
          <div className="flex items-end">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showExpiredOnly}
                onChange={(e) => {
                  setShowExpiredOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 text-blue-500 bg-neutral-800 border-white/5 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-neutral-300">Doar expirate</span>
            </label>
          </div>

          {/* Bulk Delete Button */}
          <div className="flex items-end">
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Șterge toate expirate
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-800/50 border-b border-white/5">
              <tr>
                <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-neutral-300">
                  Magazin
                </th>
                <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-neutral-300">
                  Titlu
                </th>
                <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-neutral-300">
                  Status
                </th>
                <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-neutral-300">
                  Pagini
                </th>
                <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-neutral-300">
                  Produse
                </th>
                <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-neutral-300">
                  Perioadă valabilitate
                </th>
                <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-neutral-300">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400">
                    Se încarcă...
                  </td>
                </tr>
              ) : catalogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400">
                    Niciun catalog găsit
                  </td>
                </tr>
              ) : (
                catalogs.map((catalog) => {
                  const expired = isExpired(catalog.validUntil);
                  return (
                    <tr key={catalog.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 lg:p-4 text-sm lg:text-base text-white font-medium">
                        {catalog.store}
                      </td>
                      <td className="p-3 lg:p-4 text-sm lg:text-base text-neutral-300">
                        {catalog.title}
                      </td>
                      <td className="p-3 lg:p-4">
                        <StatusBadge status={catalog.status} />
                      </td>
                      <td className="p-3 lg:p-4 text-sm lg:text-base text-neutral-300">
                        {catalog.processedPages}/{catalog.totalPages}
                      </td>
                      <td className="p-3 lg:p-4 text-sm lg:text-base text-neutral-300">
                        {catalog.productCount}
                      </td>
                      <td className="p-3 lg:p-4">
                        <div className={`text-sm lg:text-base ${expired ? 'text-red-400' : 'text-neutral-300'}`}>
                          <div>{new Date(catalog.validFrom).toLocaleDateString('ro-RO')}</div>
                          <div className="text-xs text-neutral-500">până</div>
                          <div>{new Date(catalog.validUntil).toLocaleDateString('ro-RO')}</div>
                          {expired && (
                            <span className="inline-block mt-1 text-xs font-medium text-red-400">
                              Expirat
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 lg:p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setViewingCatalog(catalog)}
                            className="px-3 py-1.5 text-xs lg:text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 rounded-lg transition-colors"
                          >
                            Vezi pagini
                          </button>
                          {catalog.status === 'FAILED' && (
                            <button
                              onClick={() => handleReprocess(catalog.id)}
                              className="px-3 py-1.5 text-xs lg:text-sm font-medium text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg transition-colors"
                            >
                              Reprocesează
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingCatalog(catalog)}
                            className="px-3 py-1.5 text-xs lg:text-sm font-medium text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors"
                          >
                            Șterge
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* View Pages Modal */}
      {viewingCatalog && (
        <ViewPagesModal
          catalog={viewingCatalog}
          onClose={() => setViewingCatalog(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingCatalog && (
        <ConfirmModal
          title="Șterge catalog?"
          message={
            <div className="space-y-2">
              <p>Ești sigur că vrei să ștergi catalogul "{deletingCatalog.title}"?</p>
              <p className="text-amber-400 font-medium">
                ⚠️ Atenție: Toate produsele ({deletingCatalog.productCount}) asociate cu acest catalog vor fi șterse.
              </p>
              <p className="text-sm text-neutral-400">
                Această acțiune este permanentă și nu poate fi anulată.
              </p>
            </div>
          }
          confirmText="Șterge definitiv"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => handleDelete(deletingCatalog.id)}
          onCancel={() => setDeletingCatalog(null)}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <ConfirmModal
          title="Șterge toate cataloagele expirate?"
          message={
            <div className="space-y-2">
              <p>Ești sigur că vrei să ștergi toate cataloagele expirate?</p>
              <p className="text-amber-400 font-medium">
                ⚠️ Atenție: Toate produsele asociate cu cataloagele expirate vor fi șterse.
              </p>
              <p className="text-sm text-neutral-400">
                Această acțiune este permanentă și nu poate fi anulată.
              </p>
            </div>
          }
          confirmText="Șterge toate expirate"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleBulkDeleteExpired}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg border ${
              notification.type === 'success'
                ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
                : 'bg-red-900/90 border-red-500 text-red-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
