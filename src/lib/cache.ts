// In-Memory Cache using node-cache
// 4GB RAM available on Hostinger Cloud Startup

import NodeCache from 'node-cache';

// Cache TTL values from environment or defaults
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_DEFAULT || '600', 10); // 10 minutes
const PRODUCTS_TTL = parseInt(process.env.CACHE_TTL_PRODUCTS || '3600', 10); // 1 hour
const RECIPES_TTL = parseInt(process.env.CACHE_TTL_RECIPES || '7200', 10); // 2 hours

// Create cache instances
export const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Better performance, but be careful with mutations
  deleteOnExpire: true,
  maxKeys: 1000, // Limit number of keys to prevent memory issues
});

export const productsCache = new NodeCache({
  stdTTL: PRODUCTS_TTL,
  checkperiod: 300,
  useClones: false,
  maxKeys: 500,
});

export const recipesCache = new NodeCache({
  stdTTL: RECIPES_TTL,
  checkperiod: 600,
  useClones: false,
  maxKeys: 200,
});

// Generic cache wrapper function
export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
  cacheInstance: NodeCache = cache
): Promise<T> {
  // Try to get from cache
  const cachedValue = cacheInstance.get<T>(key);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  // If not in cache, execute function
  const result = await fn();

  // Store in cache
  cacheInstance.set(key, result, ttl);

  return result;
}

// Cache key generators
export const cacheKeys = {
  product: (id: string) => `product:${id}`,
  productsByStore: (store: string) => `products:store:${store}`,
  productsByCategory: (category: string) => `products:category:${category}`,
  activeOffers: (store?: string) =>
    store ? `offers:active:${store}` : 'offers:active:all',
  recipe: (id: string) => `recipe:${id}`,
  recipeBySlug: (slug: string) => `recipe:slug:${slug}`,
  weeklyRecipes: () => 'recipes:weekly',
  stats: (type: string) => `stats:${type}`,
};

// Cache invalidation helpers
export function invalidateProductCache(store?: string) {
  if (store) {
    productsCache.del(cacheKeys.productsByStore(store));
    productsCache.del(cacheKeys.activeOffers(store));
  } else {
    productsCache.flushAll();
  }
}

export function invalidateRecipeCache(id?: string) {
  if (id) {
    recipesCache.del(cacheKeys.recipe(id));
  } else {
    recipesCache.flushAll();
  }
}

// Stats for monitoring
export function getCacheStats() {
  return {
    main: cache.getStats(),
    products: productsCache.getStats(),
    recipes: recipesCache.getStats(),
  };
}

// Clear all caches
export function clearAllCaches() {
  cache.flushAll();
  productsCache.flushAll();
  recipesCache.flushAll();
}

export default cache;
