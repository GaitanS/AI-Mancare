/**
 * Image Service for Recipe Cards
 * Uses Lorem Picsum for reliable, fast food-like placeholder images
 * Each recipe gets a consistent image based on its ID
 */

/**
 * Generate a Picsum image URL based on recipe ID
 * Uses a seed to ensure the same recipe always gets the same image
 * @param recipeId - Unique recipe identifier  
 * @param width - Image width (default 800)
 * @param height - Image height (default 600)
 * @returns Image URL
 */
export function getRecipeImageUrl(recipeId: string, width = 800, height = 600): string {
    // Use a hash of the recipe ID to get a consistent "random" image
    const seed = hashCode(recipeId);
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Generate a food-themed placeholder URL
 * Uses Foodish API which provides random food images
 */
export function getFoodishImageUrl(): string {
    // Foodish API - returns random food images
    return 'https://foodish-api.com/images/pizza/pizza1.jpg';
}

/**
 * Get a stable image URL for a recipe using Picsum with grayscale food tone
 */
export function getStableRecipeImage(recipeTitle: string, width = 800, height = 600): string {
    const seed = hashCode(recipeTitle);
    return `https://picsum.photos/seed/food${seed}/${width}/${height}`;
}

/**
 * Simple hash function to convert string to number
 */
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Legacy exports for compatibility
export async function searchFoodImage(query: string): Promise<string | null> {
    return getStableRecipeImage(query);
}

export async function getRecipeImage(recipeTitle: string): Promise<string | null> {
    return getStableRecipeImage(recipeTitle);
}
