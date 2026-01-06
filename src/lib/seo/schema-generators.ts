/**
 * Dynamic JSON-LD Schema Generators
 * Auto-generates structured data for SEO from AI-populated content
 */

// ==========================================
// RECIPE SCHEMA GENERATOR
// ==========================================
export interface RecipeSchemaInput {
    name: string;
    description: string;
    imageUrl?: string | null;
    prepTime?: number | null;      // in minutes
    cookTime?: number | null;      // in minutes
    totalTime?: number | null;     // in minutes
    servings?: number;
    difficulty?: string;
    ingredients: string[];         // list of ingredient names
    instructions: string[];        // list of step strings
    calories?: number | null;
    author?: string;
    datePublished?: string;
    rating?: { value: number; count: number } | null;
}

export function generateRecipeSchema(recipe: RecipeSchemaInput): object {
    const formatDuration = (minutes: number | null | undefined): string | undefined => {
        if (!minutes) return undefined;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`;
        if (hours > 0) return `PT${hours}H`;
        return `PT${mins}M`;
    };

    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: recipe.name,
        description: recipe.description,
        author: {
            '@type': 'Organization',
            name: recipe.author || 'CatalogSmart',
        },
        datePublished: recipe.datePublished || new Date().toISOString().split('T')[0],
    };

    // Image (required for rich results)
    if (recipe.imageUrl) {
        schema.image = [recipe.imageUrl];
    }

    // Times
    if (recipe.prepTime) schema.prepTime = formatDuration(recipe.prepTime);
    if (recipe.cookTime) schema.cookTime = formatDuration(recipe.cookTime);
    if (recipe.totalTime) schema.totalTime = formatDuration(recipe.totalTime);

    // Servings
    if (recipe.servings) {
        schema.recipeYield = `${recipe.servings} porții`;
    }

    // Ingredients
    if (recipe.ingredients.length > 0) {
        schema.recipeIngredient = recipe.ingredients;
    }

    // Instructions (HowToStep format)
    if (recipe.instructions.length > 0) {
        schema.recipeInstructions = recipe.instructions.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            text: step,
        }));
    }

    // Nutrition
    if (recipe.calories) {
        schema.nutrition = {
            '@type': 'NutritionInformation',
            calories: `${recipe.calories} calories`,
        };
    }

    // Rating
    if (recipe.rating && recipe.rating.count > 0) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: recipe.rating.value,
            ratingCount: recipe.rating.count,
        };
    }

    // Category
    schema.recipeCategory = 'Main dish';
    schema.recipeCuisine = 'Romanian';

    return schema;
}

// ==========================================
// PRODUCT/OFFER SCHEMA GENERATOR
// ==========================================
export interface ProductSchemaInput {
    name: string;
    description?: string;
    imageUrl?: string | null;
    price: number;
    originalPrice?: number | null;
    currency?: string;
    store: string;
    validUntil?: string;
    inStock?: boolean;
    category?: string;
}

export function generateProductSchema(product: ProductSchemaInput): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || `${product.name} - ofertă la ${product.store}`,
        image: product.imageUrl || undefined,
        category: product.category,
        offers: {
            '@type': 'Offer',
            price: product.price.toFixed(2),
            priceCurrency: product.currency || 'RON',
            priceValidUntil: product.validUntil,
            availability: product.inStock !== false
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: product.store,
            },
        },
    };
}

// ==========================================
// BREADCRUMB SCHEMA GENERATOR
// ==========================================
export interface BreadcrumbItem {
    name: string;
    url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

// ==========================================
// ARTICLE SCHEMA GENERATOR (for blog)
// ==========================================
export interface ArticleSchemaInput {
    title: string;
    description: string;
    imageUrl?: string | null;
    author?: string;
    datePublished: string;
    dateModified?: string;
    url?: string;
}

export function generateArticleSchema(article: ArticleSchemaInput): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        image: article.imageUrl || undefined,
        author: {
            '@type': 'Organization',
            name: article.author || 'CatalogSmart',
        },
        publisher: {
            '@type': 'Organization',
            name: 'CatalogSmart',
            url: 'https://catalogsmart.ro',
            logo: {
                '@type': 'ImageObject',
                url: 'https://catalogsmart.ro/icon.png',
            },
        },
        datePublished: article.datePublished,
        dateModified: article.dateModified || article.datePublished,
        mainEntityOfPage: article.url,
    };
}

// ==========================================
// FAQPage SCHEMA GENERATOR
// ==========================================
export interface FAQItem {
    question: string;
    answer: string;
}

export function generateFAQSchema(faqs: FAQItem[]): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}

// ==========================================
// ORGANIZATION SCHEMA (site-wide)
// ==========================================
export function generateOrganizationSchema(): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'CatalogSmart',
        url: 'https://catalogsmart.ro',
        logo: 'https://catalogsmart.ro/icon.png',
        description: 'Compară prețuri din cataloagele supermarketurilor și găsește cele mai bune oferte pentru rețetele tale.',
        sameAs: [],
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            availableLanguage: 'Romanian',
        },
    };
}

// ==========================================
// WEBSITE SCHEMA (site-wide)
// ==========================================
export function generateWebsiteSchema(): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'CatalogSmart',
        url: 'https://catalogsmart.ro',
        description: 'Compară prețuri și găsește cele mai bune oferte din Lidl, Kaufland, Penny și alte supermarketuri.',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://catalogsmart.ro/cauta?q={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
        },
    };
}
