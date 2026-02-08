/**
 * Sitemap Generation
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
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

  // Static pages - Core
  const staticPages = [
    { url: '', priority: 1.0, changeFreq: 'daily' as const },
    { url: '/retete', priority: 0.9, changeFreq: 'daily' as const },
    { url: '/oferte', priority: 0.9, changeFreq: 'daily' as const },
    { url: '/blog', priority: 0.8, changeFreq: 'daily' as const },
    { url: '/plan', priority: 0.8, changeFreq: 'weekly' as const },
    { url: '/despre-noi', priority: 0.6, changeFreq: 'monthly' as const },
    { url: '/contact', priority: 0.5, changeFreq: 'monthly' as const },
    { url: '/termeni', priority: 0.3, changeFreq: 'yearly' as const },
    { url: '/confidentialitate', priority: 0.3, changeFreq: 'yearly' as const },
  ];

  staticPages.forEach(page => {
    routes.push({
      url: `${SITE_URL}${page.url}`,
      lastModified: new Date(),
      changeFrequency: page.changeFreq,
      priority: page.priority,
    });
  });

  // Blog article pages
  blogSlugs.forEach((slug) => {
    routes.push({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  });

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
      take: 1000, // Limit to prevent timeout
    });

    recipes.forEach((recipe: any) => {
      routes.push({
        url: `${SITE_URL}/retete/${recipe.slug}`,
        lastModified: recipe.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });

    // Store offer pages
    const stores = ['Lidl', 'Kaufland', 'Carrefour', 'Mega Image', 'Penny'];

    stores.forEach((store) => {
      routes.push({
        url: `${SITE_URL}/oferte/${store.toLowerCase().replace(' ', '-')}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    });

    // Category pages
    const categories = [
      'lactate',
      'carne',
      'fructe-legume',
      'paine',
      'bauturi',
      'conserve',
    ];

    categories.forEach((category) => {
      routes.push({
        url: `${SITE_URL}/oferte/categorie/${category}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    });
  } catch (error) {
    logger.error('Error generating sitemap', { error }, 'Sitemap');
  }

  return routes;
}
