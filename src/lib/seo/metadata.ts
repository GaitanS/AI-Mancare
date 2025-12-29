/**
 * SEO Metadata Utilities
 * Generare meta tags optimizate pentru SEO
 */

import { Metadata } from 'next';

const SITE_CONFIG = {
  name: 'Rețete Ieftine',
  description: 'Platformă smart pentru oferte și rețete economice. Descoperă cele mai bune oferte de la supermarketuri și rețete delicioase cu buget redus.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://retete-ieftine.ro',
  locale: 'ro_RO',
  type: 'website',
};

/**
 * Generate base metadata
 */
export function generateBaseMetadata(params?: {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const title = params?.title
    ? `${params.title} | ${SITE_CONFIG.name}`
    : SITE_CONFIG.name;

  const description = params?.description || SITE_CONFIG.description;

  const keywords = params?.keywords || [
    'rețete ieftine',
    'oferte supermarket',
    'mâncarea economică',
    'liste de cumpărături',
    'rețete buget redus',
    'oferte Lidl',
    'oferte Kaufland',
    'oferte Carrefour',
  ];

  const image = params?.image || `${SITE_CONFIG.url}/og-image.jpg`;

  return {
    title,
    description,
    keywords: keywords.join(', '),

    metadataBase: new URL(SITE_CONFIG.url),

    robots: params?.noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },

    openGraph: {
      type: 'website',
      locale: SITE_CONFIG.locale,
      url: SITE_CONFIG.url,
      title,
      description,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },

    alternates: {
      canonical: SITE_CONFIG.url,
    },
  };
}

/**
 * Generate recipe metadata
 */
export function generateRecipeMetadata(recipe: {
  title: string;
  description: string;
  slug: string;
  estimatedCost?: number;
  totalTime?: number;
  servings?: number;
  difficulty?: string;
}): Metadata {
  const url = `${SITE_CONFIG.url}/retete/${recipe.slug}`;

  const title = `${recipe.title} - Rețetă Ieftină`;
  const description =
    recipe.description ||
    `Descoperă cum să prepari ${recipe.title} cu buget redus. Rețetă simplă și economică.`;

  const keywords = [
    recipe.title.toLowerCase(),
    'rețetă ieftină',
    'rețetă economică',
    'rețetă buget redus',
    `rețetă ${recipe.difficulty || 'ușoară'}`,
  ];

  return {
    ...generateBaseMetadata({
      title,
      description,
      keywords,
    }),

    alternates: {
      canonical: url,
    },

    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
    },
  };
}

/**
 * Generate product/offer metadata
 */
export function generateOfferMetadata(params: {
  store?: string;
  category?: string;
  productName?: string;
}): Metadata {
  let title = 'Oferte Supermarket';
  let description = 'Descoperă cele mai bune oferte de la supermarketuri.';

  if (params.productName) {
    title = `${params.productName} - Oferte`;
    description = `Găsește cele mai bune prețuri pentru ${params.productName}`;
  } else if (params.store && params.category) {
    title = `Oferte ${params.category} la ${params.store}`;
    description = `Descoperă ofertele la ${params.category} de la ${params.store}`;
  } else if (params.store) {
    title = `Oferte ${params.store}`;
    description = `Toate ofertele valabile de la ${params.store}`;
  } else if (params.category) {
    title = `Oferte ${params.category}`;
    description = `Compară prețurile la ${params.category} de la toate supermarketurile`;
  }

  const keywords = [
    'oferte supermarket',
    params.store?.toLowerCase(),
    params.category?.toLowerCase(),
    'prețuri mici',
    'reduceri',
    'discount',
  ].filter(Boolean) as string[];

  return generateBaseMetadata({
    title,
    description,
    keywords,
  });
}

/**
 * Generate JSON-LD structured data pentru recipe
 */
export function generateRecipeStructuredData(recipe: {
  title: string;
  description: string;
  slug: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  difficulty?: string;
  estimatedCost?: number;
  instructions?: any[];
  ingredientIds?: any[];
  totalCalories?: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    url: `${SITE_CONFIG.url}/retete/${recipe.slug}`,

    recipeYield: recipe.servings?.toString() || '4',

    prepTime: recipe.prepTime ? `PT${recipe.prepTime}M` : undefined,
    cookTime: recipe.cookTime ? `PT${recipe.cookTime}M` : undefined,
    totalTime: recipe.totalTime ? `PT${recipe.totalTime}M` : undefined,

    recipeCategory: 'Mâncare Ieftină',
    recipeCuisine: 'Românească',

    keywords: [
      'rețetă ieftină',
      'rețetă economică',
      recipe.difficulty || 'ușoară',
    ].join(', '),

    nutrition: recipe.totalCalories
      ? {
          '@type': 'NutritionInformation',
          calories: `${recipe.totalCalories} calories`,
        }
      : undefined,

    recipeInstructions: recipe.instructions?.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text: step.text || step,
    })),

    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: '0',
    },

    author: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },

    datePublished: recipe.createdAt?.toISOString(),
    dateModified: recipe.updatedAt?.toISOString(),
  };
}

/**
 * Generate JSON-LD structured data pentru product
 */
export function generateProductStructuredData(product: {
  name: string;
  price: number;
  originalPrice?: number;
  store: string;
  category: string;
  validUntil: Date;
  brand?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: product.brand
      ? {
          '@type': 'Brand',
          name: product.brand,
        }
      : undefined,
    category: product.category,

    offers: {
      '@type': 'Offer',
      price: product.price.toString(),
      priceCurrency: 'RON',
      priceValidUntil: product.validUntil.toISOString().split('T')[0],
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: product.store,
      },
    },
  };
}

/**
 * Generate JSON-LD pentru website
 */
export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(items: {
  name: string;
  url: string;
}[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_CONFIG.url}${item.url}`,
    })),
  };
}
