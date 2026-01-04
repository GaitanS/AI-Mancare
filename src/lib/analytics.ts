/**
 * Google Analytics 4 Tracking
 * Event tracking for CatalogSmart
 */

// GA4 Measurement ID - set in .env.local
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Check if GA is available
const isGAAvailable = () => {
    return typeof window !== 'undefined' && GA_MEASUREMENT_ID && (window as any).gtag
}

/**
 * Track page view
 */
export const pageview = (url: string, title?: string) => {
    if (!isGAAvailable()) return

        ; (window as any).gtag('config', GA_MEASUREMENT_ID, {
            page_path: url,
            page_title: title
        })
}

/**
 * Track custom event
 */
export const event = (
    action: string,
    category: string,
    label?: string,
    value?: number
) => {
    if (!isGAAvailable()) return

        ; (window as any).gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value
        })
}

// ============================================
// PREDEFINED EVENTS FOR CATALOGSMART
// ============================================

/**
 * User signed up
 */
export const trackSignUp = (method: 'email' | 'google' | 'facebook') => {
    event('sign_up', 'engagement', method)
}

/**
 * User viewed an offer
 */
export const trackOfferView = (store: string, productName: string, price?: number) => {
    event('view_offer', 'offers', `${store} - ${productName}`, price)
}

/**
 * User clicked on an offer
 */
export const trackOfferClick = (store: string, productName: string) => {
    event('click_offer', 'offers', `${store} - ${productName}`)
}

/**
 * User saved a recipe
 */
export const trackRecipeSave = (recipeName: string, cost?: number) => {
    event('save_recipe', 'recipes', recipeName, cost)
}

/**
 * User created a weekly plan
 */
export const trackPlanCreated = (days: number, totalCost?: number) => {
    event('create_plan', 'planning', `${days}_days`, totalCost)
}

/**
 * User exported shopping list
 */
export const trackListExport = (format: 'pdf' | 'text' | 'email', itemCount: number) => {
    event('export_list', 'shopping', format, itemCount)
}

/**
 * User compared stores
 */
export const trackStoreCompare = (stores: string[]) => {
    event('compare_stores', 'shopping', stores.join(' vs '))
}

/**
 * User used search
 */
export const trackSearch = (query: string, resultCount: number) => {
    event('search', 'engagement', query, resultCount)
}

/**
 * User filtered offers/recipes
 */
export const trackFilter = (filterType: string, filterValue: string) => {
    event('filter', 'engagement', `${filterType}: ${filterValue}`)
}

/**
 * User viewed catalog
 */
export const trackCatalogView = (store: string, catalogName: string) => {
    event('view_catalog', 'catalogs', `${store} - ${catalogName}`)
}

/**
 * User upgraded to premium
 */
export const trackPremiumUpgrade = (plan: string, price: number) => {
    event('purchase', 'monetization', plan, price)
}

/**
 * User shared content
 */
export const trackShare = (contentType: 'recipe' | 'offer' | 'list', platform: string) => {
    event('share', 'social', `${contentType} - ${platform}`)
}

/**
 * Newsletter subscription
 */
export const trackNewsletterSignup = () => {
    event('newsletter_signup', 'engagement')
}

// ============================================
// ECOMMERCE EVENTS (if needed later)
// ============================================

/**
 * Add to cart event
 */
export const trackAddToCart = (item: {
    id: string
    name: string
    price: number
    store: string
}) => {
    if (!isGAAvailable()) return

        ; (window as any).gtag('event', 'add_to_cart', {
            currency: 'RON',
            value: item.price,
            items: [{
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                item_brand: item.store,
                quantity: 1
            }]
        })
}

/**
 * View item event
 */
export const trackViewItem = (item: {
    id: string
    name: string
    price: number
    category: string
}) => {
    if (!isGAAvailable()) return

        ; (window as any).gtag('event', 'view_item', {
            currency: 'RON',
            value: item.price,
            items: [{
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                item_category: item.category
            }]
        })
}
