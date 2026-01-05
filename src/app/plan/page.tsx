'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PlanFilters } from '@/components/plan/PlanFilters';

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
}

// Recipes state - loads from database (empty by default)
const emptyRecipes: Recipe[] = [];

export default function PlanPage() {
    const [recipes, setRecipes] = useState<Recipe[]>(emptyRecipes);
    const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
    const [portions, setPortions] = useState(4);
    const [showPortionsSlider, setShowPortionsSlider] = useState(false);
    const [loading, setLoading] = useState(false);
    const [estimatedTotal, setEstimatedTotal] = useState(0);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // State variables for filters
    const [showFilters, setShowFilters] = useState(false);
    const [isPartyMode, setIsPartyMode] = useState(false);
    const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [loadingBatch, setLoadingBatch] = useState(false);
    const [batchPlan, setBatchPlan] = useState<any>(null);
    const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
    const [filterMealType, setFilterMealType] = useState<string[]>([]);
    const [filterMeatType, setFilterMeatType] = useState<string[]>([]);
    const [filterDietaryRestrictions, setFilterDietaryRestrictions] = useState<string[]>([]);
    const [filterMaxTime, setFilterMaxTime] = useState<number | null>(null);
    const [filterMaxCost, setFilterMaxCost] = useState<number | null>(null);
    const profileRestrictions: string[] = [];
    const defaultPortions = 4;

    // Derived values
    const filteredRecipes: Recipe[] = recipes.filter(recipe => {
        if (filterTag && !recipe.tags.includes(filterTag)) return false;
        if (filterDifficulty.length > 0 && !filterDifficulty.includes(recipe.difficulty)) return false;
        if (filterMaxTime && recipe.totalTime && recipe.totalTime > filterMaxTime) return false;
        if (filterMaxCost && recipe.estimatedCost && recipe.estimatedCost > filterMaxCost) return false;
        return true;
    });

    const activeFilterCount = [
        filterDifficulty.length > 0,
        filterMealType.length > 0,
        filterMeatType.length > 0,
        filterDietaryRestrictions.length > 0,
        filterMaxTime !== null,
        filterMaxCost !== null,
        filterTag !== null
    ].filter(Boolean).length;

    const allTags: string[] = [...new Set(recipes.flatMap(r => r.tags))];

    const clearAllFilters = () => {
        setFilterDifficulty([]);
        setFilterMealType([]);
        setFilterMeatType([]);
        setFilterDietaryRestrictions([]);
        setFilterMaxTime(null);
        setFilterMaxCost(null);
        setFilterTag(null);
    };

    const toggleRecipe = (id: string) => {
        setSelectedRecipes(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const getDifficultyLabel = (d: string) => {
        switch (d) {
            case 'USOR': return 'Ușor';
            case 'MEDIU': return 'Mediu';
            case 'DIFICIL': return 'Dificil';
            default: return d;
        }
    };

    // Calculate estimated total when selection changes
    useEffect(() => {
        const total = selectedRecipes.reduce((sum, id) => {
            const recipe = recipes.find(r => r.id === id);
            if (recipe?.estimatedCost) {
                return sum + (recipe.estimatedCost * portions / recipe.servings);
            }
            return sum;
        }, 0);
        setEstimatedTotal(total);
    }, [selectedRecipes, portions, recipes]);

    const generateBatchPlan = () => { };

    return <div className="min-h-screen bg-[#FDFBF7] relative pb-20">
        {/* Premium Header */}
        <div className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white overflow-hidden mb-8">
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '2s' }} />
            </div>

            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

            <div className="relative container-custom py-8 md:py-10 z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-orange-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Planificator</span>
                        </div>
                        <h1 className="font-display text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
                            Planifică Mesele
                        </h1>
                        <p className="text-neutral-400 text-sm md:text-base max-w-lg">
                            Organizează-ți săptămâna cu rețete delicioase și economisește bani.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="container-custom pt-4 pb-20">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop Sidebar (Persistent) */}
                <aside className="hidden lg:block w-72 flex-shrink-0">
                    <div className="sticky top-24 bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
                        <h2 className="font-display font-bold text-lg text-neutral-900 mb-4 px-1">Filtre</h2>
                        <PlanFilters
                            filterDifficulty={filterDifficulty}
                            setFilterDifficulty={setFilterDifficulty}
                            filterMealType={filterMealType}
                            setFilterMealType={setFilterMealType}
                            filterMeatType={filterMeatType}
                            setFilterMeatType={setFilterMeatType}
                            filterDietaryRestrictions={filterDietaryRestrictions}
                            setFilterDietaryRestrictions={setFilterDietaryRestrictions}
                            filterMaxTime={filterMaxTime}
                            setFilterMaxTime={setFilterMaxTime}
                            filterMaxCost={filterMaxCost}
                            setFilterMaxCost={setFilterMaxCost}
                            portions={portions}
                            profileRestrictions={profileRestrictions}
                            onReset={clearAllFilters}
                            onApply={() => { }}
                            activeCount={activeFilterCount}
                            hideApplyButton={true}
                        />
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    {/* Party Mode Section */}
                    <div className="mb-6">
                        {!isPartyMode ? (
                            <button
                                onClick={() => {
                                    setIsPartyMode(true);
                                    setShowPortionsSlider(true);
                                }}
                                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors p-3 rounded-xl bg-primary-50/50 hover:bg-primary-50 w-full sm:w-auto"
                            >
                                <span className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs text-primary-600">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </span>
                                <span>Planifici o petrecere? Activează Party Mode</span>
                            </button>
                        ) : (
                            <div className="relative animate-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        setIsPartyMode(false);
                                        setPortions(defaultPortions);
                                    }}
                                    className="absolute -top-3 -right-2 p-2 bg-white rounded-full shadow-sm border border-neutral-100 text-neutral-400 hover:text-neutral-600 z-10"
                                    title="Dezactivează Party Mode"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                <div
                                    className="w-full flex items-center justify-between p-4 bg-white border-2 border-primary-100 rounded-2xl mb-4 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-neutral-900">Party Mode Activat</p>
                                            <p className="text-sm text-neutral-500">Gătești pentru {portions} persoane</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-display font-bold text-primary-600">{portions}</span>
                                </div>

                                <div className="mb-6 p-5 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">MIC</span>
                                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">MARE</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2"
                                        max="20"
                                        value={portions}
                                        onChange={(e) => setPortions(Number(e.target.value))}
                                        className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                    <p className="text-center text-sm font-medium text-neutral-500 mt-4">
                                        Cantitățile și prețurile sunt calculate automat
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Smart Filter Bar */}
                    <div className="pb-4">
                        {/* Filter Button + Quick Tags Row */}
                        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mb-3">
                            {/* Filter Button (Mobile Only) */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={cn(
                                    "lg:hidden flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors",
                                    showFilters || activeFilterCount > 0
                                        ? "bg-primary-600 text-white"
                                        : "bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300"
                                )}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filtre
                                {activeFilterCount > 0 && (
                                    <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {/* Quick Tag Filters */}
                            {allTags.slice(0, 5).map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors",
                                        filterTag === tag
                                            ? "bg-primary-600 text-white"
                                            : "bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Slide-in Filter Sidebar */}
                    {
                        showFilters && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-black/40 z-40 transition-opacity"
                                    onClick={() => setShowFilters(false)}
                                />

                                {/* Sidebar */}
                                <div className="fixed inset-y-0 right-0 w-full max-w-[340px] bg-white shadow-2xl flex flex-col z-50 animate-slide-in">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg shadow-neutral-900/20">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                                </svg>
                                            </div>
                                            <h2 className="font-display text-lg font-bold text-neutral-900">Filtre</h2>
                                        </div>
                                        <button
                                            onClick={() => setShowFilters(false)}
                                            className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-xl transition-colors"
                                        >
                                            <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Filter Component */}
                                    <PlanFilters
                                        filterDifficulty={filterDifficulty}
                                        setFilterDifficulty={setFilterDifficulty}
                                        filterMealType={filterMealType}
                                        setFilterMealType={setFilterMealType}
                                        filterMeatType={filterMeatType}
                                        setFilterMeatType={setFilterMeatType}
                                        filterDietaryRestrictions={filterDietaryRestrictions}
                                        setFilterDietaryRestrictions={setFilterDietaryRestrictions}
                                        filterMaxTime={filterMaxTime}
                                        setFilterMaxTime={setFilterMaxTime}
                                        filterMaxCost={filterMaxCost}
                                        setFilterMaxCost={setFilterMaxCost}
                                        portions={portions}
                                        profileRestrictions={profileRestrictions}
                                        onReset={clearAllFilters}
                                        onApply={() => setShowFilters(false)}
                                        activeCount={activeFilterCount}
                                    />
                                </div>
                            </>
                        )
                    }

                    {/* Results Count */}
                    <p className="text-center text-xs font-medium text-neutral-400">
                        {filteredRecipes.length} {filteredRecipes.length === 1 ? 'rețetă' : 'rețete'}
                        {activeFilterCount > 0 && ` (${activeFilterCount} filtre active)`}
                    </p>


                    {/* Selected Count & Actions */}
                    {
                        selectedRecipes.length > 0 && (
                            <div className="mx-4 mb-4 bg-white border border-neutral-200 rounded-2xl p-4 shadow-soft">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-neutral-900 font-bold">
                                        {selectedRecipes.length} rețete selectate
                                    </span>
                                    <span className="text-primary-600 font-bold">
                                        ~{estimatedTotal.toFixed(0)} lei
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={generateBatchPlan}
                                        className="flex items-center justify-center gap-2 bg-secondary-100 text-secondary-900 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary-200 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Gătește Batch
                                    </button>

                                    <Link
                                        href="/cart"
                                        className="flex items-center justify-center gap-2 bg-primary-600 text-white px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Vezi Coșul
                                    </Link>
                                </div>
                            </div>
                        )
                    }

                    {/* Recipe List */}
                    <div className="px-4 pb-20">
                        <h2 className="text-xl font-display font-bold text-neutral-900 mb-4">
                            {filterTag ? `Rețete ${filterTag}` : 'Top alegeri pentru tine'}
                        </h2>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-neutral-500">Se încarcă rețetele...</p>
                            </div>
                        ) : filteredRecipes.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-6 bg-primary-50 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="font-display text-xl font-bold text-neutral-900 mb-2">Nicio rețetă găsită</h3>
                                <p className="text-neutral-500 max-w-sm mx-auto">
                                    Momentan nu avem rețete disponibile. Încearcă să revii mai târziu!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredRecipes.map((recipe) => {
                                    const isSelected = selectedRecipes.includes(recipe.id);
                                    const scaledCost = recipe.estimatedCost
                                        ? Math.round((recipe.estimatedCost * portions / recipe.servings) * 100) / 100
                                        : null;
                                    const originalCost = scaledCost ? Math.round(scaledCost * 1.25) : null;

                                    return (
                                        <div
                                            key={recipe.id}
                                            className={cn(
                                                "relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border-2 transition-all",
                                                isSelected ? "border-primary-500 shadow-warm" : "border-neutral-100 hover:border-neutral-200"
                                            )}
                                        >
                                            <div className="flex gap-4 p-4">
                                                {/* Recipe Image */}
                                                <div
                                                    className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100 cursor-pointer"
                                                    onClick={() => setViewRecipe(recipe)}
                                                >
                                                    {recipe.imageUrl ? (
                                                        <Image
                                                            src={recipe.imageUrl}
                                                            alt={recipe.title}
                                                            fill
                                                            className="object-cover"
                                                            sizes="(max-width: 640px) 96px, 112px"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <svg className="w-10 h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Recipe Content - Clickable to view */}
                                                <div
                                                    className="flex-1 min-w-0 cursor-pointer"
                                                    onClick={() => setViewRecipe(recipe)}
                                                >
                                                    {/* Title & Price Row */}
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h3 className="font-bold text-neutral-900 text-base leading-tight line-clamp-2">
                                                            {recipe.title}
                                                        </h3>
                                                        {scaledCost && (
                                                            <div className="text-right flex-shrink-0">
                                                                <span className="text-primary-600 font-bold text-base">
                                                                    {scaledCost} RON
                                                                </span>
                                                                {originalCost && (
                                                                    <p className="text-neutral-400 text-xs line-through">
                                                                        {originalCost} RON
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Discount Badges */}
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {recipe.difficulty === 'USOR' && (
                                                            <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded">
                                                                -20%
                                                            </span>
                                                        )}
                                                        {recipe.tags.includes('Ieftin') && (
                                                            <span className="px-2 py-0.5 bg-orange-400 text-orange-900 text-xs font-bold rounded">
                                                                -30%
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Description/Tags */}
                                                    <p className="text-sm text-neutral-500 line-clamp-2">
                                                        {recipe.tags.join(', ')}
                                                    </p>
                                                </div>

                                                {/* Add Button */}
                                                <button
                                                    onClick={() => toggleRecipe(recipe.id)}
                                                    className={cn(
                                                        "self-center w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 border-2",
                                                        isSelected
                                                            ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/30"
                                                            : "bg-white text-neutral-400 border-neutral-200 hover:border-primary-400 hover:text-primary-500"
                                                    )}
                                                >
                                                    {isSelected ? (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>

        {/* Batch Cooking Modal */}
        {
            showBatchModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white">
                            <div>
                                <h3 className="font-display font-bold text-xl text-neutral-900">Plan de Gătire Batch</h3>
                                <p className="text-sm text-neutral-500">Optimizat pentru eficiență</p>
                            </div>
                            <button
                                onClick={() => setShowBatchModal(false)}
                                className="p-2 hover:bg-neutral-100 rounded-full"
                            >
                                <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-neutral-50">
                            {loadingBatch ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-12 h-12 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin mb-4" />
                                    <p className="text-neutral-600 font-medium">Inteligența Artificială optimizează pașii...</p>
                                </div>
                            ) : batchPlan ? (
                                <div className="space-y-6">
                                    {/* Summary Card */}
                                    <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="bg-white p-2 rounded-full shadow-sm">
                                                <svg className="w-6 h-6 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-secondary-900">Timp Total Estimat</p>
                                                <p className="text-secondary-700 text-sm">{batchPlan.totalPrepTime} pentru {selectedRecipes.length} rețete</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Steps Timeline */}
                                    <div className="relative pl-4 border-l-2 border-neutral-200 space-y-8">
                                        {batchPlan.optimizedSchedule.map((step: any, idx: number) => (
                                            <div key={idx} className="relative">
                                                {/* Step Dot */}
                                                <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 border-white ring-2 ring-primary-500 bg-primary-500" />

                                                <h4 className="font-bold text-lg text-neutral-900 mb-1">
                                                    Pasul {step.step}: {step.title}
                                                </h4>
                                                <p className="text-neutral-600 mb-3 leading-relaxed">
                                                    {step.description}
                                                </p>

                                                {/* Related Recipes Tags */}
                                                {step.relatedRecipes && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {step.relatedRecipes.map((r: string) => (
                                                            <span key={r} className="px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-500">
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-neutral-500">Nu s-a putut genera planul.</p>
                            )}
                        </div>

                        <div className="p-4 bg-white border-t border-neutral-100">
                            <button
                                onClick={() => setShowBatchModal(false)}
                                className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-colors"
                            >
                                Am înțeles, să trecem la treabă!
                            </button>
                        </div>
                    </div>
                </div>
            )
        }
        {/* Recipe Detail Modal */}
        {
            viewRecipe && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setViewRecipe(null)}
                    />

                    {/* Modal */}
                    <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white rounded-t-3xl">
                            <h2 className="font-display text-xl font-bold text-neutral-900 line-clamp-1">
                                {viewRecipe.title}
                            </h2>
                            <button
                                onClick={() => setViewRecipe(null)}
                                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
                                aria-label="Închide"
                            >
                                <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {/* Recipe Image */}
                            <div className="relative aspect-video bg-neutral-100 rounded-2xl mb-6 overflow-hidden">
                                {viewRecipe.imageUrl ? (
                                    <Image
                                        src={viewRecipe.imageUrl}
                                        alt={viewRecipe.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 500px"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <svg className="w-20 h-20 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Quick Info */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{viewRecipe.totalTime} min</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>{viewRecipe.servings} porții</span>
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-semibold",
                                    viewRecipe.difficulty === 'USOR' ? "bg-green-100 text-green-700" :
                                        viewRecipe.difficulty === 'MEDIU' ? "bg-amber-100 text-amber-700" :
                                            "bg-red-100 text-red-700"
                                )}>
                                    {getDifficultyLabel(viewRecipe.difficulty)}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-neutral-600 mb-6">{viewRecipe.description}</p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {viewRecipe.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1.5 bg-primary-50 text-primary-600 text-sm font-semibold rounded-full"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Cost */}
                            {viewRecipe.estimatedCost && (
                                <div className="bg-neutral-50 rounded-xl p-4 mb-6">
                                    <p className="text-sm text-neutral-500 mb-1">Cost estimat</p>
                                    <p className="text-2xl font-bold text-primary-600">
                                        ~{Math.round((viewRecipe.estimatedCost * portions / viewRecipe.servings) * 100) / 100} RON
                                    </p>
                                    <p className="text-xs text-neutral-400">pentru {portions} porții</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-5 border-t border-neutral-100 bg-white safe-area-inset-bottom">
                            <div className="flex gap-3">
                                <Link
                                    href={`/retete/${viewRecipe.slug}`}
                                    className="flex-1 px-4 py-3 text-sm font-semibold text-neutral-600 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors text-center"
                                >
                                    Vezi rețeta completă
                                </Link>
                                <button
                                    onClick={() => {
                                        toggleRecipe(viewRecipe.id);
                                        setViewRecipe(null);
                                    }}
                                    className={cn(
                                        "flex-1 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-center",
                                        selectedRecipes.includes(viewRecipe.id)
                                            ? "bg-neutral-200 text-neutral-600"
                                            : "bg-primary-600 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-700"
                                    )}
                                >
                                    {selectedRecipes.includes(viewRecipe.id) ? 'Elimină din plan' : 'Adaugă la plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        {/* Spacer for bottom nav */}
        <div className="h-8" />
    </div>
}

