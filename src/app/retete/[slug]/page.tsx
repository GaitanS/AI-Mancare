import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { cache, CacheKeys } from '@/lib/cache';
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

  const ingredientIds = recipe.ingredientIds ? JSON.parse(recipe.ingredientIds) : [];

  return {
    ...recipe,
    estimatedCost: recipe.estimatedCost ? Number(recipe.estimatedCost) : null,
    costPerServing: recipe.costPerServing ? Number(recipe.costPerServing) : null,
    instructions: typeof recipe.instructions === 'string' ? JSON.parse(recipe.instructions) : recipe.instructions,
    tips: recipe.tips ? (typeof recipe.tips === 'string' ? JSON.parse(recipe.tips) : recipe.tips) : [],
    tags: recipe.tags ? (typeof recipe.tags === 'string' ? JSON.parse(recipe.tags) : recipe.tags) : [],
    nutritionPerServing: recipe.nutritionPerServing ? (typeof recipe.nutritionPerServing === 'string' ? JSON.parse(recipe.nutritionPerServing) : recipe.nutritionPerServing) : null,
    ingredientIds,
  };
}

// Get recipe ingredients (products)
async function getRecipeIngredients(ingredientIds: string[]): Promise<Product[]> {
  if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) return [];

  // Filter out any invalid IDs potentially
  const validIds = ingredientIds.filter(id => typeof id === 'string' && id.length > 0);

  if (validIds.length === 0) return [];

  try {
    const products = await prisma.product.findMany({
      where: {
        id: { in: validIds },
      },
    });

    return products.map((p: any) => ({
      ...p,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      extractionConfidence: p.extractionConfidence ? Number(p.extractionConfidence) : null,
      validFrom: p.validFrom.toISOString(),
      validUntil: p.validUntil.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      nutritionalInfo: p.nutritionalInfo ? (typeof p.nutritionalInfo === 'string' ? JSON.parse(p.nutritionalInfo) : p.nutritionalInfo) : null,
      allergens: p.allergens ? (typeof p.allergens === 'string' ? JSON.parse(p.allergens) : p.allergens) : [],
    }));
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return [];
  }
}

// Get related recipes
async function getRelatedRecipes(
  recipeId: string,
  tags: string[] | null,
  difficulty: string
): Promise<Recipe[]> {
  const firstTag = tags && tags.length > 0 ? tags[0] : null;

  const recipes = await prisma.recipe.findMany({
    where: {
      id: { not: recipeId },
      OR: [
        // Fallback: Check if tags string contains the first tag (basic approximate matching)
        firstTag ? { tags: { contains: firstTag } } : undefined,
        { difficulty: difficulty as 'USOR' | 'MEDIU' | 'DIFICIL' },
      ].filter(Boolean) as any,
    },
    take: 3,
    orderBy: { viewCount: 'desc' },
  });

  return recipes.map((r: any) => ({
    ...r,
    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
    costPerServing: r.costPerServing ? Number(r.costPerServing) : null,
    instructions: typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions,
    tips: r.tips ? (typeof r.tips === 'string' ? JSON.parse(r.tips) : r.tips) : [],
    tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
    nutritionPerServing: r.nutritionPerServing ? (typeof r.nutritionPerServing === 'string' ? JSON.parse(r.nutritionPerServing) : r.nutritionPerServing) : null,
    ingredientIds: r.ingredientIds ? (typeof r.ingredientIds === 'string' ? JSON.parse(r.ingredientIds) : r.ingredientIds) : [],
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

// Clean, modern difficulty badges
const difficultyConfig = {
  USOR: { label: 'Usor', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  MEDIU: { label: 'Mediu', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  DIFICIL: { label: 'Dificil', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  const [ingredients, relatedRecipes] = await Promise.all([
    getRecipeIngredients(recipe.ingredientIds),
    getRelatedRecipes(recipe.id, recipe.tags || [], recipe.difficulty),
  ]);

  const difficultyInfo = difficultyConfig[recipe.difficulty as keyof typeof difficultyConfig] || difficultyConfig.MEDIU;

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
      <article className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
        {/* Navigation Breadcrumb - Compact */}
        <div className="sticky top-0 z-30 bg-[#FDFBF7]/95 backdrop-blur-sm border-b border-neutral-200/60 shadow-sm">
          <div className="container-custom py-2 flex items-center justify-between">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <li><Link href="/" className="hover:text-primary-700 transition-colors">Acasa</Link></li>
                <li className="text-neutral-400">/</li>
                <li><Link href="/retete" className="hover:text-primary-700 transition-colors">Retete</Link></li>
                <li className="hidden sm:block text-neutral-400">/</li>
                <li className="hidden sm:block text-neutral-900 truncate max-w-[150px] font-bold">{recipe.title}</li>
              </ol>
            </nav>

            <div className="flex gap-1">
              <button className="p-1.5 text-neutral-600 hover:text-primary-700 hover:bg-neutral-100 rounded-full transition-colors" aria-label="Favorite">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
              <button className="p-1.5 text-neutral-600 hover:text-primary-700 hover:bg-neutral-100 rounded-full transition-colors" aria-label="Share">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="container-custom py-6 lg:py-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Header & Meta (Spans full width on mobile, left col on desktop) */}
            <div className="lg:col-span-8 flex flex-col justify-center text-center lg:text-left">
              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
                  {recipe.tags.slice(0, 3).map((tag: any) => (
                    <Link key={tag} href={`/retete?tags=${tag}`} className="px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-neutral-800 text-[11px] font-bold uppercase tracking-wider hover:border-neutral-400 transition-colors shadow-sm">
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-neutral-900 leading-[1.1] mb-4">
                {recipe.title}
              </h1>

              <p className="text-base md:text-lg text-neutral-800 leading-relaxed font-medium opacity-90 mb-6 max-w-2xl mx-auto lg:mx-0">
                {recipe.description}
              </p>

              {/* Compact Metadata Row */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6 border-t border-b border-neutral-200 py-4 bg-white/50 rounded-xl px-4 lg:px-0 lg:bg-transparent lg:border-t-0 lg:border-b-0 lg:py-0 lg:rounded-none">
                <div className="flex items-center gap-2" title="Dificultate">
                  <div className={`w-2.5 h-2.5 rounded-full ${difficultyInfo.color.split(' ')[0].replace('text-', 'bg-')}`}></div>
                  <span className="text-sm font-bold text-neutral-900">{difficultyInfo.label}</span>
                </div>

                {recipe.totalTime && (
                  <div className="flex items-center gap-2" title="Timp total">
                    <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-neutral-900">{recipe.totalTime} min</span>
                  </div>
                )}

                <div className="flex items-center gap-2" title="Portii">
                  <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-bold text-neutral-900">{recipe.servings} pers.</span>
                </div>

                {recipe.estimatedCost && (
                  <div className="flex items-center gap-2 pl-2 md:pl-4 md:border-l border-neutral-300">
                    <span className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">{formatPrice(recipe.estimatedCost)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar / Ingredients Card (Right side on Desktop) */}
            <div className="lg:col-span-4 lg:row-span-2">
              <div className="bg-white rounded-2xl p-5 shadow-card border border-neutral-200/80 sticky top-20">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                  <h3 className="font-display text-lg font-bold text-neutral-900">Ingrediente</h3>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-600 px-2 py-1 rounded">{ingredients.length} items</span>
                </div>

                {ingredients.length > 0 ? (
                  <ul className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
                    {ingredients.map((item: any) => (
                      <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                        <label className="flex items-start gap-2.5 cursor-pointer leading-tight select-none">
                          <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                          <div>
                            <span className="font-semibold text-neutral-900">{item.name}</span>
                            {item.store && <span className="block text-[10px] text-neutral-500 uppercase font-bold tracking-wide mt-0.5">{item.store}</span>}
                          </div>
                        </label>
                        <div className="text-right whitespace-nowrap">
                          <span className="font-bold text-neutral-900">{formatPrice(item.price)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-neutral-500 text-xs text-center py-4">Fara ingrediente.</p>
                )}

                <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-2">
                  <button className="col-span-2 btn-primary py-2.5 text-sm font-bold shadow-none rounded-lg">
                    Adauga tot
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions (Below Header on Desktop) */}
            <div className="lg:col-span-8">
              <h2 className="font-display text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                Mod de preparare
              </h2>
              <div className="space-y-6">
                {recipe.instructions.map((step: any, idx: number) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm mt-1">
                      {step.step}
                    </div>
                    <div>
                      <p className="text-neutral-900 leading-7 font-medium">
                        {step.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              {recipe.tips && recipe.tips.length > 0 && (
                <div className="mt-10 bg-amber-50 rounded-xl p-5 border border-amber-100">
                  <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    Sfaturi utile
                  </h3>
                  <ul className="space-y-2">
                    {recipe.tips.map((tip: any, i: number) => (
                      <li key={i} className="flex gap-2 text-sm font-medium text-amber-900">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nutrition Table - Compact */}
              {recipe.nutritionPerServing && (
                <div className="mt-10 pt-8 border-t border-neutral-200">
                  <h3 className="font-display text-lg font-bold text-neutral-900 mb-4">Nutritionale <span className="text-sm font-normal text-neutral-500 font-sans">(per portie)</span></h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="bg-white border border-neutral-200 px-4 py-2 rounded-lg text-center min-w-[80px]">
                      <div className="font-bold text-neutral-900 text-lg">{recipe.nutritionPerServing.calories}</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Kcal</div>
                    </div>
                    <div className="bg-white border border-neutral-200 px-4 py-2 rounded-lg text-center min-w-[80px]">
                      <div className="font-bold text-neutral-900 text-lg">{recipe.nutritionPerServing.protein}g</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Prot</div>
                    </div>
                    <div className="bg-white border border-neutral-200 px-4 py-2 rounded-lg text-center min-w-[80px]">
                      <div className="font-bold text-neutral-900 text-lg">{recipe.nutritionPerServing.carbs}g</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Carb</div>
                    </div>
                    <div className="bg-white border border-neutral-200 px-4 py-2 rounded-lg text-center min-w-[80px]">
                      <div className="font-bold text-neutral-900 text-lg">{recipe.nutritionPerServing.fat}g</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Fat</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Related Recipes Section */}
        {relatedRecipes.length > 0 && (
          <section className="bg-neutral-50 border-t border-neutral-200 py-16 mt-16">
            <div className="container-custom">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <span className="text-primary-600 font-bold uppercase tracking-wider text-sm mb-2 block">Descopera mai mult</span>
                  <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900">Alte Retete Similare</h2>
                </div>
                <Link href="/retete" className="hidden md:inline-flex text-neutral-900 font-semibold hover:text-primary-600 transition-colors items-center gap-1">
                  Vezi catalogul <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>

              <div className="grid-recipes">
                {relatedRecipes.map((r: any) => (
                  <RecipeCard key={r.id} recipe={r} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
