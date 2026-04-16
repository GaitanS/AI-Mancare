/**
 * Robots.txt Generation
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/storage/',
          '/cart',
          '/plan',
          '/profile',
          '/search',
          '/dashboard',
          '/test-error',
          '/docs',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
