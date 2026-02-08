'use client';

import { useState, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
  slug: string;
  scraperUrl: string | null;
  logoUrl: string | null;
  config: string | null;
  enabled: boolean;
  lastScrapedAt: string | null;
  lastProductCount: number | null;
  sortOrder: number;
  productCount: number;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/admin/stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (store: Store) => {
    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !store.enabled }),
      });

      if (res.ok) {
        fetchStores();
        setNotification({
          type: 'success',
          message: `${store.name} ${store.enabled ? 'disabled' : 'enabled'}`,
        });
      }
    } catch (error) {
      console.error('Failed to toggle store:', error);
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = async (store: Store) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        fetchStores();
        setNotification({ type: 'success', message: 'Store deleted successfully' });
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to delete' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading stores...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-neutral-400">
            {stores.length} store{stores.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors flex items-center gap-2"
        >
          <span>+</span>
          <span>Add Store</span>
        </button>
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

      {/* Stores List */}
      {stores.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-white/5">
          <span className="text-5xl block mb-4">🏪</span>
          <h3 className="text-lg font-bold text-white mb-2">No Stores Configured</h3>
          <p className="text-neutral-500 mb-6">Add your first store to start scraping catalogs.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors"
          >
            Add Store
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onEdit={() => setEditingStore(store)}
              onToggle={() => handleToggleEnabled(store)}
              onDelete={() => handleDelete(store)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingStore) && (
        <StoreModal
          store={editingStore}
          onClose={() => {
            setShowCreateModal(false);
            setEditingStore(null);
          }}
          onSaved={() => {
            setShowCreateModal(false);
            setEditingStore(null);
            fetchStores();
            setNotification({
              type: 'success',
              message: editingStore ? 'Store updated' : 'Store created',
            });
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}
    </div>
  );
}

function StoreCard({
  store,
  onEdit,
  onToggle,
  onDelete,
}: {
  store: Store;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`bg-neutral-900 rounded-xl border p-5 transition-all ${
        store.enabled ? 'border-white/5 hover:border-white/10' : 'border-white/5 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.name}
              className="w-10 h-10 rounded-lg object-contain bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-xl">
              🏪
            </div>
          )}
          <div>
            <h3 className="font-bold text-white">{store.name}</h3>
            <p className="text-xs text-neutral-500">{store.slug}</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`w-10 h-5 rounded-full transition-colors ${
            store.enabled ? 'bg-emerald-500' : 'bg-neutral-700'
          }`}
        >
          <span
            className={`block w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
              store.enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-white">{store.productCount}</p>
          <p className="text-xs text-neutral-500">Products</p>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
          <p className="text-sm font-medium text-white truncate">
            {store.lastScrapedAt
              ? new Date(store.lastScrapedAt).toLocaleDateString('ro-RO')
              : 'Never'}
          </p>
          <p className="text-xs text-neutral-500">Last Scraped</p>
        </div>
      </div>

      {/* URL */}
      {store.scraperUrl && (
        <p className="text-xs text-neutral-500 truncate mb-4" title={store.scraperUrl}>
          {store.scraperUrl}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="py-2 px-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function StoreModal({
  store,
  onClose,
  onSaved,
}: {
  store: Store | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    name: store?.name || '',
    slug: store?.slug || '',
    scraperUrl: store?.scraperUrl || '',
    logoUrl: store?.logoUrl || '',
    enabled: store?.enabled ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!store;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing ? `/api/admin/stores/${store.id}` : '/api/admin/stores';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        onSaved();
      } else {
        setError(data.error || 'Failed to save store');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: isEditing ? formData.slug : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-md">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? 'Edit Store' : 'Add Store'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              placeholder="Kaufland"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-primary-500"
              placeholder="kaufland"
              required
              disabled={isEditing}
            />
            <p className="text-xs text-neutral-500 mt-1">
              Used in URLs and database. Cannot be changed after creation.
            </p>
          </div>

          {/* Scraper URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Scraper URL</label>
            <input
              type="url"
              value={formData.scraperUrl}
              onChange={(e) => setFormData({ ...formData, scraperUrl: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              placeholder="https://cataloagedeoferte.ro/kaufland/"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Logo URL</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
              className={`w-10 h-5 rounded-full transition-colors ${
                formData.enabled ? 'bg-emerald-500' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
                  formData.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <span className="text-sm text-neutral-400">
              {formData.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
