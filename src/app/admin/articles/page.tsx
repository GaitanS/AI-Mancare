'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==========================================
// TYPES
// ==========================================

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category: string;
  tags: string | null;
  coverImage: string | null;
  author: string;
  published: boolean;
  publishedAt: string;
  views: number;
  readingTime: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ArticleForm {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  coverImage: string;
  author: string;
  published: boolean;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY_FORM: ArticleForm = {
  title: '',
  excerpt: '',
  content: '',
  category: 'tips',
  tags: '',
  coverImage: '',
  author: 'CatalogSmart',
  published: true,
  metaTitle: '',
  metaDescription: '',
};

const CATEGORIES = ['tips', 'economie', 'retete', 'ghiduri'] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  tips: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  economie: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  retete: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  ghiduri: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

const CATEGORY_LABELS: Record<string, string> = {
  tips: 'Tips',
  economie: 'Economie',
  retete: 'Retete',
  ghiduri: 'Ghiduri',
};

// ==========================================
// TOAST COMPONENT
// ==========================================

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in-right ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          <span className="text-lg">{toast.type === 'success' ? '✓' : '✕'}</span>
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 text-white/40 hover:text-white/70 transition-colors"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export default function AdminArticlesPage() {
  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState<ArticleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Toast helpers
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch articles
  const fetchArticles = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      if (categoryFilter) params.set('category', categoryFilter);
      if (publishedFilter) params.set('published', publishedFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/admin/articles?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setArticles(data.articles);
      setPagination(data.pagination);
    } catch {
      addToast('Failed to load articles', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, publishedFilter, debouncedSearch, addToast]);

  useEffect(() => {
    fetchArticles(1);
  }, [fetchArticles]);

  // Create article
  const handleCreate = async () => {
    if (!formData.title || !formData.excerpt || !formData.content || !formData.category) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');

      addToast('Article created successfully', 'success');
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      fetchArticles(1);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create article', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Edit article - open modal
  const openEditModal = async (article: Article) => {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const full = data.article;

      setEditingArticle(full);
      setFormData({
        title: full.title,
        excerpt: full.excerpt,
        content: full.content || '',
        category: full.category,
        tags: full.tags || '',
        coverImage: full.coverImage || '',
        author: full.author,
        published: full.published,
        metaTitle: full.metaTitle || '',
        metaDescription: full.metaDescription || '',
      });
      setShowEditModal(true);
    } catch {
      addToast('Failed to load article details', 'error');
    }
  };

  // Update article
  const handleUpdate = async () => {
    if (!editingArticle) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      addToast('Article updated successfully', 'success');
      setShowEditModal(false);
      setEditingArticle(null);
      setFormData(EMPTY_FORM);
      fetchArticles(pagination.page);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update article', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle published
  const togglePublished = async (article: Article) => {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !article.published }),
      });

      if (!res.ok) throw new Error('Failed to toggle');

      addToast(
        article.published ? 'Article unpublished' : 'Article published',
        'success'
      );
      fetchArticles(pagination.page);
    } catch {
      addToast('Failed to toggle publish status', 'error');
    }
  };

  // Delete article
  const handleDelete = async () => {
    if (!deletingArticle) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/articles/${deletingArticle.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      addToast('Article deleted successfully', 'success');
      setShowDeleteModal(false);
      setDeletingArticle(null);
      fetchArticles(pagination.page);
    } catch {
      addToast('Failed to delete article', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Articles
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage blog posts and articles ({pagination.total} total)
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(EMPTY_FORM);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-2 shrink-0"
        >
          <span>+</span>
          New Article
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50 transition-colors min-w-[140px]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          {/* Published Filter */}
          <select
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value)}
            className="px-3 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50 transition-colors min-w-[130px]"
          >
            <option value="">All Status</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-neutral-900 rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-neutral-400">
              <div className="w-4 h-4 border-2 border-neutral-600 border-t-primary-400 rounded-full animate-spin" />
              <span className="text-sm">Loading articles...</span>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-3">📝</span>
            <p className="text-neutral-400 text-sm">No articles found</p>
            <p className="text-neutral-600 text-xs mt-1">
              {debouncedSearch || categoryFilter || publishedFilter
                ? 'Try adjusting your filters'
                : 'Create your first article to get started'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Author</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Views</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Published</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="max-w-sm">
                          <p className="text-sm font-medium text-white truncate">{article.title}</p>
                          <p className="text-xs text-neutral-500 truncate mt-0.5">{article.excerpt}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={article.category} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{article.author}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-neutral-400 font-mono">{article.views.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            checked={article.published}
                            onChange={() => togglePublished(article)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500">
                          {new Date(article.publishedAt).toLocaleDateString('ro-RO')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(article)}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingArticle(article);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-white/5">
              {articles.map((article) => (
                <div key={article.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{article.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{article.excerpt}</p>
                    </div>
                    <CategoryBadge category={article.category} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>{article.author}</span>
                      <span>{article.views} views</span>
                      <span>{new Date(article.publishedAt).toLocaleDateString('ro-RO')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={article.published}
                        onChange={() => togglePublished(article)}
                      />
                      <button
                        onClick={() => openEditModal(article)}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setDeletingArticle(article);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchArticles(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 bg-neutral-800 border border-white/5 rounded-lg text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
            >
              Previous
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchArticles(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    pagination.page === pageNum
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-800 border border-white/5 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => fetchArticles(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 bg-neutral-800 border border-white/5 rounded-lg text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ArticleModal
          title="Create New Article"
          formData={formData}
          setFormData={setFormData}
          onSave={handleCreate}
          onClose={() => {
            setShowCreateModal(false);
            setFormData(EMPTY_FORM);
          }}
          saving={saving}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingArticle && (
        <ArticleModal
          title="Edit Article"
          formData={formData}
          setFormData={setFormData}
          onSave={handleUpdate}
          onClose={() => {
            setShowEditModal(false);
            setEditingArticle(null);
            setFormData(EMPTY_FORM);
          }}
          saving={saving}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletingArticle(null);
            }}
          />
          <div className="relative bg-neutral-900 border border-white/5 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-2">Delete Article</h2>
            <p className="text-sm text-neutral-400 mb-1">
              Are you sure you want to delete this article?
            </p>
            <p className="text-sm text-white font-medium mb-6 break-words">
              &ldquo;{deletingArticle.title}&rdquo;
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingArticle(null);
                }}
                className="px-4 py-2 bg-neutral-800 border border-white/5 text-white rounded-xl text-sm hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ==========================================
// ARTICLE FORM MODAL
// ==========================================

function ArticleModal({
  title,
  formData,
  setFormData,
  onSave,
  onClose,
  saving,
}: {
  title: string;
  formData: ArticleForm;
  setFormData: React.Dispatch<React.SetStateAction<ArticleForm>>;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const handleChange = (field: keyof ArticleForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-neutral-900 border border-white/5 rounded-2xl w-full max-w-3xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Article title..."
              className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
            />
          </div>

          {/* Category & Author Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50 transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Author
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="Author name..."
                className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Excerpt <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              placeholder="Brief summary of the article..."
              rows={3}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors resize-y"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Full article content (supports HTML)..."
              rows={14}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors resize-y font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="comma, separated, tags..."
              className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Cover Image URL
            </label>
            <input
              type="text"
              value={formData.coverImage}
              onChange={(e) => handleChange('coverImage', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
            />
            {formData.coverImage && (
              <div className="mt-2 rounded-xl overflow-hidden border border-white/5 bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.coverImage}
                  alt="Cover preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* SEO Section */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-sm font-bold text-neutral-400 mb-4 flex items-center gap-2">
              <span>🔍</span> SEO Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => handleChange('metaTitle', e.target.value)}
                  placeholder="Custom SEO title (optional)..."
                  className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Meta Description
                </label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => handleChange('metaDescription', e.target.value)}
                  placeholder="Custom SEO description (optional)..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors resize-y"
                />
              </div>
            </div>
          </div>

          {/* Published Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div>
              <p className="text-sm font-medium text-white">Published</p>
              <p className="text-xs text-neutral-500">Make this article visible on the site</p>
            </div>
            <ToggleSwitch
              checked={formData.published}
              onChange={() => handleChange('published', !formData.published)}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-neutral-800 border border-white/5 text-white rounded-xl text-sm hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {saving ? 'Saving...' : 'Save Article'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] || { bg: 'bg-neutral-500/10', text: 'text-neutral-400' };
  const label = CATEGORY_LABELS[category] || category;

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-primary-500' : 'bg-neutral-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
