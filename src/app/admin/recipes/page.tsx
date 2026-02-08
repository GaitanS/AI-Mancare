'use client';

import { useState, useEffect } from 'react';
import { SearchInput } from '@/components/admin/SearchInput';
import { Pagination } from '@/components/admin/Pagination';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

interface Recipe {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  difficulty: string;
  totalTime: number;
  estimatedCost: number | null;
  viewCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  createdAt: string;
}

interface FullRecipe extends Recipe {
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  cuisine: string | null;
  ingredientIds: any;
  instructions: any;
  tags: string[];
  metaDescription: string | null;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [published, setPublished] = useState<string>('');
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, [page, search, difficulty, published]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        ...(search && { search }),
        ...(difficulty && { difficulty }),
        ...(published && { published }),
      });

      const res = await fetch(`/api/admin/recipes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublished = async (recipe: Recipe) => {
    try {
      const res = await fetch(`/api/admin/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !recipe.isPublished }),
      });

      if (res.ok) {
        fetchRecipes();
        showNotification('success', `Recipe ${recipe.isPublished ? 'unpublished' : 'published'}`);
      } else {
        showNotification('error', 'Failed to update recipe');
      }
    } catch (error) {
      showNotification('error', 'Network error');
    }
  };

  const handleDelete = async () => {
    if (!deletingRecipe) return;

    try {
      const res = await fetch(`/api/admin/recipes/${deletingRecipe.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchRecipes();
        showNotification('success', 'Recipe deleted successfully');
      } else {
        const data = await res.json();
        showNotification('error', data.error || 'Failed to delete recipe');
      }
    } catch (error) {
      showNotification('error', 'Network error');
    } finally {
      setDeletingRecipe(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-neutral-400">
            {total} recipe{total !== 1 ? 's' : ''} total
          </p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            handleFilterChange();
          }}
          placeholder="Search recipes..."
        />

        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            handleFilterChange();
          }}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
        >
          <option value="">All difficulties</option>
          <option value="ușor">Ușor</option>
          <option value="mediu">Mediu</option>
          <option value="dificil">Dificil</option>
        </select>

        <select
          value={published}
          onChange={(e) => {
            setPublished(e.target.value);
            handleFilterChange();
          }}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
        >
          <option value="">All statuses</option>
          <option value="true">Published</option>
          <option value="false">Unpublished</option>
        </select>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-white/5">
          <span className="text-5xl block mb-4">🍳</span>
          <h3 className="text-lg font-bold text-white mb-2">No Recipes Found</h3>
          <p className="text-neutral-500">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onEdit={() => setEditingRecipe(recipe.id)}
                onTogglePublished={() => handleTogglePublished(recipe)}
                onDelete={() => setDeletingRecipe(recipe)}
              />
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Edit Modal */}
      {editingRecipe && (
        <EditRecipeModal
          recipeId={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSaved={() => {
            setEditingRecipe(null);
            fetchRecipes();
            showNotification('success', 'Recipe updated successfully');
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingRecipe && (
        <ConfirmModal
          title="Delete Recipe"
          message={`Are you sure you want to delete "${deletingRecipe.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeletingRecipe(null)}
        />
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  onEdit,
  onTogglePublished,
  onDelete,
}: {
  recipe: Recipe;
  onEdit: () => void;
  onTogglePublished: () => void;
  onDelete: () => void;
}) {
  const getDifficultyColor = (diff: string) => {
    const normalized = diff.toLowerCase();
    if (normalized === 'ușor' || normalized === 'usor') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (normalized === 'mediu') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="bg-neutral-900 rounded-xl border border-white/5 hover:border-white/10 transition-all overflow-hidden">
      {/* Image */}
      <div className="relative aspect-video bg-neutral-800">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            🍳
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-lg border ${getDifficultyColor(
              recipe.difficulty
            )}`}
          >
            {recipe.difficulty}
          </span>
          {recipe.isFeatured && (
            <span className="px-2 py-1 text-xs font-medium rounded-lg border bg-primary-500/20 text-primary-400 border-primary-500/30">
              ⭐ Featured
            </span>
          )}
        </div>
        {/* Toggle Published */}
        <div className="absolute top-2 right-2">
          <button
            onClick={onTogglePublished}
            className={`w-10 h-5 rounded-full transition-colors ${
              recipe.isPublished ? 'bg-emerald-500' : 'bg-neutral-700'
            }`}
            title={recipe.isPublished ? 'Published' : 'Unpublished'}
          >
            <span
              className={`block w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
                recipe.isPublished ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-white line-clamp-2 mb-1">{recipe.title}</h3>
          <p className="text-xs text-neutral-500">{recipe.slug}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
            <p className="text-xs text-neutral-500">Time</p>
            <p className="text-sm font-medium text-white">{recipe.totalTime}min</p>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
            <p className="text-xs text-neutral-500">Cost</p>
            <p className="text-sm font-medium text-white">
              {recipe.estimatedCost ? `${recipe.estimatedCost} lei` : 'N/A'}
            </p>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
            <p className="text-xs text-neutral-500">Views</p>
            <p className="text-sm font-medium text-white">{recipe.viewCount}</p>
          </div>
        </div>

        {/* Dietary Icons */}
        {(recipe.isVegan || recipe.isVegetarian || recipe.isGlutenFree || recipe.isDairyFree) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {recipe.isVegan && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400" title="Vegan">
                🌱
              </span>
            )}
            {recipe.isVegetarian && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400" title="Vegetarian">
                🥬
              </span>
            )}
            {recipe.isGlutenFree && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400" title="Gluten Free">
                🌾
              </span>
            )}
            {recipe.isDairyFree && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400" title="Dairy Free">
                🥛
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
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
    </div>
  );
}

function EditRecipeModal({
  recipeId,
  onClose,
  onSaved,
}: {
  recipeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'ingredients' | 'instructions' | 'meta'>('basic');
  const [formData, setFormData] = useState<Partial<FullRecipe>>({});
  const [ingredientsJson, setIngredientsJson] = useState('');
  const [instructionsJson, setInstructionsJson] = useState('');

  useEffect(() => {
    fetchRecipe();
  }, [recipeId]);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/api/admin/recipes/${recipeId}`);
      if (res.ok) {
        const data = await res.json();
        setFormData(data.recipe);
        setIngredientsJson(JSON.stringify(data.recipe.ingredientIds || [], null, 2));
        setInstructionsJson(JSON.stringify(data.recipe.instructions || [], null, 2));
      } else {
        setError('Failed to load recipe');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validate JSON fields
      let ingredientIds, instructions;
      try {
        ingredientIds = JSON.parse(ingredientsJson);
        instructions = JSON.parse(instructionsJson);
      } catch (err) {
        setError('Invalid JSON in ingredients or instructions');
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        ingredientIds,
        instructions,
      };

      const res = await fetch(`/api/admin/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        onSaved();
      } else {
        setError(data.error || 'Failed to update recipe');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 rounded-2xl border border-white/10 p-8">
          <div className="text-white">Loading recipe...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-4xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Edit Recipe</h2>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/5 px-6">
          <div className="flex gap-6">
            {[
              { key: 'basic', label: 'Basic Info' },
              { key: 'ingredients', label: 'Ingredients' },
              { key: 'instructions', label: 'Instructions' },
              { key: 'meta', label: 'Tags & Meta' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty || 'mediu'}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="ușor">Ușor</option>
                    <option value="mediu">Mediu</option>
                    <option value="dificil">Dificil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Servings</label>
                  <input
                    type="number"
                    value={formData.servings || 2}
                    onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                    min="1"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={formData.prepTime || 0}
                    onChange={(e) => setFormData({ ...formData, prepTime: parseInt(e.target.value) })}
                    min="0"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Cook Time (min)</label>
                  <input
                    type="number"
                    value={formData.cookTime || 0}
                    onChange={(e) => setFormData({ ...formData, cookTime: parseInt(e.target.value) })}
                    min="0"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Total Time (min)</label>
                  <input
                    type="number"
                    value={formData.totalTime || 0}
                    onChange={(e) => setFormData({ ...formData, totalTime: parseInt(e.target.value) })}
                    min="0"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Cuisine</label>
                <input
                  type="text"
                  value={formData.cuisine || ''}
                  onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  placeholder="Romanian, Italian, etc."
                />
              </div>
            </div>
          )}

          {/* Ingredients Tab */}
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Ingredients JSON
                </label>
                <textarea
                  value={ingredientsJson}
                  onChange={(e) => setIngredientsJson(e.target.value)}
                  rows={20}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                  placeholder='[{"name": "Ingredient", "quantity": 100, "unit": "g"}]'
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Array of objects with name, quantity, and unit fields.
                </p>
              </div>
            </div>
          )}

          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Instructions JSON
                </label>
                <textarea
                  value={instructionsJson}
                  onChange={(e) => setInstructionsJson(e.target.value)}
                  rows={20}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                  placeholder='["Step 1", "Step 2"]'
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Array of instruction strings.
                </p>
              </div>
            </div>
          )}

          {/* Tags & Meta Tab */}
          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Tags</label>
                <input
                  type="text"
                  value={(formData.tags || []).join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  placeholder="tag1, tag2, tag3"
                />
                <p className="text-xs text-neutral-500 mt-1">Comma-separated tags.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Meta Description</label>
                <textarea
                  value={formData.metaDescription || ''}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  rows={3}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  placeholder="SEO meta description"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-neutral-400">Dietary Preferences</label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVegan || false}
                    onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                    className="w-4 h-4 bg-neutral-800 border border-neutral-700 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                  />
                  <span className="text-white text-sm">Vegan 🌱</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVegetarian || false}
                    onChange={(e) => setFormData({ ...formData, isVegetarian: e.target.checked })}
                    className="w-4 h-4 bg-neutral-800 border border-neutral-700 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                  />
                  <span className="text-white text-sm">Vegetarian 🥬</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isGlutenFree || false}
                    onChange={(e) => setFormData({ ...formData, isGlutenFree: e.target.checked })}
                    className="w-4 h-4 bg-neutral-800 border border-neutral-700 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                  />
                  <span className="text-white text-sm">Gluten Free 🌾</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDairyFree || false}
                    onChange={(e) => setFormData({ ...formData, isDairyFree: e.target.checked })}
                    className="w-4 h-4 bg-neutral-800 border border-neutral-700 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                  />
                  <span className="text-white text-sm">Dairy Free 🥛</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured || false}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 bg-neutral-800 border border-neutral-700 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                  />
                  <span className="text-white text-sm">Featured ⭐</span>
                </label>
              </div>
            </div>
          )}

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
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
