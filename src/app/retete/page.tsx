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

      <div className="bg-neutral-50 min-h-screen">
        {/* Premium Page Header */}
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

          <div className="relative container-custom py-16 md:py-20">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-6 animate-fade-in-up">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                </span>
                <span className="text-sm font-medium text-white/90">
                  {total.toLocaleString('ro-RO')} retete disponibile
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                Retete{' '}
                <span className="text-gradient-primary">Economice</span>
              </h1>
              <p className="text-lg md:text-xl text-neutral-300 max-w-2xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                Descopera retete delicioase create special pentru ingredientele la reducere. Gateste acasa si economiseste!
              </p>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-6 mt-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-white">{total.toLocaleString('ro-RO')}</p>
                    <p className="text-xs text-neutral-400">Retete</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-white">15-50</p>
                    <p className="text-xs text-neutral-400">Lei/portie</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-50 to-transparent" />
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
              {/* Premium Sorting Bar */}
              <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card">
                <p className="text-sm text-neutral-600">
                  Afisez <span className="font-semibold text-neutral-900">{recipes.length}</span> din{' '}
                  <span className="font-semibold text-neutral-900">{total.toLocaleString('ro-RO')}</span> retete
                </p>

                <div className="flex items-center gap-4">
                  <label htmlFor="sortBy" className="text-sm text-neutral-500">
                    Sorteaza:
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
                    {recipes.map((recipe, index) => (
                      <div
                        key={recipe.id}
                        className="stagger-item"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <RecipeCard recipe={recipe} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Nicio reteta gasita"
                    description="Incearca sa modifici filtrele sau cauta alta reteta."
                  />
                )}
              </Suspense>

              {/* Premium Pagination */}
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

        {/* Premium Recipe Categories Section */}
        <section className="relative bg-white py-16 border-t border-neutral-100 overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2316a34a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

          <div className="relative container-custom">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
                Categorii populare
              </h2>
              <p className="text-neutral-600 max-w-lg mx-auto">
                Gaseste rapid retete pe gustul tau
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <CategoryCard
                name="Retete rapide"
                description="Sub 30 minute"
                filter="maxTime=30"
                icon={<ClockIcon />}
                color="from-amber-400 to-orange-500"
              />
              <CategoryCard
                name="Sub 20 lei"
                description="Economice"
                filter="maxCost=20"
                icon={<CoinIcon />}
                color="from-emerald-400 to-green-500"
              />
              <CategoryCard
                name="Retete usoare"
                description="Pentru incepatori"
                filter="difficulty=USOR"
                icon={<ThumbUpIcon />}
                color="from-sky-400 to-blue-500"
              />
              <CategoryCard
                name="Cina simpla"
                description="Seara perfecta"
                filter="tags=cina"
                icon={<PlateIcon />}
                color="from-violet-400 to-purple-500"
              />
              <CategoryCard
                name="Mic dejun"
                description="Start energic"
                filter="tags=mic-dejun"
                icon={<SunIcon />}
                color="from-rose-400 to-pink-500"
              />
              <CategoryCard
                name="Vegetarian"
                description="Fara carne"
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

// Premium Pagination Component
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
    <nav className="mt-10 flex justify-center" aria-label="Paginare">
      <ul className="inline-flex items-center gap-1 p-1.5 bg-white rounded-2xl shadow-card border border-neutral-100">
        <li>
          <Link
            href={currentPage > 1 ? getPageUrl(currentPage - 1) : '#'}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
              currentPage > 1
                ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                : 'text-neutral-300 cursor-not-allowed pointer-events-none'
            }`}
            aria-disabled={currentPage <= 1}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </li>
        {pages.map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className="flex items-center justify-center w-10 h-10 text-neutral-400">...</span>
            ) : (
              <Link
                href={getPageUrl(page as number)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  page === currentPage
                    ? 'bg-gradient-to-r from-primary-600 to-emerald-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </Link>
            )}
          </li>
        ))}
        <li>
          <Link
            href={currentPage < totalPages ? getPageUrl(currentPage + 1) : '#'}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
              currentPage < totalPages
                ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                : 'text-neutral-300 cursor-not-allowed pointer-events-none'
            }`}
            aria-disabled={currentPage >= totalPages}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

// Premium Skeleton components
function FilterSidebarSkeleton() {
  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-card">
        <div className="skeleton-shimmer h-6 w-24 rounded-lg mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton-shimmer h-4 w-20 rounded-lg mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="skeleton-shimmer w-5 h-5 rounded" />
                    <div className="skeleton-shimmer h-4 flex-1 rounded" />
                  </div>
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
    <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-card">
      <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
        <svg className="w-10 h-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="font-display text-xl font-bold text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-500 max-w-sm mx-auto">{description}</p>
      <Link
        href="/retete"
        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reseteaza filtrele
      </Link>
    </div>
  );
}

// Premium Category Card Component
function CategoryCard({
  name,
  description,
  filter,
  icon,
  color,
}: {
  name: string;
  description: string;
  filter: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link
      href={`/retete?${filter}`}
      className="group relative flex flex-col items-center p-5 bg-white rounded-2xl border border-neutral-100 hover:border-transparent hover:shadow-elevated transition-all duration-300 text-center overflow-hidden"
    >
      {/* Hover gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

      <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
        {icon}
      </div>
      <span className="relative font-display text-sm font-bold text-neutral-900 mb-1">
        {name}
      </span>
      <span className="relative text-xs text-neutral-500">
        {description}
      </span>
    </Link>
  );
}

// SVG Icons
function ClockIcon() {
  return (
    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  );
}

function PlateIcon() {
  return (
    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <circle cx="12" cy="12" r="4" strokeWidth={2} />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
