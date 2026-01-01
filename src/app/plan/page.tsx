'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Recipe {
    id: string;
    title: string;
    description: string;
    servings: number;
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    difficulty: string;
    estimatedCost: number | null;
    tags: string[];
    slug: string;
}

// Demo recipes - will be replaced with API data
const demoRecipes: Recipe[] = [
    {
        id: '1',
        title: 'Ciorbă de legume',
        description: 'Ciorbă tradițională cu multe legume proaspete',
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        difficulty: 'USOR',
        estimatedCost: 25,
        tags: ['Vegetarian', 'Low Carb', 'Sănătos'],
        slug: 'ciorba-de-legume',
    },
    {
        id: '2',
        title: 'Paste cu sos de roșii',
        description: 'Paste simple și gustoase cu roșii proaspete',
        servings: 2,
        prepTime: 5,
        cookTime: 20,
        totalTime: 25,
        difficulty: 'USOR',
        estimatedCost: 18,
        tags: ['Rapid', 'Vegetarian', 'Ieftin'],
        slug: 'paste-sos-rosii',
    },
    {
        id: '3',
        title: 'Piept de pui la grătar',
        description: 'Piept de pui suculent cu condimente',
        servings: 2,
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        difficulty: 'MEDIU',
        estimatedCost: 35,
        tags: ['High Protein', 'Low Carb', 'Fitness'],
        slug: 'piept-pui-gratar',
    },
    {
        id: '4',
        title: 'Salată Caesar',
        description: 'Salată verde cu sos cremos și parmezan',
        servings: 2,
        prepTime: 15,
        cookTime: 0,
        totalTime: 15,
        difficulty: 'USOR',
        estimatedCost: 22,
        tags: ['Low Carb', 'High Protein', 'Rapid'],
        slug: 'salata-caesar',
    },
    {
        id: '5',
        title: 'Tocăniță de pui',
        description: 'Tocăniță aromată cu legume și sos bogat',
        servings: 4,
        prepTime: 20,
        cookTime: 40,
        totalTime: 60,
        difficulty: 'MEDIU',
        estimatedCost: 42,
        tags: ['Tradițional', 'Comfort Food'],
        slug: 'tocanita-pui',
    },
    {
        id: '6',
        title: 'Omletă cu legume',
        description: 'Omletă pufoasă cu legume proaspete',
        servings: 1,
        prepTime: 5,
        cookTime: 10,
        totalTime: 15,
        difficulty: 'USOR',
        estimatedCost: 8,
        tags: ['Mic dejun', 'High Protein', 'Rapid'],
        slug: 'omleta-legume',
    },
];

export default function PlanPage() {
    const [recipes, setRecipes] = useState<Recipe[]>(demoRecipes);
    const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
    const [portions, setPortions] = useState(4);
    const [showPortionsSlider, setShowPortionsSlider] = useState(false);
    const [loading, setLoading] = useState(false);
    const [estimatedTotal, setEstimatedTotal] = useState(0);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // Batch Cooking State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchPlan, setBatchPlan] = useState<any>(null);
    const [loadingBatch, setLoadingBatch] = useState(false);

    // Party Mode State
    const [isPartyMode, setIsPartyMode] = useState(false);
    const [defaultPortions, setDefaultPortions] = useState(4);

    // Fetch recipes and profile
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Parallel fetch
            const [recipesRes, profileRes] = await Promise.all([
                fetch('/api/recipes'),
                fetch('/api/user/profile')
            ]);

            // Handle Profile
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                if (profileData.success && profileData.data) {
                    const { nutritionalGoals, dietaryRestrictions, householdSize } = profileData.data;

                    if (householdSize) {
                        setPortions(householdSize);
                        setDefaultPortions(householdSize);
                    }

                    // Apply automatic filter based on goals
                    if (nutritionalGoals?.includes('LOW_CARB')) setFilterTag('Low Carb');
                    else if (nutritionalGoals?.includes('VEGETARIAN')) setFilterTag('Vegetarian');
                    else if (nutritionalGoals?.includes('HIGH_PROTEIN')) setFilterTag('High Protein');

                    // You could also use strict filtering for restrictions, 
                    // but for now we just use the goal as the primary filter.
                }
            }

            // Handle Recipes
            if (recipesRes.ok) {
                const data = await recipesRes.json();
                if (data.data?.data && data.data.data.length > 0) {
                    setRecipes(data.data.data);
                }
            }
        } catch (e) {
            console.log('Error fetching data', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate estimated total for selected recipes
    useEffect(() => {
        const total = selectedRecipes.reduce((sum, id) => {
            const recipe = recipes.find(r => r.id === id);
            if (recipe?.estimatedCost) {
                // Scale cost by portions
                const scaleFactor = portions / recipe.servings;
                return sum + (recipe.estimatedCost * scaleFactor);
            }
            return sum;
        }, 0);
        setEstimatedTotal(Math.round(total * 100) / 100);
    }, [selectedRecipes, recipes, portions]);

    const toggleRecipe = (id: string) => {
        setSelectedRecipes(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case 'USOR': return 'Ușor';
            case 'MEDIU': return 'Mediu';
            case 'DIFICIL': return 'Dificil';
            default: return difficulty;
        }
    };

    // Get all unique tags
    const allTags = [...new Set(recipes.flatMap(r => r.tags))];

    // Filter recipes by tag
    const filteredRecipes = filterTag
        ? recipes.filter(r => r.tags.includes(filterTag))
        : recipes;

    const generateBatchPlan = async () => {
        if (selectedRecipes.length === 0) return;
        setLoadingBatch(true);
        setShowBatchModal(true);

        try {
            const response = await fetch('/api/plan/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeIds: selectedRecipes }),
            });

            if (response.ok) {
                const data = await response.json();
                setBatchPlan(data.data);
            }
        } catch (error) {
            console.error('Failed to generate batch plan', error);
        } finally {
            setLoadingBatch(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 relative">
            {/* Header Section */}
            <div className="bg-white px-4 pt-6 pb-4 border-b border-neutral-100">
                <h1 className="text-3xl font-display font-bold text-primary-600">Planifică</h1>
                <p className="text-neutral-500 mt-1">Alege rețetele pentru săptămâna aceasta</p>
            </div>

            {/* Portions Slider (Party Mode) */}
            {/* Party Mode Section */}
            <div className="px-4 py-2">
                {!isPartyMode ? (
                    <button
                        onClick={() => {
                            setIsPartyMode(true);
                            setShowPortionsSlider(true);
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors p-2 rounded-lg hover:bg-primary-50"
                    >
                        <span className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs">
                            🎉
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

            {/* Tag Filters */}
            <div className="px-4 pb-4 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button
                    onClick={() => setFilterTag(null)}
                    className={cn(
                        "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors",
                        filterTag === null
                            ? "bg-primary-600 text-white"
                            : "bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300"
                    )}
                >
                    Toate
                </button>
                {allTags.slice(0, 6).map(tag => (
                    <button
                        key={tag}
                        onClick={() => setFilterTag(tag === filterTag ? null : tag)}
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

            {/* Selected Count & Actions */}
            {selectedRecipes.length > 0 && (
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
            )}

            {/* Recipe Grid */}
            <div className="px-4 pb-20">
                <h2 className="text-xl font-display font-bold text-neutral-900 mb-4">
                    {filterTag ? `Rețete ${filterTag}` : 'Top alegeri pentru tine'}
                </h2>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-neutral-500">Se încarcă rețetele...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredRecipes.map((recipe) => {
                            const isSelected = selectedRecipes.includes(recipe.id);
                            const scaledCost = recipe.estimatedCost
                                ? Math.round((recipe.estimatedCost * portions / recipe.servings) * 100) / 100
                                : null;

                            return (
                                <div
                                    key={recipe.id}
                                    className={cn(
                                        "relative bg-white rounded-2xl overflow-hidden shadow-soft border-2 transition-all cursor-pointer",
                                        isSelected ? "border-primary-500 shadow-warm" : "border-transparent"
                                    )}
                                    onClick={() => toggleRecipe(recipe.id)}
                                >
                                    {/* Recipe Image Placeholder */}
                                    <div className="relative aspect-[4/3] bg-gradient-to-br from-primary-100 to-primary-200">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-4xl font-display font-bold text-primary-400">
                                                {recipe.title.charAt(0)}
                                            </span>
                                        </div>

                                        {/* Selection Checkbox */}
                                        <div
                                            className={cn(
                                                "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                isSelected
                                                    ? "bg-primary-600 text-white"
                                                    : "bg-white/90 text-neutral-400"
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
                                        </div>

                                        {/* Cost Badge */}
                                        {scaledCost && (
                                            <div className="absolute bottom-2 left-2 bg-white/95 px-2 py-1 rounded-lg">
                                                <span className="text-sm font-bold text-primary-600">~{scaledCost} lei</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Recipe Info */}
                                    <div className="p-3">
                                        <h3 className="font-bold text-neutral-900 text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                                            {recipe.title}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {recipe.totalTime} min
                                            </span>
                                            <span>•</span>
                                            <span>{getDifficultyLabel(recipe.difficulty)}</span>
                                        </div>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {recipe.tags.slice(0, 2).map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 bg-primary-50 text-primary-600 text-[10px] font-semibold rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Batch Cooking Modal */}
            {showBatchModal && (
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
            )}

            {/* Spacer for bottom nav */}
            <div className="h-8" />
        </div>
    );
}
