import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import prisma from '@/lib/db';
import { cache, CacheKeys } from '@/lib/cache';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import RecipeCard, { RecipeCardSkeleton } from '@/components/RecipeCard';
import type { Product, Recipe } from '@/types';
import type { Metadata } from 'next';
import heroVegetables from '../../public/hero-vegetables.png';
import heroSpices from '../../public/hero-spices.png';
import heroPlate from '../../public/hero-plate.png';

export const metadata: Metadata = {
  title: 'CatalogSmart - Oferte si Retete Economice pentru Toata Familia',
  description:
    'Descopera cele mai bune oferte din supermarketuri si retete delicioase la preturi mici. Economiseste bani gatind acasa cu ingrediente la reducere!',
  alternates: {
    canonical: '/',
  },
};

// Fetch featured offers (best discounts)
async function getFeaturedOffers(): Promise<Product[]> {
  return cache.getOrSet(
    CacheKeys.offers({ type: 'featured_home' }),
    async () => {
      const now = new Date();
      try {
        const products = await prisma.product.findMany({
          where: {
            validFrom: { lte: now },
            validUntil: { gte: now },
            discountPercentage: { gte: 20 },
          },
          orderBy: { discountPercentage: 'desc' },
          take: 8,
        });

        return products.map((p: any) => ({
          ...p,
          price: Number(p.price),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
          validFrom: p.validFrom.toISOString(),
          validUntil: p.validUntil.toISOString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
          allergens: p.allergens as string[] | null,
        }));
      } catch (error) {
        console.warn('Failed to fetch featured offers:', error);
        return [];
      }
    },
    3600
  );
}

// Fetch featured recipes
async function getFeaturedRecipes(): Promise<Recipe[]> {
  return cache.getOrSet(
    CacheKeys.recipesPopular(),
    async () => {
      try {
        const recipes = await prisma.recipe.findMany({
          orderBy: [{ createdAt: 'desc' }],
          take: 6,
        });

        return recipes.map((r: any) => ({
          ...r,
          estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
          instructions: r.instructions as Recipe['instructions'],
          tips: r.tips as string[] | null,
          tags: r.tags as string[] | null,
          nutritionPerServing: r.nutritionPerServing as Recipe['nutritionPerServing'],
        }));
      } catch (error) {
        console.warn('Failed to fetch featured recipes:', error);
        return [];
      }
    },
    7200
  );
}

// Get statistics
async function getStats() {
  return cache.getOrSet(
    'stats:home',
    async () => {
      const now = new Date();
      try {
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
      } catch (error) {
        console.warn('Failed to fetch stats:', error);
        return {
          products: 0,
          recipes: 0,
          stores: 0
        };
      }
    },
    3600
  );
}

// Store with brand colors
const stores = [
  { name: 'Kaufland', slug: 'kaufland', gradient: 'from-[#e10915] to-[#c00812]' },
  { name: 'Lidl', slug: 'lidl', gradient: 'from-[#0050aa] to-[#003d82]' },
  { name: 'Penny', slug: 'penny', gradient: 'from-[#cd1719] to-[#a81315]' },
  { name: 'Carrefour', slug: 'carrefour', gradient: 'from-[#004e9e] to-[#003a76]' },
  { name: 'Mega Image', slug: 'mega-image', gradient: 'from-[#e31837] to-[#b8142d]' },
  { name: 'Auchan', slug: 'auchan', gradient: 'from-[#e2001a] to-[#b80016]' },
];

export default async function HomePage() {
  const [featuredOffers, featuredRecipes, stats] = await Promise.all([
    getFeaturedOffers(),
    getFeaturedRecipes(),
    getStats(),
  ]);

  return (
    <>
      <section className="relative min-h-[85vh] md:min-h-[550px] flex items-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black text-white">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle glow effects */}
          <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[120%] h-[80%] bg-primary-900/10 rounded-[100%] blur-[120px] opacity-40 mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent z-10" />

          {/* Floating Assets */}
          <div className="absolute -right-10 top-[15%] w-[250px] h-[250px] lg:w-[300px] lg:h-[300px] animate-float hidden lg:block" style={{ maskImage: 'radial-gradient(circle, black 70%, transparent 95%)', WebkitMaskImage: 'radial-gradient(circle, black 70%, transparent 95%)' }}>
            <Image
              src={heroVegetables}
              alt="Fresh vegetables floating"
              placeholder="blur"
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(max-width: 1024px) 250px, 300px"
              priority
              loading="eager"
            />
          </div>
          <div className="absolute -left-10 bottom-[15%] w-[280px] h-[280px] lg:w-[340px] lg:h-[340px] animate-float hidden lg:block" style={{ animationDelay: '2s', animationDuration: '7s', maskImage: 'radial-gradient(circle, black 70%, transparent 95%)', WebkitMaskImage: 'radial-gradient(circle, black 70%, transparent 95%)' }}>
            <Image
              src={heroSpices}
              alt="Spices and ingredients"
              placeholder="blur"
              fill
              className="object-contain rotate-12 drop-shadow-2xl"
              sizes="(max-width: 1024px) 280px, 340px"
              priority
              loading="eager"
            />
          </div>
        </div>

        {/* Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

        <div className="container-custom relative z-20 pt-10 pb-10">
          <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-6 animate-fade-in-up shadow-glow-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500"></span>
              </span>
              <span className="text-sm text-neutral-200 font-medium tracking-wide">Cataloage actualizate săptămânal</span>
            </div>

            {/* Headline - CRITICAL PENTRU SEO */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight animate-fade-in-up drop-shadow-2xl" style={{ animationDelay: '100ms' }}>
              <span className="text-white">Toate{' '}</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-300 relative">
                cataloagele
                <span className="absolute -bottom-2 left-0 w-full h-[6px] bg-primary-500/30 -rotate-2 rounded-full blur-sm"></span>
              </span>
              <br />
              <span className="text-neutral-200 font-bold text-3xl sm:text-4xl md:text-6xl block mt-2">dar inteligente</span>
            </h1>

            {/* Subheadline - SEO + Features */}
            <p className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed px-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              Vezi toate ofertele din cataloagele de la <span className="text-white font-semibold">Lidl, Kaufland, Penny etc</span>.
              AI-ul extrage ofertele și generează <span className="text-white font-semibold">rețete automate</span> cu produsele la reducere.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-fade-in-up relative z-20" style={{ animationDelay: '300ms' }}>
              <Link
                href="/cataloage"
                className="group relative px-8 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-lg shadow-[0_0_40px_-10px_rgba(225,29,72,0.4)] hover:shadow-[0_0_60px_-15px_rgba(225,29,72,0.6)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700" />
                </div>
                <span className="relative flex items-center justify-center gap-2">
                  Vezi Ofertele
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link
                href="/retete"
                className="px-8 py-3.5 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
              >
                Vezi Rețetele
              </Link>
            </div>

            {/* Compact Layout: Plate and Stats Side-by-Side on Desktop */}
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 animate-fade-in-up relative z-20" style={{ animationDelay: '400ms' }}>

              {/* Central Hero Plate */}
              <div className="relative aspect-square w-[240px] sm:w-[300px]">
                <div className="absolute inset-0 bg-gradient-to-t from-primary-600/30 to-transparent blur-[60px] rounded-full opacity-70 animate-pulse-soft" />
                <Image
                  src={heroPlate}
                  alt="Mâncare delicioasă"
                  placeholder="blur"
                  fill
                  className="object-contain drop-shadow-2xl z-10"
                  priority
                  sizes="(max-width: 640px) 240px, 300px"
                />
              </div>

              {/* Stats - SCHIMBAT pentru CatalogSmart */}
              <div className="grid grid-cols-3 gap-6 md:gap-10">
                <div className="text-center group">
                  <p className="font-display text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                    {stats.products.toLocaleString('ro-RO')}+
                  </p>
                  <p className="text-neutral-400 text-xs font-bold mt-1 uppercase tracking-wider group-hover:text-primary-300 transition-colors">Oferte</p>
                </div>
                <div className="text-center group">
                  <p className="font-display text-2xl sm:text-4xl font-bold bg-gradient-to-r from-accent-400 to-accent-200 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                    {stats.stores}
                  </p>
                  <p className="text-neutral-400 text-xs font-bold mt-1 uppercase tracking-wider group-hover:text-accent-300 transition-colors">Cataloage</p>
                </div>
                <div className="text-center group">
                  <p className="font-display text-2xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                    7 zile
                  </p>
                  <p className="text-neutral-400 text-xs font-bold mt-1 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Update</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-neutral-50 to-transparent" />
      </section>

      {/* Stores Section */}
      <section className="py-10 sm:py-14 bg-neutral-50">
        <div className="container-custom">
          <p className="text-center text-xs text-neutral-500 mb-6 font-semibold uppercase tracking-widest">Magazine</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {stores.map((store, index) => (
              <Link
                key={store.slug}
                href={`/cataloage/${store.slug}`}
                className="group relative px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-neutral-700 text-xs sm:text-sm font-semibold rounded-xl hover:text-white transition-all duration-300 hover:scale-105 shadow-soft hover:shadow-lg border border-neutral-200/80 overflow-hidden stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className={`absolute inset-0 bg-gradient-to-r ${store.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <span className="relative z-10">{store.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Offers Section */}
      <section id="catalog-section" className="py-12 sm:py-20 bg-white">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-primary-50 text-primary-600 text-xs font-semibold rounded-full mb-3 border border-primary-100">
                Reduceri de peste 20%
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Cele mai bune{' '}
                <span className="text-gradient-warm">oferte</span>
              </h2>
            </div>
            <Link
              href="/cataloage"
              className="hidden sm:inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 shadow-warm hover:shadow-lg transition-all duration-300 group"
            >
              Vezi toate ofertele
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <Suspense fallback={<ProductsGridSkeleton />}>
            {featuredOffers.length > 0 ? (
              <div className="grid-products">
                {featuredOffers.map((product, index) => (
                  <div key={product.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                    <ProductCard product={product} />
                  </div>
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
            <Link href="/cataloage" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors border border-primary-100">
              Vezi toate ofertele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Recipes Section */}
      <section id="ai-recipes" className="py-12 sm:py-20 bg-kitchen-cream">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-accent-50 text-accent-700 text-xs font-semibold rounded-full mb-3 border border-accent-100">
                Cele mai populare
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Retete{' '}
                <span className="text-gradient-golden">populare</span>
              </h2>
            </div>
            <Link
              href="/retete"
              className="hidden sm:inline-flex items-center gap-2 px-6 py-3 bg-accent-500 text-white text-sm font-semibold rounded-xl hover:bg-accent-600 shadow-glow-accent hover:shadow-lg transition-all duration-300 group"
            >
              Vezi toate retetele
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <Suspense fallback={<RecipesGridSkeleton />}>
            {featuredRecipes.length > 0 ? (
              <div className="grid-recipes">
                {featuredRecipes.map((recipe, index) => (
                  <div key={recipe.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                    <RecipeCard recipe={recipe} />
                  </div>
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
            <Link href="/retete" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-accent-700 bg-accent-50 rounded-xl hover:bg-accent-100 transition-colors border border-accent-100">
              Vezi toate retetele
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-50/30 to-transparent hidden lg:block" />
        <div className="absolute inset-0 pattern-dots opacity-30" />

        <div className="container-custom relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-4 py-2 bg-secondary-50 text-secondary-700 text-xs font-bold rounded-full mb-4 uppercase tracking-wider border border-secondary-100">
              Simplu si eficient
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Cum{' '}
              <span className="text-gradient-fresh">functioneaza</span>?
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto text-lg">
              Platforma noastra te ajuta sa economisesti bani si timp in bucatarie
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {/* Step 1 */}
            <div className="group text-center p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-primary-50 to-kitchen-cream border border-primary-100 hover:shadow-warm hover:border-primary-200 transition-all duration-500 hover:-translate-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-warm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-xs font-bold text-primary-600 mb-2 tracking-wider">PASUL 1</div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                Colectam ofertele
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Scanam automat cataloagele din toate magazinele mari pentru a gasi cele mai bune preturi.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group text-center p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-accent-50 to-kitchen-butter border border-accent-100 hover:shadow-glow-accent hover:border-accent-200 transition-all duration-500 hover:-translate-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-accent group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="text-xs font-bold text-accent-600 mb-2 tracking-wider">PASUL 2</div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                Generam retete
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Cream retete bazate pe ingredientele aflate in promotie pentru economii maxime.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group text-center p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-secondary-50 to-kitchen-cream border border-secondary-100 hover:shadow-glow-success hover:border-secondary-200 transition-all duration-500 hover:-translate-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-success group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs font-bold text-secondary-600 mb-2 tracking-wider">PASUL 3</div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                Economisesti
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Gatesti acasa mancaruri delicioase la preturi mult mai mici decat in restaurante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Warm Kitchen */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700" />

        {/* Soft overlay patterns */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-64 sm:w-96 h-64 sm:h-96 bg-accent-400 rounded-full filter blur-[100px] opacity-20 animate-float" />
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-white rounded-full filter blur-[100px] opacity-10 animate-float" style={{ animationDelay: '3s' }} />
        </div>

        {/* Kitchen pattern */}
        <div className="absolute inset-0 pattern-kitchen opacity-10" />

        <div className="container-custom relative z-10 text-center px-4">
          <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full mb-6 border border-white/20 uppercase tracking-wider">
            Incepe acum gratuit
          </span>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
            Pregatit sa{' '}
            <span className="text-accent-300">economisesti</span>?
          </h2>

          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            Descopera ofertele si retetele zilei si incepe sa gatesti delicios
            fara sa iti faci griji pentru buget.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cataloage"
              className="group px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-accent-50 hover:text-primary-700 shadow-elevated hover:shadow-xl transition-all duration-300"
            >
              <span className="flex items-center justify-center gap-2">
                Exploreaza Cataloagele
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <Link
              href="/retete"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 hover:border-white/40 transition-all duration-300"
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
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary-100">
        <svg
          className="w-10 h-10 text-primary-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="font-display text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}
