/**
 * Sitemap Generation
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import { MetadataRoute } from 'next';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro';

// Static blog article slugs
const blogSlugs = [
  'cum-sa-economisesti-la-cumparaturi-ghid-complet-2026',
  'top-5-supermarketuri-romania-comparatie-preturi',
  'retete-studenti-mese-sub-20-lei',
  'cand-apar-cele-mai-bune-oferte-lidl-kaufland-penny',
  'cum-sa-citesti-corect-cataloagele-de-reduceri',
  'lista-cumparaturi-perfecta-familie-4-persoane',
  'catalog-kaufland-aceasta-saptamana-oferte-2026',
  'catalog-lidl-oferte-saptamanale-romania-2026',
  'oferte-penny-promotii-saptamanale-2026',
  'cataloage-supermarketuri-romania-toate-ofertele',
  'preturi-alimente-romania-2026-evolutie-inflatie',
  'retete-economice-pentru-intreaga-familie-2026',
  'meal-prep-saptamanal-ghid-incepatori-2026',
  'comparatie-preturi-lidl-kaufland-penny-carrefour-2026',
  'cumparaturi-online-supermarket-romania-livrare-acasa',
  'reduceri-de-weekend-supermarketuri-cum-sa-prinzi-ofertele',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];
  const now = new Date();

  // ============================================
  // STATIC PAGES
  // ============================================
  const staticPages: Array<{
    url: string;
    priority: number;
    changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  }> = [
    // Core pages - high priority, frequent updates
    { url: '', priority: 1.0, changeFreq: 'daily' },
    { url: '/oferte', priority: 0.9, changeFreq: 'daily' },
    { url: '/retete', priority: 0.9, changeFreq: 'daily' },
    { url: '/cataloage', priority: 0.8, changeFreq: 'daily' },
    { url: '/cataloage-digitale', priority: 0.8, changeFreq: 'daily' },
    { url: '/blog', priority: 0.8, changeFreq: 'daily' },
    { url: '/plan', priority: 0.7, changeFreq: 'weekly' },
    { url: '/cart', priority: 0.5, changeFreq: 'weekly' },
    { url: '/search', priority: 0.5, changeFreq: 'weekly' },

    // Informational pages - lower priority
    { url: '/despre-noi', priority: 0.5, changeFreq: 'monthly' },
    { url: '/contact', priority: 0.5, changeFreq: 'monthly' },
    { url: '/faq', priority: 0.5, changeFreq: 'monthly' },

    // Legal pages - lowest priority
    { url: '/termeni', priority: 0.3, changeFreq: 'yearly' },
    { url: '/confidentialitate', priority: 0.3, changeFreq: 'yearly' },
    { url: '/cookies', priority: 0.3, changeFreq: 'yearly' },
  ];

  staticPages.forEach(page => {
    routes.push({
      url: `${SITE_URL}${page.url}`,
      lastModified: now,
      changeFrequency: page.changeFreq,
      priority: page.priority,
    });
  });

  // ============================================
  // BLOG ARTICLE PAGES (static slugs)
  // ============================================
  blogSlugs.forEach((slug) => {
    routes.push({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  });

  // ============================================
  // DYNAMIC PAGES (from database)
  // ============================================
  try {
    // Dynamic recipe pages
    const recipes = await prisma.recipe.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 2000,
    });

    recipes.forEach((recipe) => {
      routes.push({
        url: `${SITE_URL}/retete/${recipe.slug}`,
        lastModified: recipe.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });

    // Store offer pages (dynamic from active products)
    const storeGroups = await prisma.product.groupBy({
      by: ['store'],
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      _count: { store: true },
    });

    storeGroups.forEach((group) => {
      const slug = group.store.toLowerCase().replace(/\s+/g, '-');
      routes.push({
        url: `${SITE_URL}/oferte/${slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    });
  } catch (error) {
    logger.error('Error generating sitemap dynamic routes', { error }, 'Sitemap');

    // Fallback: add known store pages even if DB fails
    const fallbackStores = ['kaufland', 'lidl', 'penny', 'carrefour', 'mega-image', 'profi'];
    fallbackStores.forEach((store) => {
      routes.push({
        url: `${SITE_URL}/oferte/${store}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    });
  }

  return routes;
}
