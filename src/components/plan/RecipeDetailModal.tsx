'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Ingredient {
    id: string;
    name: string;
    price: number;
    originalPrice: number | null;
    store: string;
    unit: string;
    quantity: number;
}

interface RecipeStep {
    step: number;
    text: string;
}

interface RecipeDetailModalProps {
    recipe: {
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
        instructions: RecipeStep[];
        tips: string[];
        tags: string[];
        nutritionPerServing: {
            calories?: number;
            protein?: number;
            carbs?: number;
            fat?: number;
        } | null;
        slug: string;
        ingredients: Ingredient[];
    };
    isInPlan: boolean;
    onAddToPlan: () => void;
    onClose: () => void;
}

const difficultyConfig = {
    USOR: { label: 'Ușor', color: 'text-emerald-700 bg-emerald-50' },
    MEDIU: { label: 'Mediu', color: 'text-amber-700 bg-amber-50' },
    DIFICIL: { label: 'Dificil', color: 'text-rose-700 bg-rose-50' },
};

export default function RecipeDetailModal({ recipe, isInPlan, onAddToPlan, onClose }: RecipeDetailModalProps) {
    const [showShareToast, setShowShareToast] = useState(false);
    const difficultyInfo = difficultyConfig[recipe.difficulty as keyof typeof difficultyConfig] || difficultyConfig.MEDIU;

    const handleShare = async () => {
        const shareData = {
            title: recipe.title,
            text: recipe.description,
            url: `${window.location.origin}/retete/${recipe.slug}`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 2000);
            }
        } catch (err) {
            console.error('Share failed:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal - Full screen on mobile, centered on desktop */}
            <div className="absolute inset-x-0 bottom-0 max-h-[90vh] md:inset-4 md:max-h-none md:m-auto md:max-w-2xl md:rounded-2xl bg-white shadow-2xl flex flex-col rounded-t-3xl md:rounded-2xl overflow-hidden animate-slide-up">
                {/* Header with Image */}
                <div className="relative h-48 md:h-64 bg-neutral-100 flex-shrink-0">
                    {recipe.imageUrl ? (
                        <Image
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 700px"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-20 h-20 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Title and Meta on Image */}
                    <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-2 line-clamp-2">
                            {recipe.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${difficultyInfo.color}`}>
                                {difficultyInfo.label}
                            </span>
                            {recipe.totalTime && (
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {recipe.totalTime} min
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {recipe.servings} porții
                            </span>
                            {recipe.estimatedCost && (
                                <span className="font-bold text-emerald-300">
                                    {recipe.estimatedCost.toFixed(0)} RON
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-5 space-y-6">
                        {/* Description */}
                        <p className="text-neutral-600 leading-relaxed">{recipe.description}</p>

                        {/* Tags */}
                        {recipe.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {recipe.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 bg-primary-50 text-primary-700 text-sm font-semibold rounded-full"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Ingredients */}
                        {recipe.ingredients.length > 0 && (
                            <div>
                                <h3 className="font-display font-bold text-lg text-neutral-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Ingrediente ({recipe.ingredients.length})
                                </h3>
                                <ul className="space-y-2 bg-neutral-50 rounded-xl p-4">
                                    {recipe.ingredients.map(ing => (
                                        <li key={ing.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-primary-500 rounded-full" />
                                                <span className="font-medium text-neutral-800">{ing.name}</span>
                                                {ing.store && (
                                                    <span className="text-xs text-neutral-400">({ing.store})</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-neutral-700">{ing.price.toFixed(2)} RON</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Instructions */}
                        {recipe.instructions.length > 0 && (
                            <div>
                                <h3 className="font-display font-bold text-lg text-neutral-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    Mod de preparare
                                </h3>
                                <div className="space-y-4">
                                    {recipe.instructions.map((step, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                                                {step.step}
                                            </div>
                                            <p className="text-neutral-700 leading-relaxed pt-1">{step.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tips */}
                        {recipe.tips.length > 0 && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Sfaturi
                                </h3>
                                <ul className="space-y-1">
                                    {recipe.tips.map((tip, i) => (
                                        <li key={i} className="text-sm text-amber-800 flex gap-2">
                                            <span className="text-amber-600">•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Nutrition */}
                        {recipe.nutritionPerServing && (
                            <div>
                                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide mb-3">
                                    Valori nutriționale (per porție)
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {recipe.nutritionPerServing.calories && (
                                        <div className="bg-neutral-100 px-4 py-2 rounded-lg text-center">
                                            <div className="font-bold text-lg text-neutral-900">{recipe.nutritionPerServing.calories}</div>
                                            <div className="text-xs text-neutral-500">kcal</div>
                                        </div>
                                    )}
                                    {recipe.nutritionPerServing.protein && (
                                        <div className="bg-neutral-100 px-4 py-2 rounded-lg text-center">
                                            <div className="font-bold text-lg text-neutral-900">{recipe.nutritionPerServing.protein}g</div>
                                            <div className="text-xs text-neutral-500">Proteine</div>
                                        </div>
                                    )}
                                    {recipe.nutritionPerServing.carbs && (
                                        <div className="bg-neutral-100 px-4 py-2 rounded-lg text-center">
                                            <div className="font-bold text-lg text-neutral-900">{recipe.nutritionPerServing.carbs}g</div>
                                            <div className="text-xs text-neutral-500">Carbohidrați</div>
                                        </div>
                                    )}
                                    {recipe.nutritionPerServing.fat && (
                                        <div className="bg-neutral-100 px-4 py-2 rounded-lg text-center">
                                            <div className="font-bold text-lg text-neutral-900">{recipe.nutritionPerServing.fat}g</div>
                                            <div className="text-xs text-neutral-500">Grăsimi</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 p-4 border-t border-neutral-100 bg-white safe-area-inset-bottom">
                    <div className="flex gap-3">
                        <button
                            onClick={handleShare}
                            className="flex-1 px-4 py-3 text-sm font-semibold text-neutral-600 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Distribuie
                        </button>
                        <button
                            onClick={onAddToPlan}
                            disabled={isInPlan}
                            className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${isInPlan
                                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                    : 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-700'
                                }`}
                        >
                            {isInPlan ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    În plan
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Adaugă în plan
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Share Toast */}
                {showShareToast && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
                        Link copiat!
                    </div>
                )}
            </div>
        </div>
    );
}
