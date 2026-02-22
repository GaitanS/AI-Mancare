'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn, normalizeDifficulty } from '@/lib/utils';
import AddToPlanModal from '@/components/plan/AddToPlanModal';
import RecipeDetailModal from '@/components/plan/RecipeDetailModal';
import { PlanFilters } from '@/components/plan/PlanFilters';
import AdSenseBanner from '@/components/AdSenseBanner';

interface Recipe {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    servings: number;
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    difficulty: string;
    estimatedCost: number | null;
    tags: string[];
    slug: string;
    availableStores?: string[]; // Added
}

interface FullRecipe extends Recipe {
    instructions: { step: number; text: string }[];
    tips: string[];
    nutritionPerServing: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
    } | null;
    ingredients: {
        id: string;
        name: string;
        price: number;
        originalPrice: number | null;
        store: string;
        unit: string;
        quantity: number;
    }[];
}

interface PlannedRecipe {
    recipeId: string;
    recipeTitle: string;
    portions: number;
    day: string | null;
    ingredients: {
        id: string;
        name: string;
        price: number;
        quantity: number;
        unit: string;
        scaledQuantity: number;
    }[];
}

interface MealPlan {
    recipes: PlannedRecipe[];
    updatedAt: string;
}

const STORAGE_KEY = 'mealPlan';

export default function PlanPage() {

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [mealPlan, setMealPlan] = useState<MealPlan>({ recipes: [], updatedAt: '' });

    // Modal states
    const [addModalRecipe, setAddModalRecipe] = useState<Recipe | null>(null);
    const [detailRecipe, setDetailRecipe] = useState<FullRecipe | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
    const [filterMealType, setFilterMealType] = useState<string[]>([]);
    const [filterMeatType, setFilterMeatType] = useState<string[]>([]);
    const [filterDietaryRestrictions, setFilterDietaryRestrictions] = useState<string[]>([]);
    const [filterStores, setFilterStores] = useState<string[]>([]); // Added
    const [filterMaxTime, setFilterMaxTime] = useState<number | null>(null);
    const [filterMaxCost, setFilterMaxCost] = useState<number | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // Lock body scroll when mobile filter panel is open
    useEffect(() => {
        if (showFilters) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showFilters]);

    // Load meal plan from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setMealPlan(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse meal plan:', e);
            }
        }
    }, []);

    // Save meal plan to localStorage
    const saveMealPlan = useCallback((plan: MealPlan) => {
        plan.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
        setMealPlan(plan);
    }, []);

    // Fetch recipes
    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                const res = await fetch('/api/recipes?pageSize=100');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.success && data.data?.data) {
                    setRecipes(data.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch recipes:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipes();
    }, []);

    // Check if recipe is in plan
    const isRecipeInPlan = useCallback((recipeId: string) => {
        return mealPlan.recipes.some(r => r.recipeId === recipeId);
    }, [mealPlan.recipes]);

    // Fetch full recipe details
    const fetchRecipeDetails = async (recipeId: string) => {
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/recipes/${recipeId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.data) {
                setDetailRecipe(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch recipe details:', error);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Handle adding recipe to plan
    const handleAddToPlan = async (recipeId: string, portions: number, day: string | null) => {
        // Fetch full recipe if not already loaded
        let fullRecipe = detailRecipe;
        if (!fullRecipe || fullRecipe.id !== recipeId) {
            const res = await fetch(`/api/recipes/${recipeId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.data) {
                fullRecipe = data.data;
            }
        }

        if (!fullRecipe) return;

        // Scale ingredients based on portions
        const scaleFactor = portions / fullRecipe.servings;
        const scaledIngredients = fullRecipe.ingredients.map(ing => ({
            id: ing.id,
            name: ing.name,
            price: (ing.price || 0) * scaleFactor,
            quantity: ing.quantity,
            unit: ing.unit,
            scaledQuantity: (ing.quantity || 1) * scaleFactor,
        }));

        const plannedRecipe: PlannedRecipe = {
            recipeId,
            recipeTitle: fullRecipe.title,
            portions,
            day,
            ingredients: scaledIngredients,
        };

        const newPlan = {
            ...mealPlan,
            recipes: [...mealPlan.recipes, plannedRecipe],
        };
        saveMealPlan(newPlan);
        setAddModalRecipe(null);
    };

    // Remove recipe from plan
    const removeFromPlan = (recipeId: string) => {
        const newPlan = {
            ...mealPlan,
            recipes: mealPlan.recipes.filter(r => r.recipeId !== recipeId),
        };
        saveMealPlan(newPlan);
    };

    // Clear entire plan
    const clearPlan = () => {
        saveMealPlan({ recipes: [], updatedAt: '' });
    };

    // Get difficulty label
    const getDifficultyLabel = (d: string) => {
        switch (normalizeDifficulty(d)) {
            case 'USOR': return 'Ușor';
            case 'MEDIU': return 'Mediu';
            case 'DIFICIL': return 'Dificil';
            default: return d;
        }
    };

    // Clear all filters
    const clearAllFilters = () => {
        setFilterDifficulty([]);
        setFilterMealType([]);
        setFilterMeatType([]);
        setFilterDietaryRestrictions([]);
        setFilterStores([]); // Added
        setFilterMaxTime(null);
        setFilterMaxCost(null);
        setFilterTag(null);
    };

    // Count active filters
    const activeFilterCount = [
        filterDifficulty.length > 0,
        filterMealType.length > 0,
        filterMeatType.length > 0,
        filterDietaryRestrictions.length > 0,
        filterStores.length > 0, // Added
        filterMaxTime !== null,
        filterMaxCost !== null,
        filterTag !== null
    ].filter(Boolean).length;

    // Filter recipes
    const filteredRecipes = recipes.filter(recipe => {
        if (filterTag && !recipe.tags.includes(filterTag)) return false;
        if (filterDifficulty.length > 0 && !filterDifficulty.includes(normalizeDifficulty(recipe.difficulty))) return false;
        if (filterMaxTime && recipe.totalTime && recipe.totalTime > filterMaxTime) return false;
        if (filterMaxCost && recipe.estimatedCost && recipe.estimatedCost > filterMaxCost) return false;
        if (searchQuery && !recipe.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        // Meal type filter (check tags)
        if (filterMealType.length > 0 && !filterMealType.some(m => recipe.tags.includes(m))) return false;
        // Meat type filter (check tags)
        if (filterMeatType.length > 0 && !filterMeatType.some(m => recipe.tags.includes(m))) return false;

        // Store filter - check if ANY selected store matches the recipe's available stores
        if (filterStores.length > 0) {
            if (!recipe.availableStores || recipe.availableStores.length === 0) return false;
            const hasMatch = filterStores.some(store => recipe.availableStores!.includes(store));
            if (!hasMatch) return false;
        }

        return true;
    });

    // Get all unique tags
    const allTags = [...new Set(recipes.flatMap(r => r.tags))].slice(0, 8);

    return (
        <div className="bg-neutral-50 min-h-screen pb-20">
            {/* Mobile Header - Compact */}
            <header className="lg:hidden bg-white sticky top-16 z-40 border-b border-neutral-200">
                <div className="container mx-auto px-3 h-10 flex items-center justify-between">
                    <h1 className="text-base font-bold text-neutral-900">Planifică Mesele</h1>
                </div>
            </header>

            {/* Desktop Header */}
            <div className="hidden lg:block relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 overflow-hidden mb-8">
                {/* Animated gradient orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '2s' }} />
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

                <div className="relative container-custom py-10 z-10 px-8">
                    <div className="flex items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-orange-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Planificator</span>
                            </div>
                            <h1 className="font-display text-4xl font-bold text-white mb-2 leading-tight">
                                Planifică Mesele
                            </h1>
                            <p className="text-neutral-400 text-base max-w-lg">
                                Alege rețetele, selectează porțiile și creează-ți planul săptămânal.
                            </p>
                        </div>

                    </div>
                </div>
            </div>

            {/* Mobile Filter Bar */}
            <div className="lg:hidden bg-white sticky top-[104px] z-30 shadow-sm px-3 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setShowFilters(true)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap active:bg-neutral-200 touch-manipulation",
                        activeFilterCount > 0 ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700"
                    )}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filtre
                    {activeFilterCount > 0 && (
                        <span className="bg-white/30 px-1.5 py-0.5 rounded-full text-xs">{activeFilterCount}</span>
                    )}
                </button>

                <div className="text-xs font-semibold text-neutral-500 whitespace-nowrap">
                    {filteredRecipes.length} rețete
                </div>
            </div>

            {/* ADSENSE BANNER - Top (Mobile Only) */}
            <div className="px-2 pt-2 lg:hidden">
                <AdSenseBanner slotId="8962383842" className="h-24 w-full" />
            </div>

            <div className="max-w-md mx-auto lg:max-w-7xl">
                <div className="flex flex-col lg:flex-row gap-6 lg:p-4">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-72 flex-shrink-0">
                        <div className="sticky top-28 space-y-6">
                            <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm p-5">
                                <h2 className="font-display font-bold text-lg text-neutral-900 mb-4">Filtre</h2>
                                <PlanFilters
                                filterDifficulty={filterDifficulty}
                                setFilterDifficulty={setFilterDifficulty}
                                filterMealType={filterMealType}
                                setFilterMealType={setFilterMealType}
                                filterMeatType={filterMeatType}
                                setFilterMeatType={setFilterMeatType}
                                filterDietaryRestrictions={filterDietaryRestrictions}
                                setFilterDietaryRestrictions={setFilterDietaryRestrictions}
                                filterStores={filterStores} // Added
                                setFilterStores={setFilterStores} // Added
                                filterMaxTime={filterMaxTime}
                                setFilterMaxTime={setFilterMaxTime}
                                filterMaxCost={filterMaxCost}
                                setFilterMaxCost={setFilterMaxCost}
                                portions={4}
                                profileRestrictions={[]}
                                onReset={clearAllFilters}
                                    onApply={() => { }}
                                    activeCount={activeFilterCount}
                                    hideApplyButton={true}
                                />
                            </div>
                            {/* Desktop Sidebar Ad */}
                            <AdSenseBanner size="rectangle" />
                        </div>
                    </aside>

                    {/* Mobile Filter Slide-in */}
                    {showFilters && (
                        <>
                            <div
                                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                                onClick={() => setShowFilters(false)}
                            />
                            <div className="fixed inset-y-0 right-0 w-full max-w-[340px] bg-white shadow-2xl flex flex-col z-50 lg:hidden animate-slide-in">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                                    <h2 className="font-display text-lg font-bold text-neutral-900">Filtre</h2>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-xl"
                                    >
                                        <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <PlanFilters
                                    filterDifficulty={filterDifficulty}
                                    setFilterDifficulty={setFilterDifficulty}
                                    filterMealType={filterMealType}
                                    setFilterMealType={setFilterMealType}
                                    filterMeatType={filterMeatType}
                                    setFilterMeatType={setFilterMeatType}
                                    filterDietaryRestrictions={filterDietaryRestrictions}
                                    setFilterDietaryRestrictions={setFilterDietaryRestrictions}
                                    filterStores={filterStores} // Added
                                    setFilterStores={setFilterStores} // Added
                                    filterMaxTime={filterMaxTime}
                                    setFilterMaxTime={setFilterMaxTime}
                                    filterMaxCost={filterMaxCost}
                                    setFilterMaxCost={setFilterMaxCost}
                                    portions={4}
                                    profileRestrictions={[]}
                                    onReset={clearAllFilters}
                                    onApply={() => setShowFilters(false)}
                                    activeCount={activeFilterCount}
                                />
                            </div>
                        </>
                    )}

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        {/* Desktop Search Bar */}
                        <div className="hidden lg:block mb-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    name="search"
                                    id="search-input"
                                    placeholder="Caută rețete..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Mobile Search Bar */}
                        <div className="lg:hidden px-3 mb-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    name="search-mobile"
                                    placeholder="Caută rețete..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Quick Tag Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 px-3 lg:px-0 [&::-webkit-scrollbar]:hidden">
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors",
                                        filterTag === tag
                                            ? "bg-primary-600 text-white"
                                            : "bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        {/* Results Count - Desktop */}
                        <p className="hidden lg:block text-sm text-neutral-500 mb-4">
                            <span className="text-neutral-900 font-bold">{filteredRecipes.length}</span> rețete găsite
                            {activeFilterCount > 0 && ` (${activeFilterCount} filtre active)`}
                        </p>

                        {/* Recipe Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 px-3 lg:px-0">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                                        <div className="h-48 bg-neutral-200" />
                                        <div className="p-4 space-y-3">
                                            <div className="h-5 bg-neutral-200 rounded w-3/4" />
                                            <div className="h-4 bg-neutral-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredRecipes.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto mb-6 bg-primary-50 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="font-display text-xl font-bold text-neutral-900 mb-2">Nicio rețetă găsită</h3>
                                <p className="text-neutral-500">Încearcă alte filtre sau elimină căutarea.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 px-3 lg:px-0">
                                {filteredRecipes.map((recipe, index) => {
                                    const inPlan = isRecipeInPlan(recipe.id);

                                    return (
                                        <React.Fragment key={recipe.id}>
                                        <div
                                            className={cn(
                                                "bg-white rounded-xl lg:rounded-2xl overflow-hidden shadow-sm lg:shadow-soft transition-all duration-300",
                                                "hover:shadow-md lg:hover:shadow-hard hover:-translate-y-1 lg:hover:-translate-y-1.5 cursor-pointer",
                                                inPlan ? "border-2 border-foreground" : "border border-neutral-200/60 hover:border-primary-200"
                                            )}
                                        >
                                            {/* Card Image - Click to view details */}
                                            <div
                                                className="relative h-40 lg:h-48 bg-neutral-100 cursor-pointer group"
                                                onClick={() => fetchRecipeDetails(recipe.id)}
                                            >
                                                {recipe.imageUrl ? (
                                                    <Image
                                                        src={recipe.imageUrl}
                                                        alt={recipe.title}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <svg className="w-16 h-16 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                        </svg>
                                                    </div>
                                                )}

                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold text-neutral-900">
                                                        Vezi detalii
                                                    </span>
                                                </div>

                                                {/* Tags */}
                                                {recipe.tags.length > 0 && (
                                                    <div className="absolute top-2 left-2 lg:top-3 lg:left-3 flex gap-1 z-10">
                                                        <span className="px-1.5 py-0.5 lg:px-2.5 lg:py-1 bg-black/60 backdrop-blur-sm text-white text-[9px] lg:text-xs font-semibold rounded lg:rounded-lg">
                                                            {recipe.tags[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card Content */}
                                            <div className="p-2 lg:p-4">
                                                <div className="flex items-start justify-between gap-2 lg:gap-3">
                                                    <div
                                                        className="flex-1 cursor-pointer"
                                                        onClick={() => fetchRecipeDetails(recipe.id)}
                                                    >
                                                        <h3 className="text-sm lg:text-base font-bold text-neutral-900 mb-1 lg:mb-2 line-clamp-2 hover:text-primary-600 transition-colors font-display leading-tight">
                                                            {recipe.title}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 lg:gap-3 text-[10px] lg:text-sm text-neutral-500">
                                                            <span>{getDifficultyLabel(recipe.difficulty)}</span>
                                                            {recipe.totalTime && <span>• {recipe.totalTime} min</span>}
                                                            {recipe.estimatedCost && (
                                                                <span className="text-emerald-600 font-semibold">
                                                                    {recipe.estimatedCost.toFixed(0)} RON
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Add/In Plan Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (inPlan) {
                                                                removeFromPlan(recipe.id);
                                                            } else {
                                                                setAddModalRecipe(recipe);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-all border-2",
                                                            inPlan
                                                                ? "bg-foreground text-white border-foreground shadow-lg shadow-foreground/30"
                                                                : "bg-white text-neutral-400 border-neutral-200 hover:border-primary-400 hover:text-primary-500"
                                                        )}
                                                        title={inPlan ? "Elimină din plan" : "Adaugă în plan"}
                                                    >
                                                        {inPlan ? (
                                                            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* In-Feed Ad - Mobile: after 4th recipe */}
                                        {index === 3 && (
                                            <div className="col-span-2 lg:hidden my-2">
                                                <AdSenseBanner size="in-feed" />
                                            </div>
                                        )}
                                        {/* In-Feed Ad - Mobile: after 10th recipe */}
                                        {index === 9 && (
                                            <div className="col-span-2 lg:hidden my-2">
                                                <AdSenseBanner size="in-feed" />
                                            </div>
                                        )}
                                        {/* In-Feed Ad - Desktop: after every 9th recipe */}
                                        {(index + 1) % 9 === 0 && index !== filteredRecipes.length - 1 && (
                                            <div className="hidden lg:flex col-span-3 my-4">
                                                <AdSenseBanner size="banner" className="w-full" />
                                            </div>
                                        )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        )}

                        {/* Bottom Ad */}
                        {!loading && filteredRecipes.length > 0 && (
                            <div className="mt-8 px-3 lg:px-0">
                                <AdSenseBanner size="rectangle" className="max-w-xl mx-auto" />
                            </div>
                        )}

                    </main>
                </div>

                {/* Add to Plan Modal */}
                {addModalRecipe && (
                    <AddToPlanModal
                        recipe={addModalRecipe}
                        onConfirm={handleAddToPlan}
                        onClose={() => setAddModalRecipe(null)}
                    />
                )}

                {/* Recipe Detail Modal */}
                {detailRecipe && (
                    <RecipeDetailModal
                        recipe={detailRecipe}
                        isInPlan={isRecipeInPlan(detailRecipe.id)}
                        onAddToPlan={() => {
                            setAddModalRecipe(detailRecipe);
                            setDetailRecipe(null);
                        }}
                        onClose={() => setDetailRecipe(null)}
                    />
                )}

                {/* Loading Detail Overlay */}
                {loadingDetail && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
