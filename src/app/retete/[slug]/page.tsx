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

// Difficulty styles
const difficultyStyles = {
  USOR: { bg: 'bg-success-100', text: 'text-success-700', label: 'Usor' },
  MEDIU: { bg: 'bg-warning-100', text: 'text-warning-700', label: 'Mediu' },
  DIFICIL: { bg: 'bg-danger-100', text: 'text-danger-700', label: 'Dificil' },
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

      <article className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-100">
          <div className="container-custom py-4">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm text-gray-600">
                <li>
                  <Link href="/" className="hover:text-primary-600">
                    Acasa
                  </Link>
                </li>
                <li>/</li>
                <li>
                  <Link href="/retete" className="hover:text-primary-600">
                    Retete
                  </Link>
                </li>
                <li>/</li>
                <li className="text-gray-900 font-medium truncate max-w-xs">
                  {recipe.title}
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Recipe Header */}
        <header className="bg-white border-b border-gray-100">
          <div className="container-custom py-8 lg:py-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Recipe Image Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-24 h-24 text-primary-300"
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
              <div>
                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/retete?tags=${tag}`}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {recipe.title}
                </h1>

                <p className="text-lg text-gray-600 mb-6">{recipe.description}</p>

                {/* Recipe Meta */}
                <div className="flex flex-wrap gap-4 mb-6">
                  {/* Difficulty */}
                  <div className={`badge ${difficultyStyle.bg} ${difficultyStyle.text}`}>
                    {difficultyStyle.label}
                  </div>

                  {/* Time */}
                  {recipe.totalTime && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{recipe.totalTime} minute</span>
                    </div>
                  )}

                  {/* Servings */}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>{recipe.servings} portii</span>
                  </div>
                </div>

                {/* Cost Badge */}
                {recipe.estimatedCost && (
                  <div className="inline-flex items-center gap-2 bg-success-50 text-success-700 px-4 py-2 rounded-lg">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <span className="font-bold text-lg">
                        {formatPrice(recipe.estimatedCost)}
                      </span>
                      <span className="text-sm"> / reteta</span>
                    </span>
                    {recipe.costPerServing && (
                      <span className="text-sm text-success-600">
                        ({formatPrice(recipe.costPerServing)} / portie)
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span>{recipe.viewCount} vizualizari</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>{recipe.favoriteCount} favorite</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Recipe Content */}
        <div className="container-custom py-8 lg:py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Time Breakdown */}
              {(recipe.prepTime || recipe.cookTime) && (
                <section className="bg-white rounded-xl p-6 border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Timp de preparare
                  </h2>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {recipe.prepTime && (
                      <div>
                        <p className="text-2xl font-bold text-primary-600">
                          {recipe.prepTime}
                        </p>
                        <p className="text-sm text-gray-500">min pregatire</p>
                      </div>
                    )}
                    {recipe.cookTime && (
                      <div>
                        <p className="text-2xl font-bold text-primary-600">
                          {recipe.cookTime}
                        </p>
                        <p className="text-sm text-gray-500">min gatit</p>
                      </div>
                    )}
                    {recipe.totalTime && (
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {recipe.totalTime}
                        </p>
                        <p className="text-sm text-gray-500">min total</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Instructions */}
              <section className="bg-white rounded-xl p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Instructiuni
                </h2>
                <ol className="space-y-6">
                  {recipe.instructions.map((instruction) => (
                    <li key={instruction.step} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-sm">
                        {instruction.step}
                      </div>
                      <p className="text-gray-700 pt-1">{instruction.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Tips */}
              {recipe.tips && recipe.tips.length > 0 && (
                <section className="bg-warning-50 rounded-xl p-6 border border-warning-100">
                  <h2 className="text-lg font-semibold text-warning-800 mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Sfaturi utile
                  </h2>
                  <ul className="space-y-2">
                    {recipe.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-warning-800">
                        <span className="text-warning-500">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Nutrition Info */}
              {recipe.nutritionPerServing && (
                <section className="bg-white rounded-xl p-6 border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Informatii nutritionale (per portie)
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.nutritionPerServing.calories && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                          {recipe.nutritionPerServing.calories}
                        </p>
                        <p className="text-xs text-gray-500">kcal</p>
                      </div>
                    )}
                    {recipe.nutritionPerServing.protein && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                          {recipe.nutritionPerServing.protein}g
                        </p>
                        <p className="text-xs text-gray-500">Proteine</p>
                      </div>
                    )}
                    {recipe.nutritionPerServing.carbs && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                          {recipe.nutritionPerServing.carbs}g
                        </p>
                        <p className="text-xs text-gray-500">Carbohidrati</p>
                      </div>
                    )}
                    {recipe.nutritionPerServing.fat && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                          {recipe.nutritionPerServing.fat}g
                        </p>
                        <p className="text-xs text-gray-500">Grasimi</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Ingredients */}
              <section className="bg-white rounded-xl p-6 border border-gray-100 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ingrediente
                </h2>
                {ingredients.length > 0 ? (
                  <ul className="space-y-3">
                    {ingredients.map((ingredient) => (
                      <li
                        key={ingredient.id}
                        className="flex items-center justify-between gap-2 pb-2 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ingredient.name}
                          </p>
                          <p className="text-xs text-gray-500">{ingredient.store}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary-600">
                            {formatPrice(ingredient.price)}
                          </p>
                          {ingredient.discountPercentage &&
                            ingredient.discountPercentage > 0 && (
                              <span className="badge-discount text-xs">
                                -{ingredient.discountPercentage}%
                              </span>
                            )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    Ingredientele vor fi adaugate in curand.
                  </p>
                )}

                {recipe.estimatedCost && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Total estimat:</span>
                      <span className="text-lg font-bold text-success-600">
                        {formatPrice(recipe.estimatedCost)}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* Print/Share */}
              <div className="flex gap-2">
                <PrintButton className="flex-1" />
              </div>
            </aside>
          </div>
        </div>

        {/* Related Recipes */}
        {relatedRecipes.length > 0 && (
          <section className="bg-white py-12 border-t border-gray-100">
            <div className="container-custom">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Retete similare
              </h2>
              <div className="grid-recipes">
                {relatedRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
