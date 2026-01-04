/**
 * SEO Configuration and Meta Tags Generator
 * Based on: seo-meta-generator skill
 */

// Site-wide SEO configuration
export const siteConfig = {
    name: 'CatalogSmart',
    description: 'Descoperă rețete economice bazate pe reducerile din Kaufland, Lidl, Carrefour. Economisești 30% la cumpărături. Gratis!',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro',
    ogImage: '/images/og-default.jpg',
    locale: 'ro_RO',
    twitter: '@catalogsmart',

    // Brand keywords
    keywords: [
        'rețete ieftine',
        'mâncare ieftină',
        'rețete economice',
        'meniu săptămânal',
        'gătit economic',
        'oferte supermarket',
        'rețete simple',
        'meal planning',
        'bucătărie românească'
    ]
}

// Page-specific meta configurations
export const pagesMeta = {
    home: {
        title: 'Rețete Ieftine - Gătește gustos cu buget mic | 2026',
        description: 'Descoperă rețete economice bazate pe reducerile din Kaufland, Lidl, Carrefour. Economisești 30% la cumpărături. Gratis!',
        keywords: ['rețete ieftine', 'mâncare ieftină', 'gătit economic', 'economii cumpărături']
    },

    recipes: {
        title: 'Rețete Economice Rapide | Sub 20 lei porția',
        description: '500+ rețete verificate sub 20 lei. Filtrează după timp, buget și ingrediente. Folosește ce-i în frigider!',
        keywords: ['rețete economice', 'rețete rapide', 'rețete simple', 'rețete sub 20 lei']
    },

    plan: {
        title: 'Planificare Meniu Săptămânal | Economisești 200 lei/lună',
        description: 'AI-ul nostru îți face meniul bazat pe ofertele săptămânii. Coș de cumpărături automat. Gratis!',
        keywords: ['meniu săptămânal', 'planificare mese', 'meal planning', 'plan alimentar']
    },

    offers: {
        title: 'Oferte Supermarket Azi | Kaufland, Lidl, Carrefour',
        description: 'Compară prețurile din toate magazinele. Vezi ce-i în reducere azi și economisește la cumpărături.',
        keywords: ['oferte kaufland', 'oferte lidl', 'reduceri carrefour', 'prețuri magazine']
    },

    cart: {
        title: 'Coș Inteligent | Găsește cele mai ieftine produse',
        description: 'Compară prețurile între magazine. Află unde cumperi cel mai ieftin întreaga listă de cumpărături.',
        keywords: ['comparare prețuri', 'coș cumpărături', 'economii magazine']
    },

    profile: {
        title: 'Profilul Meu | Preferințe și Obiective',
        description: 'Personalizează-ți experiența de gătit. Setează bugetul, preferințele alimentare și magazinele favorite.',
        keywords: ['profil utilizator', 'preferințe alimentare', 'buget mâncare']
    },

    dashboard: {
        title: 'Dashboard Performanță | Admin',
        description: 'Monitorizare în timp real a performanței aplicației.',
        noIndex: true
    },

    docs: {
        title: 'API Documentation | Developers',
        description: 'Documentație completă API pentru dezvoltatori.',
        noIndex: true
    }
}

/**
 * Generate meta tags for a page
 */
export function generateMeta(page: keyof typeof pagesMeta, overrides?: Partial<typeof pagesMeta.home>) {
    const pageMeta = { ...pagesMeta[page], ...overrides }

    return {
        title: pageMeta.title,
        description: pageMeta.description,
        keywords: pageMeta.keywords?.join(', '),
        openGraph: {
            title: pageMeta.title,
            description: pageMeta.description,
            url: siteConfig.url,
            siteName: siteConfig.name,
            images: [
                {
                    url: siteConfig.ogImage,
                    width: 1200,
                    height: 630,
                    alt: siteConfig.name
                }
            ],
            locale: siteConfig.locale,
            type: 'website'
        },
        twitter: {
            card: 'summary_large_image',
            title: pageMeta.title,
            description: pageMeta.description,
            creator: siteConfig.twitter
        },
        robots: (pageMeta as any).noIndex ? 'noindex, nofollow' : 'index, follow',
        alternates: {
            canonical: siteConfig.url
        }
    }
}

/**
 * Generate Recipe Schema.org structured data
 */
export function generateRecipeSchema(recipe: {
    name: string
    description: string
    image?: string
    prepTime: number // minutes
    cookTime: number // minutes
    servings: number
    ingredients: string[]
    instructions: string[]
    estimatedCost: number // RON
    difficulty: string
    category?: string
    cuisine?: string
    nutrition?: {
        calories?: number
        protein?: number
        carbs?: number
        fat?: number
    }
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: recipe.name,
        description: recipe.description,
        image: recipe.image || `${siteConfig.url}/images/recipe-default.jpg`,

        prepTime: `PT${recipe.prepTime}M`,
        cookTime: `PT${recipe.cookTime}M`,
        totalTime: `PT${recipe.prepTime + recipe.cookTime}M`,

        recipeYield: `${recipe.servings} porții`,
        recipeCategory: recipe.category || 'Main Course',
        recipeCuisine: recipe.cuisine || 'Romanian',

        recipeIngredient: recipe.ingredients,
        recipeInstructions: recipe.instructions.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            text: step
        })),

        // Cost estimation (custom extension)
        estimatedCost: {
            '@type': 'MonetaryAmount',
            currency: 'RON',
            value: recipe.estimatedCost
        },

        // Difficulty
        difficulty: recipe.difficulty,

        // Nutrition (if available)
        ...(recipe.nutrition && {
            nutrition: {
                '@type': 'NutritionInformation',
                calories: recipe.nutrition.calories ? `${recipe.nutrition.calories} calories` : undefined,
                proteinContent: recipe.nutrition.protein ? `${recipe.nutrition.protein}g` : undefined,
                carbohydrateContent: recipe.nutrition.carbs ? `${recipe.nutrition.carbs}g` : undefined,
                fatContent: recipe.nutrition.fat ? `${recipe.nutrition.fat}g` : undefined
            }
        }),

        // Aggregated rating placeholder
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.5',
            reviewCount: '100'
        },

        // Author
        author: {
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteConfig.url
        },

        // Publisher
        publisher: {
            '@type': 'Organization',
            name: siteConfig.name,
            logo: {
                '@type': 'ImageObject',
                url: `${siteConfig.url}/logo.png`
            }
        },

        datePublished: new Date().toISOString().split('T')[0],
        dateModified: new Date().toISOString().split('T')[0]
    }
}

/**
 * Generate Organization Schema.org structured data
 */
export function generateOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/logo.png`,
        description: siteConfig.description,
        sameAs: [
            'https://facebook.com/catalogsmart',
            'https://instagram.com/catalogsmart',
            'https://tiktok.com/@catalogsmart'
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: 'contact@catalogsmart.ro'
        }
    }
}

/**
 * Generate WebSite Schema.org with search action
 */
export function generateWebsiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteConfig.url}/retete?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        }
    }
}

/**
 * Generate BreadcrumbList Schema.org
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${siteConfig.url}${item.url}`
        }))
    }
}

/**
 * Generate FAQ Schema.org
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    }
}
