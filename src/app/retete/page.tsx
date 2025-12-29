import { Suspense } from 'react';
import prisma from '@/lib/db';
import { cached, recipesCache, cacheKeys } from '@/lib/cache';
import RecipeCard, { RecipeCardSkeleton } from '@/components/RecipeCard';
import FilterSidebar, { RecipeFilterConfig } from '@/components/FilterSidebar';
import type { Recipe, RecipeFilters } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retete Economice - Gateste delicios la preturi mici',
  description:
    'Descopera retete delicioase create special pentru ingredientele la reducere. Gateste acasa si economiseste bani cu retetele noastre!',
  alternates: {
    canonical: '/retete',
  },
  openGraph: {
    title: 'Retete Economice - Retete Ieftine',
    description: 'Retete delicioase bazate pe ingrediente la reducere.',
    url: '/retete',
  },
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    difficulty?: string;
    minCost?: string;
    maxCost?: string;
    maxTime?: string;
    tags?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

// Fetch recipes with filters
async function getRecipes(filters: RecipeFilters, page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (filters.difficulty) {
    where.difficulty = {
      in: filters.difficulty.split(',') as ('USOR' | 'MEDIU' | 'DIFICIL')[],
    };
  }

  if (filters.maxCost) {
    where.estimatedCost = { lte: filters.maxCost };
  }

  if (filters.maxTime) {
    where.totalTime = { lte: filters.maxTime };
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagArray = Array.isArray(filters.tags) ? filters.tags : filters.tags.split(',');
    where.tags = { hasSome: tagArray };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: any = {};
  switch (filters.sortBy) {
    case 'cost':
      orderBy.estimatedCost = filters.sortOrder || 'asc';
      break;
    case 'time':
      orderBy.totalTime = filters.sortOrder || 'asc';
      break;
    case 'views':
      orderBy.viewCount = filters.sortOrder || 'desc';
      break;
    case 'created':
    default:
      orderBy.createdAt = filters.sortOrder || 'desc';
  }

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.recipe.count({ where }),
  ]);

  return {
    recipes: recipes.map((r) => ({
      ...r,
      estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
      costPerServing: r.costPerServing ? Number(r.costPerServing) : null,
      instructions: r.instructions as Recipe['instructions'],
      tips: r.tips as string[] | null,
      tags: r.tags as string[] | null,
      nutritionPerServing: r.nutritionPerServing as Recipe['nutritionPerServing'],
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Get filter options
async function getFilterOptions(): Promise<RecipeFilterConfig> {
  const [difficultyGroups, costStats, timeStats, tagGroups] = await Promise.all([
    prisma.recipe.groupBy({
      by: ['difficulty'],
      _count: true,
    }),
    prisma.recipe.aggregate({
      _min: { estimatedCost: true },
      _max: { estimatedCost: true },
    }),
    prisma.recipe.aggregate({
      _min: { totalTime: true },
      _max: { totalTime: true },
    }),
    // Tags query simplified for SQLite - returns empty array
    Promise.resolve([] as { tag: string; count: number }[]),
  ]);

  const difficultyLabels: Record<string, string> = {
    USOR: 'Usor',
    MEDIU: 'Mediu',
    DIFICIL: 'Dificil',
  };

  return {
    difficulties: difficultyGroups.map((g) => ({
      value: g.difficulty,
      label: difficultyLabels[g.difficulty] || g.difficulty,
      count: g._count,
    })),
    tags: (tagGroups || []).map((t) => ({
      value: t.tag,
      label: t.tag,
      count: t.count,
    })),
    costRange: {
      min: Number(costStats._min.estimatedCost) || 0,
      max: Number(costStats._max.estimatedCost) || 200,
    },
    timeRange: {
      min: Number(timeStats._min.totalTime) || 0,
      max: Number(timeStats._max.totalTime) || 180,
    },
  };
}

export default async function RetetePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = 12;

  const filters: RecipeFilters = {
    difficulty: params.difficulty as RecipeFilters['difficulty'],
    maxCost: params.maxCost ? parseFloat(params.maxCost) : undefined,
    maxTime: params.maxTime ? parseFloat(params.maxTime) : undefined,
    tags: params.tags ? params.tags.split(',') : undefined,
    search: params.search,
    sortBy: params.sortBy as RecipeFilters['sortBy'],
    sortOrder: params.sortOrder as RecipeFilters['sortOrder'],
  };

  const [{ recipes, total, totalPages }, filterOptions] = await Promise.all([
    getRecipes(filters, page, pageSize),
    getFilterOptions(),
  ]);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Retete Economice',
    description: 'Colectie de retete delicioase la preturi accesibile',
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro'}/retete`,
    numberOfItems: total,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-gray-50 min-h-screen">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="container-custom py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Retete Economice
            </h1>
            <p className="text-primary-100 max-w-2xl">
              Descopera {total.toLocaleString('ro-RO')} retete delicioase create
              special pentru ingredientele la reducere. Gateste acasa si
              economiseste!
            </p>
          </div>
        </div>

        <div className="container-custom py-8">
          <div className="flex gap-8">
            {/* Filter Sidebar */}
            <Suspense fallback={<FilterSidebarSkeleton />}>
              <FilterSidebar
                type="recipes"
                config={filterOptions}
                className="w-64 flex-shrink-0"
              />
            </Suspense>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Sorting and View Options */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Afisez {recipes.length} din {total.toLocaleString('ro-RO')} retete
                </p>

                <div className="flex items-center gap-4">
                  <label htmlFor="sortBy" className="text-sm text-gray-600">
                    Sorteaza dupa:
                  </label>
                  <SortSelect
                    currentSort={filters.sortBy}
                    currentOrder={filters.sortOrder}
                  />
                </div>
              </div>

              {/* Recipes Grid */}
              <Suspense fallback={<RecipesGridSkeleton />}>
                {recipes.length > 0 ? (
                  <div className="grid-recipes">
                    {recipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Nicio reteta gasita"
                    description="Incearca sa modifici filtrele sau cauta alta reteta."
                  />
                )}
              </Suspense>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath="/retete"
                  searchParams={params}
                />
              )}
            </div>
          </div>
        </div>

        {/* Recipe Categories Section */}
        <section className="bg-white py-12 border-t border-gray-100">
          <div className="container-custom">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Categorii populare
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: 'Retete rapide', filter: 'maxTime=30', icon: '⚡' },
                { name: 'Sub 20 lei', filter: 'maxCost=20', icon: '💰' },
                { name: 'Retete usoare', filter: 'difficulty=USOR', icon: '👌' },
                { name: 'Cina simpla', filter: 'tags=cina', icon: '🍽️' },
                { name: 'Mic dejun', filter: 'tags=mic-dejun', icon: '🍳' },
                { name: 'Vegetarian', filter: 'tags=vegetarian', icon: '🥗' },
              ].map((category) => (
                <a
                  key={category.name}
                  href={`/retete?${category.filter}`}
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-center"
                >
                  <span className="text-2xl mb-2">{category.icon}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {category.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// Sort Select Component - using form action instead of onChange
function SortSelect({
  currentSort,
  currentOrder,
}: {
  currentSort?: string;
  currentOrder?: string;
}) {
  const sortOptions = [
    { value: 'created-desc', label: 'Cele mai noi' },
    { value: 'views-desc', label: 'Cele mai populare' },
    { value: 'cost-asc', label: 'Cost (mic -> mare)' },
    { value: 'time-asc', label: 'Timp (rapid -> lent)' },
  ];

  const currentValue = `${currentSort || 'created'}-${currentOrder || 'desc'}`;

  return (
    <form method="get">
      <select
        name="sort"
        id="sortBy"
        defaultValue={currentValue}
        className="input py-1.5 text-sm w-auto"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn btn-sm ml-2">Aplica</button>
      </noscript>
    </form>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') {
        params.set(key, value);
      }
    });
    params.set('page', page.toString());
    return `${basePath}?${params.toString()}`;
  };

  const pages: (number | string)[] = [];
  const showPages = 5;

  if (totalPages <= showPages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  return (
    <nav className="mt-8 flex justify-center" aria-label="Paginare">
      <ul className="flex items-center gap-1">
        <li>
          <a
            href={currentPage > 1 ? getPageUrl(currentPage - 1) : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              currentPage > 1
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            aria-disabled={currentPage <= 1}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
        </li>
        {pages.map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className="flex items-center justify-center w-10 h-10 text-gray-400">...</span>
            ) : (
              <a
                href={getPageUrl(page as number)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium ${
                  page === currentPage
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </a>
            )}
          </li>
        ))}
        <li>
          <a
            href={currentPage < totalPages ? getPageUrl(currentPage + 1) : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              currentPage < totalPages
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            aria-disabled={currentPage >= totalPages}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </li>
      </ul>
    </nav>
  );
}

// Skeleton components
function FilterSidebarSkeleton() {
  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-20 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecipesGridSkeleton() {
  return (
    <div className="grid-recipes">
      {Array.from({ length: 12 }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
