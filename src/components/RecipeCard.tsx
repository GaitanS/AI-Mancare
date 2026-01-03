'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn, formatPrice, truncate } from '@/lib/utils';
import type { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  className?: string;
  priority?: boolean;
}

// Difficulty styling with warm culinary gradients
const difficultyConfig = {
  USOR: {
    bg: 'bg-gradient-to-r from-secondary-500 to-secondary-600',
    text: 'text-white',
    label: 'Usor',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  MEDIU: {
    bg: 'bg-gradient-to-r from-accent-500 to-accent-600',
    text: 'text-white',
    label: 'Mediu',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  DIFICIL: {
    bg: 'bg-gradient-to-r from-primary-500 to-primary-600',
    text: 'text-white',
    label: 'Dificil',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
};

export default function RecipeCard({
  recipe,
  className,
  priority = false,
}: RecipeCardProps) {
  const difficulty = difficultyConfig[recipe.difficulty] || difficultyConfig.MEDIU;

  // Calculate if this is a budget-friendly recipe (under 15 lei)
  const isBudgetFriendly = recipe.estimatedCost && recipe.estimatedCost <= 15;

  return (
    <article
      className={cn(
        'group relative flex flex-col h-full',
        'bg-white rounded-2xl border border-neutral-200/80',
        'shadow-card hover:shadow-elevated',
        'hover:-translate-y-1.5 transition-all duration-300',
        'overflow-hidden',
        className
      )}
      itemScope
      itemType="https://schema.org/Recipe"
    >
      <Link href={`/retete/${recipe.slug}`} className="flex flex-col h-full">
        {/* Recipe Image Area */}
        <div className="relative aspect-recipe bg-gradient-to-br from-accent-50 via-kitchen-cream to-secondary-50 overflow-hidden">
          {/* Recipe Image or Fallback */}
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              unoptimized={recipe.imageUrl.startsWith('http')}
            />
          ) : (
            <>
              {/* Background Pattern */}
              <div className="absolute inset-0 pattern-kitchen opacity-40" />
              {/* Recipe Icon - Kitchen pot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 text-accent-300 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <svg
                    className="w-full h-full"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
              </div>
            </>
          )}

          {/* Top Left Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {/* Difficulty Badge */}
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-md',
              difficulty.bg,
              difficulty.text
            )}>
              {difficulty.icon}
              {difficulty.label}
            </span>

            {/* Time Badge */}
            {recipe.totalTime && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-neutral-700 backdrop-blur-sm shadow-sm border border-neutral-100">
                <svg
                  className="w-3 h-3 text-neutral-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {recipe.totalTime} min
              </span>
            )}
          </div>

          {/* Cost Badge - Top Right */}
          {recipe.estimatedCost && (
            <div className="absolute top-3 right-3">
              <span className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg',
                isBudgetFriendly
                  ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-glow-success'
                  : 'bg-white text-primary-600 border border-primary-100'
              )}>
                {isBudgetFriendly && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                ~{formatPrice(recipe.estimatedCost)}
              </span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full text-sm font-semibold text-primary-600 shadow-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Vezi reteta
              </span>
            </div>
          </div>
        </div>

        {/* Recipe Content */}
        <div className="flex flex-col flex-1 p-4">
          {/* Tags */}
          {(() => {
            let tags = recipe.tags;
            if (typeof tags === 'string') {
              try {
                tags = JSON.parse(tags);
              } catch (e) {
                tags = [];
              }
            }
            if (!Array.isArray(tags)) tags = [];

            if (tags.length === 0) return null;

            return (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {tags.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Recipe Title */}
          <h3
            className="font-display text-lg font-bold text-neutral-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors duration-200"
            itemProp="name"
          >
            {recipe.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-neutral-600 line-clamp-2 mb-4 leading-relaxed" itemProp="description">
            {truncate(recipe.description, 100)}
          </p>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Meta Info Bar */}
          <div className="mt-auto pt-3 border-t border-neutral-100">
            <div className="flex items-center justify-between text-sm">
              {/* Servings */}
              <div className="flex items-center gap-1.5 text-neutral-500" itemProp="recipeYield">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="font-medium">{recipe.servings} portii</span>
              </div>

              {/* Cost per Serving */}
              {recipe.costPerServing && (
                <div className="flex items-center gap-1 text-secondary-600 font-semibold">
                  <span>{formatPrice(recipe.costPerServing)}/portie</span>
                </div>
              )}

              {/* Calories */}
              {recipe.totalCalories && (
                <div className="flex items-center gap-1 text-neutral-500">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                  <span className="font-medium">{Math.round(recipe.totalCalories / recipe.servings)} kcal</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{recipe.favoriteCount}</span>
            </div>
          </div>

          {/* Schema.org Metadata */}
          <meta itemProp="prepTime" content={`PT${recipe.prepTime || 0}M`} />
          <meta itemProp="cookTime" content={`PT${recipe.cookTime || 0}M`} />
          <meta itemProp="totalTime" content={`PT${recipe.totalTime || 0}M`} />
        </div>
      </Link>
    </article>
  );
}

// Premium Skeleton Loading Component
export function RecipeCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card overflow-hidden">
      <div className="aspect-recipe skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 skeleton-shimmer rounded-full w-16" />
          <div className="h-5 skeleton-shimmer rounded-full w-20" />
        </div>
        <div className="h-6 skeleton-shimmer rounded-lg w-full" />
        <div className="h-6 skeleton-shimmer rounded-lg w-3/4" />
        <div className="h-4 skeleton-shimmer rounded w-full" />
        <div className="h-4 skeleton-shimmer rounded w-2/3" />
        <div className="pt-3 border-t border-neutral-100">
          <div className="flex justify-between">
            <div className="h-4 skeleton-shimmer rounded w-20" />
            <div className="h-4 skeleton-shimmer rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
