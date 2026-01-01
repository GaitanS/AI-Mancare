import { Suspense } from 'react';
import Link from 'next/link';
import prisma from '@/lib/db';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import RecipeCard, { RecipeCardSkeleton } from '@/components/RecipeCard';
import type { Product, Recipe } from '@/types';
import type { Metadata } from 'next';

interface PageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || '';

  return {
    title: query ? `Rezultate pentru "${query}" - CatalogSmart` : 'Cauta - CatalogSmart',
    description: query
      ? `Rezultate pentru cautarea "${query}" - produse si retete economice`
      : 'Cauta produse la reducere si retete economice',
    robots: {
      index: false,
      follow: true,
    },
  };
}

async function searchProducts(query: string): Promise<Product[]> {
  const now = new Date();

  const products = await prisma.product.findMany({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: [
      { discountPercentage: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 24,
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

async function searchRecipes(query: string): Promise<Recipe[]> {
  const recipes = await prisma.recipe.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: [
      { viewCount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 12,
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

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q || '';

  if (!query || query.length < 2) {
    return (
      <div className="bg-neutral-50 min-h-screen">
        {/* Empty Search State with Premium Header */}
        <div className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-500/20 to-emerald-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-accent-500/15 to-primary-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
          </div>

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

          <div className="relative container-custom py-20 md:py-32">
            <div className="text-center max-w-2xl mx-auto animate-fade-in-up">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary-500/30">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Cauta produse si{' '}
                <span className="text-gradient-primary">retete</span>
              </h1>
              <p className="text-lg text-neutral-300">
                Introdu cel putin 2 caractere pentru a cauta
              </p>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-50 to-transparent" />
        </div>
      </div>
    );
  }

  const [products, recipes] = await Promise.all([
    searchProducts(query),
    searchRecipes(query),
  ]);

  const totalResults = products.length + recipes.length;

  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-500/20 to-emerald-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-accent-500/15 to-primary-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative container-custom py-12 md:py-16">
          {/* Breadcrumb */}
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
              <li className="text-white font-medium">Rezultate cautare</li>
            </ol>
          </nav>

          <div className="max-w-3xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {/* Search icon badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-6">
              <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm font-medium text-white/90">Rezultate cautare</span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Rezultate pentru{' '}
              <span className="text-gradient-primary">&quot;{query}&quot;</span>
            </h1>

            {/* Results count */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500/20 to-emerald-500/20 backdrop-blur-sm border border-primary-500/30">
                <span className="font-display text-2xl font-bold text-white">{totalResults}</span>
                <span className="text-sm text-neutral-300">rezultate</span>
              </span>
              {products.length > 0 && (
                <span className="text-sm text-neutral-400">
                  {products.length} produse
                </span>
              )}
              {recipes.length > 0 && (
                <span className="text-sm text-neutral-400">
                  {recipes.length} retete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-50 to-transparent" />
      </div>

      <div className="container-custom py-8 md:py-12">
        {totalResults === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-card animate-fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-bold text-neutral-900 mb-3">Niciun rezultat</h3>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">
              Nu am gasit produse sau retete pentru &quot;{query}&quot;. Incearca alte cuvinte cheie.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/cataloage"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Vezi cataloagele
              </Link>
              <Link
                href="/retete"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Exploreaza retete
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Products Section */}
            {products.length > 0 && (
              <section className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </span>
                    <span>
                      Produse{' '}
                      <span className="text-lg font-normal text-neutral-500">({products.length})</span>
                    </span>
                  </h2>
                  <Link
                    href={`/cataloage?search=${encodeURIComponent(query)}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Vezi toate
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
                <Suspense fallback={<ProductsGridSkeleton />}>
                  <div className="grid-products">
                    {products.map((product, index) => (
                      <div
                        key={product.id}
                        className="stagger-item"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </Suspense>
              </section>
            )}

            {/* Recipes Section */}
            {recipes.length > 0 && (
              <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center shadow-lg shadow-accent-500/20">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </span>
                    <span>
                      Retete{' '}
                      <span className="text-lg font-normal text-neutral-500">({recipes.length})</span>
                    </span>
                  </h2>
                  <Link
                    href={`/retete?search=${encodeURIComponent(query)}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Vezi toate
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
                <Suspense fallback={<RecipesGridSkeleton />}>
                  <div className="grid-recipes">
                    {recipes.map((recipe, index) => (
                      <div
                        key={recipe.id}
                        className="stagger-item"
                        style={{ animationDelay: `${index * 75}ms` }}
                      >
                        <RecipeCard recipe={recipe} />
                      </div>
                    ))}
                  </div>
                </Suspense>
              </section>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {totalResults > 0 && (
          <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <p className="text-neutral-500 mb-6">Nu ai gasit ce cautai?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/cataloage"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Toate cataloagele
              </Link>
              <Link
                href="/retete"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Toate retetele
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductsGridSkeleton() {
  return (
    <div className="grid-products">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
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
