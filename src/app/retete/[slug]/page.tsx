import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { cached, recipesCache, cacheKeys } from '@/lib/cache';
import { formatPrice, formatDate } from '@/lib/utils';
import RecipeCard, { RecipeCardSkeleton } from '@/components/RecipeCard';
import PrintButton from '@/components/PrintButton';
import type { Recipe, Product } from '@/types';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Get recipe by slug
async function getRecipe(slug: string): Promise<Recipe | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { slug },
  });

  if (!recipe) return null;

  // Increment view count
  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { viewCount: { increment: 1 } },
  });

  return {
    ...recipe,
    estimatedCost: recipe.estimatedCost ? Number(recipe.estimatedCost) : null,
    costPerServing: recipe.costPerServing ? Number(recipe.costPerServing) : null,
    instructions: recipe.instructions as Recipe['instructions'],
    tips: recipe.tips as string[] | null,
    tags: recipe.tags as string[] | null,
    nutritionPerServing: recipe.nutritionPerServing as Recipe['nutritionPerServing'],
  };
}

// Get recipe ingredients (products)
async function getRecipeIngredients(ingredientIds: string[]): Promise<Product[]> {
  if (!ingredientIds || ingredientIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      id: { in: ingredientIds },
    },
  });

  return products.map((p) => ({
    ...p,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    extractionConfidence: p.extractionConfidence ? Number(p.extractionConfidence) : null,
    validFrom: p.validFrom.toISOString(),
    validUntil: p.validUntil.toISOString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
    allergens: p.allergens as string[] | null,
  }));
}

// Get related recipes
async function getRelatedRecipes(
  recipeId: string,
  tags: string[] | null,
  difficulty: string
): Promise<Recipe[]> {
  const recipes = await prisma.recipe.findMany({
    where: {
      id: { not: recipeId },
      OR: [
        { tags: tags && tags.length > 0 ? { hasSome: tags } : undefined },
        { difficulty: difficulty as 'USOR' | 'MEDIU' | 'DIFICIL' },
      ].filter(Boolean),
    },
    take: 3,
    orderBy: { viewCount: 'desc' },
  });

  return recipes.map((r) => ({
    ...r,
    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
    costPerServing: r.costPerServing ? Number(r.costPerServing) : null,
    instructions: r.instructions as Recipe['instructions'],
    tips: r.tips as string[] | null,
    tags: r.tags as string[] | null,
    nutritionPerServing: r.nutritionPerServing as Recipe['nutritionPerServing'],
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    return {
      title: 'Reteta negasita',
    };
  }

  return {
    title: recipe.title,
    description: recipe.metaDescription || recipe.description,
    alternates: {
      canonical: `/retete/${slug}`,
    },
    openGraph: {
      title: recipe.title,
      description: recipe.metaDescription || recipe.description,
      url: `/retete/${slug}`,
      type: 'article',
      images: [
        {
          url: '/og-recipe.jpg',
          width: 1200,
          height: 630,
          alt: recipe.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: recipe.title,
      description: recipe.metaDescription || recipe.description,
    },
  };
}

// Difficulty styles - premium gradient versions
const difficultyStyles = {
  USOR: {
    bg: 'bg-gradient-to-r from-success-500 to-emerald-500',
    text: 'text-white',
    label: 'Usor',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  MEDIU: {
    bg: 'bg-gradient-to-r from-warning-500 to-amber-500',
    text: 'text-white',
    label: 'Mediu',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  DIFICIL: {
    bg: 'bg-gradient-to-r from-danger-500 to-rose-500',
    text: 'text-white',
    label: 'Dificil',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
};

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  const [ingredients, relatedRecipes] = await Promise.all([
    getRecipeIngredients(recipe.ingredientIds),
    getRelatedRecipes(recipe.id, recipe.tags, recipe.difficulty),
  ]);

  const difficultyStyle = difficultyStyles[recipe.difficulty] || difficultyStyles.MEDIU;

  // JSON-LD structured data for recipe
  const recipeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    image: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro'}/og-recipe.jpg`,
    author: {
      '@type': 'Organization',
      name: 'Retete Ieftine',
    },
    datePublished: recipe.createdAt.toISOString(),
    prepTime: `PT${recipe.prepTime || 0}M`,
    cookTime: `PT${recipe.cookTime || 0}M`,
    totalTime: `PT${recipe.totalTime || 0}M`,
    recipeYield: `${recipe.servings} portii`,
    recipeCategory: recipe.tags?.[0] || 'General',
    recipeCuisine: 'Romanian',
    keywords: recipe.tags?.join(', '),
    recipeIngredient: ingredients.map((i) => i.name),
    recipeInstructions: recipe.instructions.map((step) => ({
      '@type': 'HowToStep',
      position: step.step,
      text: step.text,
    })),
    nutrition: recipe.nutritionPerServing
      ? {
        '@type': 'NutritionInformation',
        calories: `${recipe.nutritionPerServing.calories || 0} calories`,
        proteinContent: `${recipe.nutritionPerServing.protein || 0}g`,
        carbohydrateContent: `${recipe.nutritionPerServing.carbs || 0}g`,
        fatContent: `${recipe.nutritionPerServing.fat || 0}g`,
      }
      : undefined,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: recipe.favoriteCount.toString(),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }}
      />

      <article className="bg-neutral-50 min-h-screen">
        {/* Premium Hero Header */}
        <div className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-500/20 to-emerald-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-accent-500/15 to-primary-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
          </div>

          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

          <div className="relative container-custom py-8 md:py-12">
            {/* Premium Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6 animate-fade-in-up">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link href="/" className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Acasa
                  </Link>
                </li>
                <li className="text-neutral-600">/</li>
                <li>
                  <Link href="/retete" className="text-neutral-400 hover:text-white transition-colors">
                    Retete
                  </Link>
                </li>
                <li className="text-neutral-600">/</li>
                <li className="text-white font-medium truncate max-w-xs">
                  {recipe.title}
                </li>
              </ol>
            </nav>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Recipe Image Placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-primary-500/20 to-emerald-500/10 rounded-3xl flex items-center justify-center overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent" />
                <svg
                  className="w-24 h-24 text-primary-400/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>

              {/* Recipe Info */}
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/retete?tags=${tag}`}
                        className="px-3 py-1 text-sm font-medium text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 rounded-full transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                <h1 className="font-display text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4">
                  {recipe.title}
                </h1>

                <p className="text-lg text-neutral-300 mb-6">{recipe.description}</p>

                {/* Recipe Meta Badges */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {/* Difficulty */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${difficultyStyle.bg} ${difficultyStyle.text} font-semibold text-sm shadow-lg`}>
                    {difficultyStyle.icon}
                    {difficultyStyle.label}
                  </div>

                  {/* Time */}
                  {recipe.totalTime && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                      <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {recipe.totalTime} minute
                    </div>
                  )}

                  {/* Servings */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {recipe.servings} portii
                  </div>
                </div>

                {/* Cost Badge - Premium */}
                {recipe.estimatedCost && (
                  <div className="inline-flex items-center gap-3 bg-gradient-to-r from-success-500/20 to-emerald-500/20 backdrop-blur-sm border border-success-500/30 px-5 py-3 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success-500 to-emerald-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-white">
                        {formatPrice(recipe.estimatedCost)}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {recipe.costPerServing && `${formatPrice(recipe.costPerServing)} / portie`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="mt-6 flex items-center gap-6 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{recipe.viewCount.toLocaleString('ro-RO')} vizualizari</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-danger-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span>{recipe.favoriteCount} favorite</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-50 to-transparent" />
        </div>

        {/* Recipe Content */}
        <div className="container-custom py-8 lg:py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Time Breakdown - Premium Cards */}
              {(recipe.prepTime || recipe.cookTime) && (
                <section className="grid grid-cols-3 gap-4 animate-fade-in-up">
                  {recipe.prepTime && (
                    <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-card text-center group hover:shadow-elevated transition-all duration-300">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="font-display text-3xl font-bold text-neutral-900">{recipe.prepTime}</p>
                      <p className="text-sm text-neutral-500 mt-1">min pregatire</p>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-card text-center group hover:shadow-elevated transition-all duration-300">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                      </div>
                      <p className="font-display text-3xl font-bold text-neutral-900">{recipe.cookTime}</p>
                      <p className="text-sm text-neutral-500 mt-1">min gatit</p>
                    </div>
                  )}
                  {recipe.totalTime && (
                    <div className="bg-gradient-to-br from-primary-500 to-emerald-500 rounded-2xl p-5 shadow-lg shadow-primary-500/25 text-center text-white">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="font-display text-3xl font-bold">{recipe.totalTime}</p>
                      <p className="text-sm text-white/80 mt-1">min total</p>
                    </div>
                  )}
                </section>
              )}

              {/* Instructions - Premium Editorial Style */}
              <section className="bg-white rounded-2xl p-6 md:p-8 border border-neutral-100 shadow-card">
                <h2 className="font-display text-2xl font-bold text-neutral-900 mb-8 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </span>
                  Instructiuni
                </h2>
                <ol className="space-y-6">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={instruction.step} className="flex gap-5 group">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-500 to-emerald-500 text-white rounded-xl flex items-center justify-center font-display font-bold shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
                        {instruction.step}
                      </div>
                      <div className="flex-1 pt-2">
                        <p className="text-neutral-700 leading-relaxed">{instruction.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Tips - Premium Style */}
              {recipe.tips && recipe.tips.length > 0 && (
                <section className="relative bg-gradient-to-br from-accent-50 to-amber-50 rounded-2xl p-6 md:p-8 border border-accent-100 overflow-hidden">
                  {/* Decorative pattern */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-accent-200/30 to-transparent rounded-full blur-2xl" />

                  <h2 className="relative font-display text-xl font-bold text-accent-800 mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </span>
                    Sfaturi utile
                  </h2>
                  <ul className="relative space-y-3">
                    {recipe.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3 text-accent-800">
                        <svg className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Nutrition Info - Premium Cards */}
              {recipe.nutritionPerServing && (
                <section className="bg-white rounded-2xl p-6 md:p-8 border border-neutral-100 shadow-card">
                  <h2 className="font-display text-xl font-bold text-neutral-900 mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </span>
                    Informatii nutritionale
                    <span className="text-sm font-normal text-neutral-500">(per portie)</span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.nutritionPerServing.calories && (
                      <div className="text-center p-4 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl group hover:shadow-md transition-all">
                        <p className="font-display text-3xl font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                          {recipe.nutritionPerServing.calories}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">kcal</p>
                      </div>
                    )}
                    {recipe.nutritionPerServing.protein && (
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group hover:shadow-md transition-all">
                        <p className="font-display text-3xl font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                          {recipe.nutritionPerServing.protein}g
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">Proteine</p>
                      </div>
                    )}
                    {recipe.nutritionPerServing.carbs && (
                      <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl group hover:shadow-md transition-all">
                        <p className="font-display text-3xl font-bold text-neutral-900 group-hover:text-amber-600 transition-colors">
                          {recipe.nutritionPerServing.carbs}g
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">Carbohidrati</p>
                      </div>
                    )}
                    {recipe.nutritionPerServing.fat && (
                      <div className="text-center p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl group hover:shadow-md transition-all">
                        <p className="font-display text-3xl font-bold text-neutral-900 group-hover:text-rose-600 transition-colors">
                          {recipe.nutritionPerServing.fat}g
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">Grasimi</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Ingredients - Premium Sticky Card */}
              <section className="bg-white rounded-2xl border border-neutral-100 shadow-card sticky top-24 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 to-emerald-500 p-5">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Ingrediente
                  </h2>
                  <p className="text-sm text-white/80 mt-1">{ingredients.length} produse</p>
                </div>

                <div className="p-5">
                  {ingredients.length > 0 ? (
                    <ul className="space-y-3">
                      {ingredients.map((ingredient) => (
                        <li
                          key={ingredient.id}
                          className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100 last:border-0 last:pb-0 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
                              {ingredient.name}
                            </p>
                            <p className="text-xs text-neutral-500">{ingredient.store}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary-600">
                              {formatPrice(ingredient.price)}
                            </p>
                            {ingredient.discountPercentage && ingredient.discountPercentage > 0 && (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-danger-500 to-rose-500 text-white rounded-full">
                                -{ingredient.discountPercentage}%
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      Ingredientele vor fi adaugate in curand.
                    </p>
                  )}

                  {recipe.estimatedCost && (
                    <div className="mt-5 pt-5 border-t border-neutral-100">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-700">Total estimat:</span>
                        <span className="font-display text-xl font-bold text-success-600">
                          {formatPrice(recipe.estimatedCost)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Print/Share - Premium */}
              <div className="flex gap-3">
                <PrintButton className="flex-1" />
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50 hover:border-neutral-300 transition-all"
                  aria-label="Share"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            </aside>
          </div>
        </div>

        {/* Related Recipes - Premium Section */}
        {relatedRecipes.length > 0 && (
          <section className="relative bg-white py-16 border-t border-neutral-100 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2316a34a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />

            <div className="relative container-custom">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900">
                  Retete similare
                </h2>
                <Link
                  href="/retete"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Vezi toate
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
              <div className="grid-recipes">
                {relatedRecipes.map((recipe, index) => (
                  <div key={recipe.id} className="stagger-item" style={{ animationDelay: `${index * 100}ms` }}>
                    <RecipeCard recipe={recipe} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
