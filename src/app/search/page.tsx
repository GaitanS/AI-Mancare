import { Suspense } from 'react';
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
    title: query ? `Rezultate pentru "${query}" - Retete Ieftine` : 'Cauta - Retete Ieftine',
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
      <div className="bg-background min-h-screen">
        <div className="container-custom py-12">
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4 font-heading">Cauta produse si retete</h1>
            <p className="text-foreground/60 font-body">
              Introdu cel putin 2 caractere pentru a cauta
            </p>
          </div>
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
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 w-40 sm:w-60 h-40 sm:h-60 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
          <div className="absolute -bottom-10 sm:-bottom-20 -left-10 sm:-left-20 w-40 sm:w-60 h-40 sm:h-60 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] sm:bg-[size:30px_30px]" />

        <div className="container-custom py-6 sm:py-12 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="text-white/80 text-xs sm:text-sm font-medium font-body">Rezultate cautare</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 font-heading">
            Rezultate pentru{' '}
            <span className="bg-gradient-to-r from-primary-300 to-emerald-300 bg-clip-text text-transparent">
              &quot;{query}&quot;
            </span>
          </h1>
          <p className="text-white/80 font-body flex items-center gap-2 text-sm sm:text-base">
            <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold">
              {totalResults}
            </span>
            <span>rezultate gasite</span>
          </p>
        </div>
      </div>

      <div className="container-custom py-6 sm:py-12">
        {totalResults === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-soft">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 font-heading">Niciun rezultat</h3>
            <p className="text-foreground/60 font-body mb-6">
              Nu am gasit produse sau retete pentru &quot;{query}&quot;
            </p>
            <a
              href="/oferte"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors font-heading"
            >
              Vezi toate ofertele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {/* Products Section */}
            {products.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground font-heading flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </span>
                    Produse ({products.length})
                  </h2>
                  <a
                    href={`/oferte?search=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    Vezi toate
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
                <Suspense fallback={<ProductsGridSkeleton />}>
                  <div className="grid-products">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </Suspense>
              </section>
            )}

            {/* Recipes Section */}
            {recipes.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground font-heading flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </span>
                    Retete ({recipes.length})
                  </h2>
                  <a
                    href={`/retete?search=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    Vezi toate
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
                <Suspense fallback={<RecipesGridSkeleton />}>
                  <div className="grid-recipes">
                    {recipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </Suspense>
              </section>
            )}
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
