/**
 * Auto SEO Generator
 * Automatically generates SEO meta tags, descriptions, and Schema.org
 * for dynamically created content (recipes, catalogs, offers)
 * 
 * Based on: content-creator + seo-meta-generator skills
 */

import { siteConfig } from './seo'

// ============================================
// AUTO SEO FOR RECIPES
// ============================================

interface RecipeSEOInput {
    name: string
    description?: string
    ingredients: string[]
    prepTime: number
    cookTime: number
    servings: number
    estimatedCost: number
    difficulty: 'ușor' | 'mediu' | 'dificil'
    category?: string
    tags?: string[]
}

/**
 * Generate complete SEO package for a recipe
 */
export function generateRecipeSEO(recipe: RecipeSEOInput) {
    // Auto-generate optimized title (max 60 chars)
    const title = generateRecipeTitle(recipe)

    // Auto-generate meta description (max 155 chars)
    const description = generateRecipeDescription(recipe)

    // Generate keywords from ingredients and tags
    const keywords = generateRecipeKeywords(recipe)

    // Generate Schema.org
    const schema = generateRecipeSchema(recipe)

    // Generate Open Graph
    const openGraph = {
        title,
        description,
        type: 'article',
        url: `${siteConfig.url}/retete/${slugify(recipe.name)}`,
        images: [{
            url: `${siteConfig.url}/api/og/recipe?name=${encodeURIComponent(recipe.name)}&cost=${recipe.estimatedCost}`,
            width: 1200,
            height: 630,
            alt: recipe.name
        }]
    }

    return {
        title,
        description,
        keywords,
        schema,
        openGraph,
        canonical: `${siteConfig.url}/retete/${slugify(recipe.name)}`
    }
}

function generateRecipeTitle(recipe: RecipeSEOInput): string {
    const costText = recipe.estimatedCost < 15 ? 'Sub 15 lei' :
        recipe.estimatedCost < 25 ? 'Sub 25 lei' :
            `${Math.round(recipe.estimatedCost)} lei`

    const timeText = (recipe.prepTime + recipe.cookTime) <= 30 ? 'Rapidă' : ''

    // Format: "Ciorbă de Legume - Rețetă Rapidă Sub 15 lei | CatalogSmart"
    let title = recipe.name
    if (timeText) title += ` - Rețetă ${timeText}`
    title += ` ${costText}`

    // Truncate if too long
    if (title.length > 50) {
        title = `${recipe.name} - ${costText}`
    }

    return title
}

function generateRecipeDescription(recipe: RecipeSEOInput): string {
    const time = recipe.prepTime + recipe.cookTime
    const mainIngredients = recipe.ingredients.slice(0, 3).join(', ')

    let desc = `${recipe.name} - rețetă ${recipe.difficulty} în ${time} minute. `
    desc += `Cu ${mainIngredients}. `
    desc += `Doar ${recipe.estimatedCost} lei pentru ${recipe.servings} porții. `
    desc += `Gătește economic cu CatalogSmart!`

    // Truncate to 155 chars
    if (desc.length > 155) {
        desc = desc.substring(0, 152) + '...'
    }

    return desc
}

function generateRecipeKeywords(recipe: RecipeSEOInput): string[] {
    const keywords = [
        recipe.name.toLowerCase(),
        'rețetă ' + recipe.name.toLowerCase(),
        'rețetă ieftină',
        'rețetă economică',
        `rețetă ${recipe.difficulty}`,
        `rețetă sub ${Math.ceil(recipe.estimatedCost / 5) * 5} lei`
    ]

    // Add main ingredients as keywords
    recipe.ingredients.slice(0, 5).forEach(ing => {
        keywords.push(`rețetă cu ${ing.toLowerCase()}`)
    })

    // Add tags
    if (recipe.tags) {
        keywords.push(...recipe.tags.map(t => t.toLowerCase()))
    }

    // Add category
    if (recipe.category) {
        keywords.push(recipe.category.toLowerCase())
    }

    return [...new Set(keywords)] // Remove duplicates
}

function generateRecipeSchema(recipe: RecipeSEOInput) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: recipe.name,
        description: recipe.description || generateRecipeDescription(recipe),
        image: `${siteConfig.url}/api/og/recipe?name=${encodeURIComponent(recipe.name)}`,
        prepTime: `PT${recipe.prepTime}M`,
        cookTime: `PT${recipe.cookTime}M`,
        totalTime: `PT${recipe.prepTime + recipe.cookTime}M`,
        recipeYield: `${recipe.servings} porții`,
        recipeCategory: recipe.category || 'Main Course',
        recipeCuisine: 'Romanian',
        recipeIngredient: recipe.ingredients,
        author: {
            '@type': 'Organization',
            name: 'CatalogSmart'
        }
    }
}

// ============================================
// AUTO SEO FOR CATALOGS
// ============================================

interface CatalogSEOInput {
    store: string
    weekStart: Date
    weekEnd: Date
    productCount: number
    topOffers?: string[]
    categories?: string[]
}

/**
 * Generate complete SEO package for a catalog page
 */
export function generateCatalogSEO(catalog: CatalogSEOInput) {
    const title = generateCatalogTitle(catalog)
    const description = generateCatalogDescription(catalog)
    const keywords = generateCatalogKeywords(catalog)
    const schema = generateCatalogSchema(catalog)

    return {
        title,
        description,
        keywords,
        schema,
        openGraph: {
            title,
            description,
            type: 'website',
            url: `${siteConfig.url}/oferte/${slugify(catalog.store)}`
        },
        canonical: `${siteConfig.url}/oferte/${slugify(catalog.store)}`
    }
}

function generateCatalogTitle(catalog: CatalogSEOInput): string {
    const startDate = formatDateRO(catalog.weekStart)
    const endDate = formatDateRO(catalog.weekEnd)

    // "Catalog Kaufland 6-12 Ianuarie 2026 | Oferte și Reduceri"
    return `Catalog ${catalog.store} ${startDate}-${endDate} | Oferte și Reduceri`
}

function generateCatalogDescription(catalog: CatalogSEOInput): string {
    const startDate = formatDateRO(catalog.weekStart)
    const endDate = formatDateRO(catalog.weekEnd)

    let desc = `Vezi cele ${catalog.productCount}+ oferte ${catalog.store} valabile ${startDate}-${endDate}. `

    if (catalog.topOffers && catalog.topOffers.length > 0) {
        desc += `Reduceri la: ${catalog.topOffers.slice(0, 3).join(', ')}. `
    }

    desc += `Compară prețuri și economisește!`

    if (desc.length > 155) {
        desc = desc.substring(0, 152) + '...'
    }

    return desc
}

function generateCatalogKeywords(catalog: CatalogSEOInput): string[] {
    const store = catalog.store.toLowerCase()
    return [
        `catalog ${store}`,
        `oferte ${store}`,
        `reduceri ${store}`,
        `${store} promoții`,
        `catalog ${store} săptămâna aceasta`,
        `${store} oferte azi`,
        'oferte supermarket',
        'reduceri magazine',
        'promoții alimentare'
    ]
}

function generateCatalogSchema(catalog: CatalogSEOInput) {
    return {
        '@context': 'https://schema.org',
        '@type': 'OfferCatalog',
        name: `Catalog ${catalog.store}`,
        description: generateCatalogDescription(catalog),
        provider: {
            '@type': 'Organization',
            name: catalog.store
        },
        itemListElement: catalog.topOffers?.map((offer, i) => ({
            '@type': 'Offer',
            position: i + 1,
            name: offer
        })) || []
    }
}

// ============================================
// AUTO SEO FOR OFFERS/PRODUCTS
// ============================================

interface OfferSEOInput {
    name: string
    store: string
    originalPrice: number
    discountPrice: number
    discountPercent: number
    category: string
    validUntil: Date
}

/**
 * Generate SEO for individual offer pages
 */
export function generateOfferSEO(offer: OfferSEOInput) {
    const title = `${offer.name} - ${offer.discountPercent}% Reducere la ${offer.store}`

    const description = `${offer.name} la doar ${offer.discountPrice} lei (de la ${offer.originalPrice} lei). ` +
        `Economisești ${(offer.originalPrice - offer.discountPrice).toFixed(2)} lei la ${offer.store}. ` +
        `Ofertă valabilă până la ${formatDateRO(offer.validUntil)}.`

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Offer',
        name: offer.name,
        price: offer.discountPrice,
        priceCurrency: 'RON',
        seller: {
            '@type': 'Organization',
            name: offer.store
        },
        priceValidUntil: offer.validUntil.toISOString().split('T')[0],
        availability: 'https://schema.org/InStock'
    }

    return {
        title,
        description,
        schema,
        keywords: [
            offer.name.toLowerCase(),
            `${offer.name.toLowerCase()} ofertă`,
            `${offer.name.toLowerCase()} reducere`,
            `${offer.store.toLowerCase()} oferte`,
            offer.category.toLowerCase()
        ]
    }
}

// ============================================
// AUTO SEO FOR BLOG POSTS
// ============================================

interface BlogSEOInput {
    title: string
    content: string
    category: string
    tags: string[]
    publishDate: Date
    author?: string
}

/**
 * Generate SEO for blog posts
 */
export function generateBlogSEO(post: BlogSEOInput) {
    // Extract first 155 chars for description
    const cleanContent = post.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
    const description = cleanContent.length > 155
        ? cleanContent.substring(0, 152) + '...'
        : cleanContent

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description,
        author: {
            '@type': 'Person',
            name: post.author || 'CatalogSmart Team'
        },
        publisher: {
            '@type': 'Organization',
            name: 'CatalogSmart',
            logo: {
                '@type': 'ImageObject',
                url: `${siteConfig.url}/logo.png`
            }
        },
        datePublished: post.publishDate.toISOString(),
        dateModified: new Date().toISOString(),
        mainEntityOfPage: {
            '@type': 'WebPage'
        }
    }

    return {
        title: `${post.title} | CatalogSmart Blog`,
        description,
        schema,
        keywords: [post.category, ...post.tags],
        openGraph: {
            title: post.title,
            description,
            type: 'article',
            publishedTime: post.publishDate.toISOString()
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

function formatDateRO(date: Date): string {
    const months = [
        'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
        'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ]
    return `${date.getDate()} ${months[date.getMonth()]}`
}

// ============================================
// BULK SEO GENERATION
// ============================================

/**
 * Generate sitemap entries for dynamic content
 */
export function generateDynamicSitemapEntries(content: {
    recipes: { slug: string; updatedAt: Date }[]
    catalogs: { store: string; weekStart: Date }[]
    blogPosts: { slug: string; publishDate: Date }[]
}) {
    const entries: any[] = []

    // Recipes
    content.recipes.forEach(r => {
        entries.push({
            url: `${siteConfig.url}/retete/${r.slug}`,
            lastModified: r.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7
        })
    })

    // Catalogs (high priority, change weekly)
    content.catalogs.forEach(c => {
        entries.push({
            url: `${siteConfig.url}/oferte/${slugify(c.store)}`,
            lastModified: c.weekStart,
            changeFrequency: 'weekly' as const,
            priority: 0.9
        })
    })

    // Blog posts
    content.blogPosts.forEach(p => {
        entries.push({
            url: `${siteConfig.url}/blog/${p.slug}`,
            lastModified: p.publishDate,
            changeFrequency: 'monthly' as const,
            priority: 0.6
        })
    })

    return entries
}

export { slugify, formatDateRO }
