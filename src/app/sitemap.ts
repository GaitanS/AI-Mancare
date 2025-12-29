/**
 * Sitemap Generation
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://retete-ieftine.ro';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];

  // Static pages
  routes.push({
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  });

  routes.push({
    url: `${SITE_URL}/oferte`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  });

  routes.push({
    url: `${SITE_URL}/retete`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  });

  routes.push({
    url: `${SITE_URL}/despre`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
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
    console.error('Error generating sitemap:', error);
  }

  return routes;
}
