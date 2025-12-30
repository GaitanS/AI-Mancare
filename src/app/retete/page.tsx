import { Suspense } from 'react';
import prisma from '@/lib/db';
import { cached, recipesCache, cacheKeys } from '@/lib/cache';
import RecipeCard, { RecipeCardSkeleton } from '@/components/RecipeCard';
import FilterSidebar, { RecipeFilterConfig } from '@/components/FilterSidebar';
import SortSelect from '@/components/SortSelect';
import type { Recipe, RecipeFilters } from '@/types';
import type { Metadata } from 'next';

// Sort options for recipes page
const recipeSortOptions = [
  { value: 'created-desc', label: 'Cele mai noi' },
  { value: 'views-desc', label: 'Cele mai populare' },
  { value: 'cost-asc', label: 'Cost (mic -> mare)' },
  { value: 'time-asc', label: 'Timp (rapid -> lent)' },
];

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
                    options={recipeSortOptions}
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
            <h2 className="text-xl font-bold text-foreground mb-6 font-heading">
              Categorii populare
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              <CategoryCard
                name="Retete rapide"
                filter="maxTime=30"
                icon={<ClockIcon />}
                color="from-amber-400 to-orange-500"
              />
              <CategoryCard
                name="Sub 20 lei"
                filter="maxCost=20"
                icon={<CoinIcon />}
                color="from-emerald-400 to-green-500"
              />
              <CategoryCard
                name="Retete usoare"
                filter="difficulty=USOR"
                icon={<ThumbUpIcon />}
                color="from-sky-400 to-blue-500"
              />
              <CategoryCard
                name="Cina simpla"
                filter="tags=cina"
                icon={<PlateIcon />}
                color="from-violet-400 to-purple-500"
              />
              <CategoryCard
                name="Mic dejun"
                filter="tags=mic-dejun"
                icon={<SunIcon />}
                color="from-rose-400 to-pink-500"
              />
              <CategoryCard
                name="Vegetarian"
                filter="tags=vegetarian"
                icon={<LeafIcon />}
                color="from-lime-400 to-green-500"
              />
            </div>
          </div>
        </section>
      </div>
    </>
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
      <h3 className="text-lg font-semibold text-foreground mb-2 font-heading">{title}</h3>
      <p className="text-foreground/60 font-body">{description}</p>
    </div>
  );
}

// Category Card Component
function CategoryCard({
  name,
  filter,
  icon,
  color,
}: {
  name: string;
  filter: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <a
      href={`/retete?${filter}`}
      className="group flex flex-col items-center p-4 bg-white rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-lg transition-all duration-300 text-center"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-foreground font-heading">
        {name}
      </span>
    </a>
  );
}

// SVG Icons
function ClockIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  );
}

function PlateIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
