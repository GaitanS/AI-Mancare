'use client';

import Link from 'next/link';
import { cn, formatPrice, truncate } from '@/lib/utils';
import type { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  className?: string;
  priority?: boolean;
}

// Difficulty color mapping
const difficultyColors = {
  USOR: { bg: 'bg-success-100', text: 'text-success-700', label: 'Usor' },
  MEDIU: { bg: 'bg-warning-100', text: 'text-warning-700', label: 'Mediu' },
  DIFICIL: { bg: 'bg-danger-100', text: 'text-danger-700', label: 'Dificil' },
};

export default function RecipeCard({
  recipe,
  className,
  priority = false,
}: RecipeCardProps) {
  const difficultyStyle = difficultyColors[recipe.difficulty] || difficultyColors.MEDIU;

  return (
    <article
      className={cn('card-hover group relative flex flex-col h-full', className)}
      itemScope
      itemType="https://schema.org/Recipe"
    >
      <Link href={`/retete/${recipe.slug}`} className="block">
        {/* Recipe Image Placeholder */}
        <div className="aspect-recipe bg-gradient-to-br from-primary-100 to-primary-50 rounded-t-xl flex items-center justify-center overflow-hidden relative">
          <div className="w-24 h-24 text-primary-300 group-hover:scale-110 transition-transform duration-300">
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {/* Difficulty Badge */}
            <span className={cn('badge', difficultyStyle.bg, difficultyStyle.text)}>
              {difficultyStyle.label}
            </span>

            {/* Time Badge */}
            {recipe.totalTime && (
              <span className="badge bg-white/90 text-gray-700 backdrop-blur-sm">
                <svg
                  className="w-3 h-3 mr-1"
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

          {/* Cost Badge */}
          {recipe.estimatedCost && (
            <div className="absolute top-3 right-3">
              <span className="badge bg-success-500 text-white shadow-md">
                ~{formatPrice(recipe.estimatedCost)}
              </span>
            </div>
          )}
        </div>

        {/* Recipe Info */}
        <div className="flex flex-col flex-1 p-4">
          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-primary-600 font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Recipe Title */}
          <h3
            className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors"
            itemProp="name"
          >
            {recipe.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-4" itemProp="description">
            {truncate(recipe.description, 100)}
          </p>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Meta Info */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            {/* Servings */}
            <div className="flex items-center gap-1" itemProp="recipeYield">
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
              <span>{recipe.servings} portii</span>
            </div>

            {/* Cost per Serving */}
            {recipe.costPerServing && (
              <div className="flex items-center gap-1 text-success-600 font-medium">
                <span>{formatPrice(recipe.costPerServing)} / portie</span>
              </div>
            )}

            {/* Calories */}
            {recipe.totalCalories && (
              <div className="flex items-center gap-1">
                <span>{Math.round(recipe.totalCalories / recipe.servings)} kcal</span>
              </div>
            )}
          </div>

          {/* View Count */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
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
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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

          {/* Schema.org Metadata */}
          <meta itemProp="prepTime" content={`PT${recipe.prepTime || 0}M`} />
          <meta itemProp="cookTime" content={`PT${recipe.cookTime || 0}M`} />
          <meta itemProp="totalTime" content={`PT${recipe.totalTime || 0}M`} />
        </div>
      </Link>
    </article>
  );
}

// Skeleton Loading Component
export function RecipeCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-recipe bg-gray-200 rounded-t-xl" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
