import Link from 'next/link';
import { Suspense } from 'react';
import prisma from '@/lib/db';
import { cache, CacheKeys } from '@/lib/cache';
import RecipeCard, { RecipeCardSkeleton } from '@/components/RecipeCard';
import type { Recipe } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Rețete Economice | CatalogSmart',
    description:
        'Descoperă rețete delicioase și economice bazate pe ingredientele aflate în promoție. Gătește gustos și economisește bani cu CatalogSmart!',
    alternates: {
        canonical: '/retete',
    },
    openGraph: {
        title: 'Rețete Economice | CatalogSmart',
        description: 'Rețete delicioase create cu ingrediente la reducere. Economisește până la 30%!',
        type: 'website',
        url: '/retete',
    },
};

export const revalidate = 3600; // Revalidate every hour

// Fetch all recipes with pagination-ready structure
async function getRecipes(): Promise<Recipe[]> {
    return cache.getOrSet(
        CacheKeys.recipesPopular(),
        async () => {
            try {
                const recipes = await prisma.recipe.findMany({
                    orderBy: [{ createdAt: 'desc' }],
                    take: 50, // Limit to 50 recipes for now
                });

                return recipes.map((r: any) => ({
                    ...r,
                    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
                    instructions: r.instructions as Recipe['instructions'],
                    tips: r.tips as string[] | null,
                    tags: r.tags as string[] | null,
                    nutritionPerServing: r.nutritionPerServing as Recipe['nutritionPerServing'],
                }));
            } catch (error) {
                console.warn('Failed to fetch recipes:', error);
                return [];
            }
        },
        3600
    );
}

// Group recipes by category/difficulty
function groupRecipesByDifficulty(recipes: Recipe[]) {
    return {
        easy: recipes.filter((r) => r.difficulty === 'USOR'),
        medium: recipes.filter((r) => r.difficulty === 'MEDIU'),
        hard: recipes.filter((r) => r.difficulty === 'DIFICIL'),
    };
}

export default async function RecipesPage() {
    let recipes: Recipe[] = [];

    try {
        recipes = await getRecipes();
    } catch (error) {
        console.error('RecipesPage data fetch failed:', error);
    }

    const grouped = groupRecipesByDifficulty(recipes);

    return (
        <>
            {/* Hero Section */}
            <section className="relative py-12 sm:py-20 bg-gradient-to-br from-accent-50 via-kitchen-cream to-kitchen-butter overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 pattern-kitchen opacity-10" />
                <div className="absolute top-10 right-10 w-64 h-64 bg-accent-200 rounded-full filter blur-[80px] opacity-40" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-primary-200 rounded-full filter blur-[60px] opacity-30" />

                <div className="container-custom relative z-10">
                    <div className="max-w-3xl">
                        <span className="inline-block px-3 py-1 bg-accent-100 text-accent-700 text-xs font-semibold rounded-full mb-4 border border-accent-200">
                            {recipes.length}+ Rețete disponibile
                        </span>
                        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6">
                            Rețete{' '}
                            <span className="text-gradient-golden">Economice</span>
                        </h1>
                        <p className="text-lg text-neutral-600 mb-8 max-w-2xl leading-relaxed">
                            Descoperă rețete delicioase create special pentru ingredientele aflate în promoție.
                            Gătește gustos și economisește bani!
                        </p>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm text-neutral-600">
                                    <strong className="text-foreground">{grouped.easy.length}</strong> Rețete ușoare
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm text-neutral-600">
                                    <strong className="text-foreground">{grouped.medium.length}</strong> Rețete medii
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                    </svg>
                                </div>
                                <span className="text-sm text-neutral-600">
                                    <strong className="text-foreground">{grouped.hard.length}</strong> Rețete pentru chef
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* All Recipes Grid */}
            <section className="py-12 sm:py-20 bg-white">
                <div className="container-custom">
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 sm:mb-12 gap-4">
                        <div>
                            <span className="inline-block px-3 py-1 bg-accent-50 text-accent-700 text-xs font-semibold rounded-full mb-3 border border-accent-100">
                                Toate rețetele
                            </span>
                            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                                Inspirație pentru{' '}
                                <span className="text-gradient-golden">bucătărie</span>
                            </h2>
                        </div>
                        <Link
                            href="/oferte"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 shadow-warm hover:shadow-lg transition-all duration-300 group"
                        >
                            Vezi ofertele
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    <Suspense fallback={<RecipesGridSkeleton />}>
                        {recipes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {recipes.map((recipe, index) => (
                                    <div key={recipe.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                                        <RecipeCard recipe={recipe} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title="Nicio rețetă disponibilă"
                                description="Rețetele vor fi disponibile în curând!"
                            />
                        )}
                    </Suspense>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 sm:py-16 bg-kitchen-cream">
                <div className="container-custom">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
                            Vrei să economisești și mai mult?
                        </h2>
                        <p className="text-neutral-600 mb-8">
                            Verifică ofertele din supermarketuri și găsește ingrediente la prețuri reduse pentru rețetele tale preferate.
                        </p>
                        <Link
                            href="/oferte"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 shadow-warm hover:shadow-lg transition-all duration-300 group"
                        >
                            Explorează Ofertele
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

// Loading skeleton for recipes grid
function RecipesGridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
                <RecipeCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Empty state component
function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="text-center py-16">
            <div className="w-20 h-20 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-accent-100">
                <svg
                    className="w-10 h-10 text-accent-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">{title}</h3>
            <p className="text-neutral-600">{description}</p>
        </div>
    );
}
