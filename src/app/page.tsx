import Link from 'next/link';
import { Suspense } from 'react';
import prisma from '@/lib/db';
import { cached, productsCache, recipesCache, cacheKeys } from '@/lib/cache';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import RecipeCard, { RecipeCardSkeleton } from '@/components/RecipeCard';
import type { Product, Recipe } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retete Ieftine - Oferte si Retete Economice pentru Toata Familia',
  description:
    'Descopera cele mai bune oferte din supermarketuri si retete delicioase la preturi mici. Economiseste bani gatind acasa cu ingrediente la reducere!',
  alternates: {
    canonical: '/',
  },
};

// Fetch featured offers (best discounts)
async function getFeaturedOffers(): Promise<Product[]> {
  return cached(
    cacheKeys.activeOffers(),
    3600,
    async () => {
      const now = new Date();
      const products = await prisma.product.findMany({
        where: {
          validFrom: { lte: now },
          validUntil: { gte: now },
          discountPercentage: { gte: 20 },
        },
        orderBy: { discountPercentage: 'desc' },
        take: 8,
      });

      return products.map((p) => ({
        ...p,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
        allergens: p.allergens as string[] | null,
      }));
    },
    productsCache
  );
}

// Fetch featured recipes
async function getFeaturedRecipes(): Promise<Recipe[]> {
  return cached(
    cacheKeys.weeklyRecipes(),
    7200,
    async () => {
      const recipes = await prisma.recipe.findMany({
        orderBy: [{ viewCount: 'desc' }, { favoriteCount: 'desc' }],
        take: 6,
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
    },
    recipesCache
  );
}

// Get statistics
async function getStats() {
  return cached(
    'stats:home',
    3600,
    async () => {
      const now = new Date();
      const [productCount, recipeCount, storeCount] = await Promise.all([
        prisma.product.count({
          where: {
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
        }),
        prisma.recipe.count(),
        prisma.product.groupBy({
          by: ['store'],
          where: {
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
        }),
      ]);

      return {
        products: productCount,
        recipes: recipeCount,
        stores: storeCount.length,
      };
    }
  );
}

// Store logos/badges
const stores = [
  { name: 'Kaufland', slug: 'kaufland', color: 'bg-red-600' },
  { name: 'Lidl', slug: 'lidl', color: 'bg-blue-700' },
  { name: 'Penny', slug: 'penny', color: 'bg-red-700' },
  { name: 'Carrefour', slug: 'carrefour', color: 'bg-blue-600' },
  { name: 'Mega Image', slug: 'mega-image', color: 'bg-red-600' },
  { name: 'Auchan', slug: 'auchan', color: 'bg-red-600' },
];

export default async function HomePage() {
  const [featuredOffers, featuredRecipes, stats] = await Promise.all([
    getFeaturedOffers(),
    getFeaturedRecipes(),
    getStats(),
  ]);

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="container-custom relative py-16 md:py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Gateste <span className="text-primary-200">delicios</span> fara sa
              golesti portofelul
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl">
              Descopera cele mai bune oferte din supermarketuri si retete economice
              create special pentru ingredientele la reducere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/oferte"
                className="btn-md px-8 py-3 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors text-center"
              >
                Vezi Ofertele
              </Link>
              <Link
                href="/retete"
                className="btn-md px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-center"
              >
                Exploreaza Retete
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 flex flex-wrap gap-8">
              <div>
                <p className="text-3xl font-bold">{stats.products.toLocaleString('ro-RO')}+</p>
                <p className="text-primary-200 text-sm">Produse in oferta</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.recipes.toLocaleString('ro-RO')}+</p>
                <p className="text-primary-200 text-sm">Retete economice</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.stores}</p>
                <p className="text-primary-200 text-sm">Magazine partenere</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gray-50 clip-path-wave" />
      </section>

      {/* Stores Section */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="container-custom">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            <span className="text-sm text-gray-500 font-medium">Magazine:</span>
            {stores.map((store) => (
              <Link
                key={store.slug}
                href={`/oferte/${store.slug}`}
                className={`px-4 py-2 ${store.color} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity`}
              >
                {store.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Offers Section */}
      <section className="section bg-gray-50">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Cele mai bune oferte
              </h2>
              <p className="text-gray-600 mt-1">
                Reduceri de peste 20% valabile acum
              </p>
            </div>
            <Link
              href="/oferte"
              className="hidden sm:inline-flex btn-outline btn-md"
            >
              Vezi toate ofertele
            </Link>
          </div>

          <Suspense fallback={<ProductsGridSkeleton />}>
            {featuredOffers.length > 0 ? (
              <div className="grid-products">
                {featuredOffers.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nicio oferta disponibila"
                description="Revino curand pentru noi oferte!"
              />
            )}
          </Suspense>

          <div className="mt-8 text-center sm:hidden">
            <Link href="/oferte" className="btn-outline btn-md">
              Vezi toate ofertele
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Recipes Section */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Retete populare
              </h2>
              <p className="text-gray-600 mt-1">
                Gateste delicios cu ingrediente la preturi mici
              </p>
            </div>
            <Link
              href="/retete"
              className="hidden sm:inline-flex btn-outline btn-md"
            >
              Vezi toate retetele
            </Link>
          </div>

          <Suspense fallback={<RecipesGridSkeleton />}>
            {featuredRecipes.length > 0 ? (
              <div className="grid-recipes">
                {featuredRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nicio reteta disponibila"
                description="Retetele vor fi disponibile in curand!"
              />
            )}
          </Suspense>

          <div className="mt-8 text-center sm:hidden">
            <Link href="/retete" className="btn-outline btn-md">
              Vezi toate retetele
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Cum functioneaza?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Platforma noastra te ajuta sa economisesti bani si timp in bucatarie
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                1. Colectam ofertele
              </h3>
              <p className="text-gray-600">
                Scanam automat cataloagele din toate magazinele mari pentru a gasi
                cele mai bune preturi.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 text-success-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8"
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
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                2. Generam retete
              </h3>
              <p className="text-gray-600">
                Cream retete bazate pe ingredientele aflate in promotie pentru
                economii maxime.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-warning-100 text-warning-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8"
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
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3. Economisesti
              </h3>
              <p className="text-gray-600">
                Gatesti acasa mancaruri delicioase la preturi mult mai mici decat
                in restaurante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-primary-600 text-white">
        <div className="container-custom text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Pregatit sa economisesti?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Descopera ofertele si retetele zilei si incepe sa gatesti delicios
            fara sa iti faci griji pentru buget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/oferte"
              className="btn-md px-8 py-3 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors"
            >
              Exploreaza Ofertele
            </Link>
            <Link
              href="/retete"
              className="btn-md px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Gaseste Retete
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Loading skeleton for products grid
function ProductsGridSkeleton() {
  return (
    <div className="grid-products">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Loading skeleton for recipes grid
function RecipesGridSkeleton() {
  return (
    <div className="grid-recipes">
      {Array.from({ length: 6 }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Empty state component
function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
