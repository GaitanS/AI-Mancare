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
      {/* Hero Section - Optimized for mobile */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900">
        {/* Animated background elements - smaller on mobile */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-48 sm:w-80 h-48 sm:h-80 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
          <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-48 sm:w-80 h-48 sm:h-80 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] sm:bg-[size:50px_50px]" />

        <div className="container-custom relative z-10 py-12 sm:py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center animate-slide-up">
            {/* Badge - smaller on mobile */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6 sm:mb-8">
              <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary-500 rounded-full animate-pulse" />
              <span className="text-xs sm:text-sm text-white/90 font-body">Oferte actualizate zilnic</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight text-white font-heading">
              Gateste{' '}
              <span className="bg-gradient-to-r from-primary-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                delicios
              </span>
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              fara sa golesti portofelul
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed font-body px-4 sm:px-0">
              Descopera cele mai bune oferte din supermarketuri si retete economice
              create special pentru ingredientele la reducere.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-16 px-4 sm:px-0">
              <Link
                href="/oferte"
                className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-500 to-emerald-500 text-white font-semibold rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-glow hover:scale-105"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 font-heading text-sm sm:text-base">
                  Vezi Ofertele
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link
                href="/retete"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl sm:rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 font-heading text-sm sm:text-base"
              >
                Exploreaza Retete
              </Link>
            </div>

            {/* Stats - Compact on mobile */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 max-w-xl mx-auto px-2 sm:px-0">
              <div className="p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                <p className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-400 to-emerald-400 bg-clip-text text-transparent font-heading">
                  {stats.products.toLocaleString('ro-RO')}+
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mt-0.5 sm:mt-1 font-body">Produse</p>
              </div>
              <div className="p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                <p className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent-400 to-yellow-400 bg-clip-text text-transparent font-heading">
                  {stats.recipes.toLocaleString('ro-RO')}+
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mt-0.5 sm:mt-1 font-body">Retete</p>
              </div>
              <div className="p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                <p className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent font-heading">
                  {stats.stores}
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mt-0.5 sm:mt-1 font-body">Magazine</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Stores Section - Compact on mobile */}
      <section className="py-8 sm:py-12 bg-background">
        <div className="container-custom">
          <p className="text-center text-xs sm:text-sm text-foreground/60 mb-4 sm:mb-6 font-medium uppercase tracking-wider font-body">Magazine partenere</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4">
            {stores.map((store, index) => (
              <Link
                key={store.slug}
                href={`/oferte/${store.slug}`}
                className="group relative px-4 sm:px-6 py-2 sm:py-3 bg-white text-foreground text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:bg-gradient-to-r hover:from-primary-500 hover:to-emerald-500 hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg font-heading border border-gray-100"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="relative z-10">{store.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Offers Section - Mobile optimized */}
      <section className="py-10 sm:py-16 md:py-20 bg-gradient-to-b from-background to-white">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 sm:mb-10 md:mb-12 gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2 font-heading">
                Cele mai bune{' '}
                <span className="bg-gradient-to-r from-primary-500 to-emerald-500 bg-clip-text text-transparent">
                  oferte
                </span>
              </h2>
              <p className="text-sm sm:text-base text-foreground/60 font-body">
                Reduceri de peste 20% valabile acum
              </p>
            </div>
            <Link
              href="/oferte"
              className="hidden sm:inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-primary-700 transition-all duration-300 hover:scale-105 font-heading"
            >
              Vezi toate ofertele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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

          <div className="mt-6 sm:mt-8 text-center sm:hidden">
            <Link href="/oferte" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors font-heading">
              Vezi toate ofertele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Recipes Section - Mobile optimized */}
      <section className="py-10 sm:py-16 md:py-20 bg-white">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 sm:mb-10 md:mb-12 gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2 font-heading">
                Retete{' '}
                <span className="bg-gradient-to-r from-accent-400 to-yellow-500 bg-clip-text text-transparent">
                  populare
                </span>
              </h2>
              <p className="text-sm sm:text-base text-foreground/60 font-body">
                Gateste delicios cu ingrediente la preturi mici
              </p>
            </div>
            <Link
              href="/retete"
              className="hidden sm:inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-primary-700 transition-all duration-300 hover:scale-105 font-heading"
            >
              Vezi toate retetele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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

          <div className="mt-6 sm:mt-8 text-center sm:hidden">
            <Link href="/retete" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors font-heading">
              Vezi toate retetele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section - Mobile optimized */}
      <section className="py-12 sm:py-16 md:py-24 bg-white relative overflow-hidden">
        {/* Background decoration - hidden on mobile */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-50 to-transparent hidden sm:block" />

        <div className="container-custom relative z-10">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-100 text-primary-700 text-xs sm:text-sm font-semibold rounded-full mb-3 sm:mb-4 font-heading">
              Simplu si eficient
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-4 font-heading">
              Cum{' '}
              <span className="bg-gradient-to-r from-primary-500 to-emerald-500 bg-clip-text text-transparent">
                functioneaza
              </span>
              ?
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-foreground/60 max-w-2xl mx-auto font-body px-4 sm:px-0">
              Platforma noastra te ajuta sa economisesti bani si timp in bucatarie
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-12">
            {/* Step 1 */}
            <div className="group text-center p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-50 to-emerald-50 hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-2">
              <div className="w-14 sm:w-16 md:w-20 h-14 sm:h-16 md:h-20 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 sm:w-8 md:w-10 h-7 sm:h-8 md:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-xs sm:text-sm font-bold text-primary-600 mb-1.5 sm:mb-2 font-heading">PASUL 1</div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 font-heading">
                Colectam ofertele
              </h3>
              <p className="text-sm sm:text-base text-foreground/60 leading-relaxed font-body">
                Scanam automat cataloagele din toate magazinele mari pentru a gasi cele mai bune preturi.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group text-center p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-accent-50 to-yellow-50 hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-2">
              <div className="w-14 sm:w-16 md:w-20 h-14 sm:h-16 md:h-20 bg-gradient-to-br from-accent-400 to-yellow-400 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 sm:w-8 md:w-10 h-7 sm:h-8 md:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="text-xs sm:text-sm font-bold text-accent-500 mb-1.5 sm:mb-2 font-heading">PASUL 2</div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 font-heading">
                Generam retete
              </h3>
              <p className="text-sm sm:text-base text-foreground/60 leading-relaxed font-body">
                Cream retete bazate pe ingredientele aflate in promotie pentru economii maxime.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group text-center p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-2">
              <div className="w-14 sm:w-16 md:w-20 h-14 sm:h-16 md:h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 sm:w-8 md:w-10 h-7 sm:h-8 md:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs sm:text-sm font-bold text-teal-600 mb-1.5 sm:mb-2 font-heading">PASUL 3</div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 font-heading">
                Economisesti
              </h3>
              <p className="text-sm sm:text-base text-foreground/60 leading-relaxed font-body">
                Gatesti acasa mancaruri delicioase la preturi mult mai mici decat in restaurante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile optimized */}
      <section className="relative py-12 sm:py-16 md:py-24 overflow-hidden">
        {/* Gradient background - Fresh Green Theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900" />

        {/* Animated background elements - smaller on mobile */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-5 sm:top-10 left-5 sm:left-10 w-40 sm:w-72 h-40 sm:h-72 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
          <div className="absolute bottom-5 sm:bottom-10 right-5 sm:right-10 w-40 sm:w-72 h-40 sm:h-72 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 sm:w-96 h-56 sm:h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] sm:bg-[size:40px_40px]" />

        <div className="container-custom relative z-10 text-center px-4 sm:px-6">
          <div className="animate-slide-up">
            <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-semibold rounded-full mb-4 sm:mb-6 border border-white/20 font-heading">
              Incepe acum gratuit
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white font-heading">
              Pregatit sa{' '}
              <span className="bg-gradient-to-r from-primary-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                economisesti
              </span>
              ?
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed font-body">
              Descopera ofertele si retetele zilei si incepe sa gatesti delicios
              fara sa iti faci griji pentru buget.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/oferte"
                className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-500 to-emerald-500 text-white text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-glow hover:scale-105 font-heading"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Exploreaza Ofertele
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link
                href="/retete"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm text-white text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 font-heading"
              >
                Gaseste Retete
              </Link>
            </div>
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
