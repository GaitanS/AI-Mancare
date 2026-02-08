'use client';

import { useState, useEffect } from 'react';
import { SearchInput } from '@/components/admin/SearchInput';
import { Pagination } from '@/components/admin/Pagination';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  unit: string | null;
  store: string;
  category: string | null;
  validUntil: string;
  imageUrl: string | null;
}

interface FilterOptions {
  stores: string[];
  categories: string[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({ stores: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [page, search, selectedStore, selectedCategory, showExpiredOnly]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search,
        store: selectedStore,
        category: selectedCategory,
        expired: showExpiredOnly.toString(),
      });

      const res = await fetch(`/api/admin/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.filters) {
          setFilters(data.filters);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showNotification('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Product>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        fetchProducts();
        setEditingProduct(null);
        showNotification('success', 'Product updated successfully');
      } else {
        const data = await res.json();
        showNotification('error', data.error || 'Failed to update product');
      }
    } catch (error) {
      showNotification('error', 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchProducts();
        setDeletingProduct(null);
        showNotification('success', 'Product deleted successfully');
      } else {
        const data = await res.json();
        showNotification('error', data.error || 'Failed to delete product');
      }
    } catch (error) {
      showNotification('error', 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeleteExpired = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/products?mode=expired', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        fetchProducts();
        setShowBulkDeleteConfirm(false);
        showNotification('success', `Deleted ${data.count || 0} expired products`);
      } else {
        showNotification('error', data.error || 'Failed to delete expired products');
      }
    } catch (error) {
      showNotification('error', 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedStore('');
    setSelectedCategory('');
    setShowExpiredOnly(false);
    setPage(1);
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-neutral-400">
            {total.toLocaleString('ro-RO')} product{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="px-4 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            Delete All Expired
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search products..."
            />
          </div>

          {/* Store Filter */}
          <div>
            <select
              value={selectedStore}
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="">All Stores</option>
              {filters.stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="">All Categories</option>
              {filters.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Expired Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowExpiredOnly(!showExpiredOnly);
                setPage(1);
              }}
              className={`w-10 h-5 rounded-full transition-colors ${
                showExpiredOnly ? 'bg-primary-500' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
                  showExpiredOnly ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <span className="text-sm text-neutral-400">Show expired only</span>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-white/5">
          <span className="text-5xl block mb-4">📦</span>
          <h3 className="text-lg font-bold text-white mb-2">No Products Found</h3>
          <p className="text-neutral-500">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800/50 border-b border-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map((product) => {
                  const expired = isExpired(product.validUntil);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover bg-neutral-800"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center text-xl">
                              📦
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {product.name}
                            </p>
                            {product.brand && (
                              <p className="text-xs text-neutral-500 truncate">
                                {product.brand}
                              </p>
                            )}
                            {product.unit && (
                              <p className="text-xs text-neutral-600">
                                {product.unit}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {formatPrice(product.price)} lei
                            </span>
                            {product.discountPercentage && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                                -{product.discountPercentage}%
                              </span>
                            )}
                          </div>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-neutral-500 line-through">
                              {formatPrice(product.originalPrice)} lei
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Store */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-300">
                          {product.store}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400 truncate block max-w-[150px]">
                          {product.category || '-'}
                        </span>
                      </td>

                      {/* Valid Until */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm ${
                            expired ? 'text-red-400 font-medium' : 'text-neutral-300'
                          }`}
                        >
                          {formatDate(product.validUntil)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-white/5">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Loading overlay for pagination */}
      {loading && page > 1 && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-neutral-900 rounded-xl border border-white/10 px-6 py-4">
            <div className="text-white">Loading...</div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleUpdate}
          loading={actionLoading}
        />
      )}

      {/* Delete Confirmation */}
      {deletingProduct && (
        <ConfirmModal
          title="Delete Product"
          message={`Are you sure you want to delete "${deletingProduct.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={actionLoading}
          onConfirm={() => handleDelete(deletingProduct.id)}
          onCancel={() => setDeletingProduct(null)}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <ConfirmModal
          title="Delete All Expired Products"
          message="This will permanently delete all products with expired validity dates. This action cannot be undone."
          confirmLabel="Delete All Expired"
          variant="danger"
          loading={actionLoading}
          onConfirm={handleBulkDeleteExpired}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function EditProductModal({
  product,
  onClose,
  onSave,
  loading,
}: {
  product: Product;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Product>) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: product.name,
    brand: product.brand || '',
    price: product.price.toString(),
    originalPrice: product.originalPrice?.toString() || '',
    discountPercentage: product.discountPercentage?.toString() || '',
    unit: product.unit || '',
    store: product.store,
    category: product.category || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: any = {
      name: formData.name,
      brand: formData.brand || null,
      price: parseFloat(formData.price),
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
      discountPercentage: formData.discountPercentage ? parseInt(formData.discountPercentage) : null,
      unit: formData.unit || null,
      store: formData.store,
      category: formData.category || null,
    };

    onSave(product.id, updates);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Edit Product</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Price and Original Price */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Price (lei) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Original Price (lei)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Discount and Unit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                placeholder="e.g., kg, buc, l"
              />
            </div>
          </div>

          {/* Store and Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Store *</label>
              <input
                type="text"
                value={formData.store}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-0 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
