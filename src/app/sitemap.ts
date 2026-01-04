/**
 * Sitemap Generation
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];

  // Static pages - Core
  const staticPages = [
    { url: '', priority: 1.0, changeFreq: 'daily' as const },
    { url: '/retete', priority: 0.9, changeFreq: 'daily' as const },
    { url: '/cataloage', priority: 0.9, changeFreq: 'daily' as const },
    { url: '/oferte', priority: 0.9, changeFreq: 'daily' as const },
    { url: '/plan', priority: 0.8, changeFreq: 'weekly' as const },
    { url: '/cart', priority: 0.7, changeFreq: 'weekly' as const },
    { url: '/despre', priority: 0.5, changeFreq: 'monthly' as const },
    { url: '/docs', priority: 0.3, changeFreq: 'monthly' as const },
  ];

  staticPages.forEach(page => {
    routes.push({
      url: `${SITE_URL}${page.url}`,
      lastModified: new Date(),
      changeFrequency: page.changeFreq,
      priority: page.priority,
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

    recipes.forEach((recipe) => {
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
        url: `${SITE_URL}/cataloage/${store.toLowerCase().replace(' ', '-')}`,
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
        url: `${SITE_URL}/cataloage/categorie/${category}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return routes;
}
