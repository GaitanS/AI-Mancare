import { Suspense } from 'react';
import Link from 'next/link';
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
    recipes: recipes.map((r: any) => ({
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
    difficulties: difficultyGroups.map((g: any) => ({
      value: g.difficulty,
      label: difficultyLabels[g.difficulty] || g.difficulty,
      count: g._count,
    })),
    tags: (tagGroups || []).map((t: any) => ({
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

      <div className="bg-[#FDFBF7] min-h-screen text-neutral-900 pb-20">
        {/* Premium Header */}
        <div className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white overflow-hidden mb-8">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

          <div className="relative container-custom py-8 md:py-10 z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-orange-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Catalog Culinar</span>
                </div>
                <h1 className="font-display text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
                  Găsește Inspirație
                </h1>
                <p className="text-neutral-400 text-sm md:text-base max-w-lg">
                  Rețete delicioase optimizate pentru bugetul și preferințele tale.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-custom pt-0 pb-4 sm:py-6 lg:py-8">
          {/* Mobile Toolbar (LG Hidden) */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1/2">
                {/* Mobile Filter Trigger */}
                <Suspense fallback={<div className="h-10 bg-white rounded-xl border border-neutral-200 animate-pulse" />}>
                  <FilterSidebar
                    type="recipes"
                    config={filterOptions}
                    className="w-full"
                  />
                </Suspense>
              </div>
              <div className="w-1/2">
                <SortSelect
                  options={recipeSortOptions}
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  className="w-full"
                />
              </div>
            </div>
            {/* Simple Results Text */}
            <p className="text-center text-xs font-medium text-neutral-400 mt-3">
              Arată {total} rețete
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Filter Sidebar (Hidden on Mobile) */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <Suspense fallback={<FilterSidebarSkeleton />}>
                <FilterSidebar
                  type="recipes"
                  config={filterOptions}
                  className="w-full"
                />
              </Suspense>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Desktop Sorting Bar (Hidden on Mobile) */}
              <div className="hidden lg:flex bg-white rounded-xl border border-neutral-200 p-4 mb-6 items-center justify-between gap-4 shadow-sm">
                <p className="text-sm font-medium text-neutral-700">
                  Arată <span className="font-bold text-neutral-900">{recipes.length}</span> din{' '}
                  <span className="font-bold text-neutral-900">{total}</span> rezultate
                </p>

                <div className="flex items-center gap-3">
                  <label htmlFor="sortBy" className="text-sm font-medium text-neutral-600">
                    Ordonează:
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
                    {recipes.map((recipe: any, index: number) => (
                      <div
                        key={recipe.id}
                        className="opacity-0 animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                      >
                        <RecipeCard recipe={recipe} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Nicio rețetă găsită"
                    description="Încearcă să modifici filtrele pentru a găsi ceea ce cauți."
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

        {/* Clean Categories Section */}
        <section className="border-t border-neutral-200 py-16 bg-white">
          <div className="container-custom">
            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-8 text-center">
              Explorează pe Categorii
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <CategoryCard
                name="Rapide"
                description="< 30 min"
                filter="maxTime=30"
                icon={<ClockIcon />}
              />
              <CategoryCard
                name="Economice"
                description="< 20 Lei"
                filter="maxCost=20"
                icon={<CoinIcon />}
              />
              <CategoryCard
                name="Ușoare"
                description="Începători"
                filter="difficulty=USOR"
                icon={<ThumbUpIcon />}
              />
              <CategoryCard
                name="Cină"
                description="Relaxată"
                filter="tags=cina"
                icon={<PlateIcon />}
              />
              <CategoryCard
                name="Mic Dejun"
                description="Energie"
                filter="tags=mic-dejun"
                icon={<SunIcon />}
              />
              <CategoryCard
                name="Vegetarian"
                description="Green"
                filter="tags=vegetarian"
                icon={<LeafIcon />}
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
    /* Logic simplified for brevity */
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  return (
    <nav className="mt-12 flex justify-center" aria-label="Paginare">
      <ul className="inline-flex items-center gap-2">
        {pages.map((page: any, index: number) => (
          <li key={index}>
            {page === '...' ? (
              <span className="w-10 h-10 flex items-center justify-center text-neutral-400">...</span>
            ) : (
              <Link
                href={getPageUrl(page as number)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${page === currentPage
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Skeleton components
function FilterSidebarSkeleton() {
  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="h-6 bg-neutral-100 rounded mb-6 w-24 animate-pulse" />
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_: any, i: number) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-neutral-100 rounded w-20 animate-pulse" />
              <div className="h-4 bg-neutral-50 rounded w-full animate-pulse" />
              <div className="h-4 bg-neutral-50 rounded w-full animate-pulse" />
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
      {Array.from({ length: 6 }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-24 bg-white rounded-xl border border-neutral-200">
      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="font-bold text-xl text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-500 max-w-sm mx-auto mb-6">{description}</p>
      <Link href="/retete" className="btn-primary inline-flex">
        Resetează filtrele
      </Link>
    </div>
  );
}

// Clean Category Card
function CategoryCard({
  name,
  description,
  filter,
  icon,
}: {
  name: string;
  description: string;
  filter: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={`/retete?${filter}`}
      className="group flex flex-col items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-neutral-300 hover:bg-white transition-all text-center"
    >
      <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-neutral-700">
        {icon}
      </div>
      <span className="font-bold text-neutral-900 text-sm mb-0.5">
        {name}
      </span>
      <span className="text-xs text-neutral-500 font-medium">
        {description}
      </span>
    </Link>
  );
}

// Simple Icons (Dark text)
function ClockIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CoinIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ThumbUpIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>;
}
function PlateIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>;
}
function SunIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function LeafIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
}
