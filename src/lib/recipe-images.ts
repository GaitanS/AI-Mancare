/**
 * AI Recipe Image Generator
 * Uses OpenRouter + Gemini to generate food images for recipes
 * Gemini 2.0 supports native image generation via chat completions
 */

import fs from 'fs';
import path from 'path';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

// Directory for storing generated images
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'recipes');

/**
 * Ensure the images directory exists
 */
function ensureImagesDir() {
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }
}

/**
 * Generate a food image using Gemini's native image generation via OpenRouter
 * @param recipeTitle - Title of the recipe for the prompt
 * @param recipeId - Unique ID for the filename
 * @returns Local path to the saved image (for database storage)
 */
export async function generateRecipeImage(
    recipeTitle: string,
    recipeId: string
): Promise<string | null> {
    if (!OPENROUTER_API_KEY) {
        console.error('[RecipeImages] OPENROUTER_API_KEY not configured');
        return getFallbackImageUrl(recipeTitle);
    }

    try {
        ensureImagesDir();

        // Create prompt for food image generation
        const prompt = `Generate a professional food photography image of "${recipeTitle}". 
    The dish should be beautifully plated on a clean plate, with natural lighting 
    and a shallow depth of field. Restaurant quality presentation, top-down or 
    45-degree angle view. Make it look appetizing and delicious.`;

        console.log(`[RecipeImages] Generating image for: ${recipeTitle}`);

        // Use Gemini 2.0 Flash with image generation via chat completions
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                'X-Title': 'Retete Ieftine - Recipe Image Generator',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp:free',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    }
                ],
                // Request image output
                modalities: ['image'],
                response_format: { type: 'image' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[RecipeImages] OpenRouter error:', response.status, errorText);
            return getFallbackImageUrl(recipeTitle);
        }

        const data = await response.json();
        console.log('[RecipeImages] Response:', JSON.stringify(data).slice(0, 500));

        // Check for image in response
        if (data.choices && data.choices[0]?.message?.content) {
            const content = data.choices[0].message.content;

            // Check if content is base64 image
            if (typeof content === 'string' && content.startsWith('data:image')) {
                const localPath = await saveImageLocally(content, recipeId);
                return localPath;
            }

            // Check for image URL in content
            if (Array.isArray(content)) {
                for (const item of content) {
                    if (item.type === 'image_url' && item.image_url?.url) {
                        const localPath = await saveImageLocally(item.image_url.url, recipeId);
                        return localPath;
                    }
                }
            }
        }

        // Fallback if no image in response
        console.log('[RecipeImages] No image in response, using fallback');
        return getFallbackImageUrl(recipeTitle);
    } catch (error) {
        console.error('[RecipeImages] Failed to generate image:', error);
        return getFallbackImageUrl(recipeTitle);
    }
}

/**
 * Save an image from URL or base64 to local filesystem
 */
async function saveImageLocally(imageData: string, recipeId: string): Promise<string> {
    ensureImagesDir();

    const filename = `${recipeId}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);
    const publicPath = `/images/recipes/${filename}`;

    try {
        // Check if it's a base64 image
        if (imageData.startsWith('data:')) {
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
            console.log(`[RecipeImages] Saved base64 image to: ${publicPath}`);
        } else if (imageData.startsWith('http')) {
            // Download from URL
            const response = await fetch(imageData);
            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(filepath, Buffer.from(arrayBuffer));
            console.log(`[RecipeImages] Downloaded and saved image to: ${publicPath}`);
        } else {
            // Assume raw base64 without prefix
            fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));
            console.log(`[RecipeImages] Saved raw base64 image to: ${publicPath}`);
        }

        return publicPath;
    } catch (error) {
        console.error('[RecipeImages] Failed to save image locally:', error);
        return getFallbackImageUrl(recipeId);
    }
}

/**
 * Get a fallback image URL when AI generation fails
 * Uses Picsum with a seed based on recipe title for consistency
 */
export function getFallbackImageUrl(recipeTitle: string): string {
    // Create a simple hash for consistent images per recipe
    let hash = 0;
    for (let i = 0; i < recipeTitle.length; i++) {
        const char = recipeTitle.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const seed = Math.abs(hash);

    // Use Picsum with seed for consistency
    return `https://picsum.photos/seed/food${seed}/800/600`;
}

/**
 * Check if recipe already has a local image
 */
export function hasLocalImage(recipeId: string): boolean {
    ensureImagesDir();
    const filepath = path.join(IMAGES_DIR, `${recipeId}.jpg`);
    return fs.existsSync(filepath);
}

/**
 * Get the local image path for a recipe
 */
export function getLocalImagePath(recipeId: string): string | null {
    if (hasLocalImage(recipeId)) {
        return `/images/recipes/${recipeId}.jpg`;
    }
    return null;
}
