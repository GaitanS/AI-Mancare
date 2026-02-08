/**
 * AI Recipe Image Generator
 * Uses OpenRouter + Gemini to generate food images for recipes
 * Gemini 2.0 supports native image generation via chat completions
 */

import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { retry, sleep } from '@/lib/utils';
import { logger } from '@/lib/logger';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const IMAGE_MODEL = process.env.AI_MODEL_IMAGE || 'google/gemini-2.0-flash-exp:free';
const FETCH_TIMEOUT_MS = 60_000; // 60s timeout for image generation

// Directory for storing generated images
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'recipes');

// JPEG magic bytes: FF D8 FF, PNG: 89 50 4E 47
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47];

/**
 * Ensure the images directory exists (sync, called once at startup)
 */
function ensureImagesDir() {
    if (!existsSync(IMAGES_DIR)) {
        mkdirSync(IMAGES_DIR, { recursive: true });
    }
}

/**
 * Validate that a buffer contains a valid JPEG or PNG image
 */
function isValidImage(buffer: Buffer): boolean {
    if (buffer.length < 8) return false;

    const isJpeg = JPEG_MAGIC.every((byte, i) => buffer[i] === byte);
    const isPng = PNG_MAGIC.every((byte, i) => buffer[i] === byte);

    return isJpeg || isPng;
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Generate a food image using Gemini's native image generation via OpenRouter
 * Includes retry logic (3 attempts) and timeout protection
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

        // Retry up to 3 times with 3s delay between attempts
        const data = await retry(async () => {
            const response = await fetchWithTimeout(
                `${OPENROUTER_BASE_URL}/chat/completions`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                        'X-Title': 'CatalogSmart - Recipe Image Generator',
                    },
                    body: JSON.stringify({
                        model: IMAGE_MODEL,
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
                },
                FETCH_TIMEOUT_MS
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter ${response.status}: ${errorText.slice(0, 200)}`);
            }

            return await response.json();
        }, 3, 3000);

        console.log('[RecipeImages] Response received, extracting image...');

        // Check for image in response
        if (data.choices && data.choices[0]?.message?.content) {
            const content = data.choices[0].message.content;

            // Check if content is base64 image (data URL)
            if (typeof content === 'string' && content.startsWith('data:image')) {
                return await saveImageLocally(content, recipeId);
            }

            // Check for image URL or inline image in content array
            if (Array.isArray(content)) {
                for (const item of content) {
                    if (item.type === 'image_url' && item.image_url?.url) {
                        return await saveImageLocally(item.image_url.url, recipeId);
                    }
                    // Some models return inline_data
                    if (item.type === 'image' && item.data) {
                        return await saveImageLocally(item.data, recipeId);
                    }
                }
            }

            // Raw base64 string without data URL prefix
            if (typeof content === 'string' && content.length > 100) {
                return await saveImageLocally(content, recipeId);
            }
        }

        // Fallback if no image in response
        console.log('[RecipeImages] No image in response, using fallback');
        return getFallbackImageUrl(recipeTitle);
    } catch (error) {
        console.error('[RecipeImages] Failed to generate image after retries:', error);
        return getFallbackImageUrl(recipeTitle);
    }
}

/**
 * Save an image from URL or base64 to local filesystem (async I/O)
 * Validates image data before saving
 */
async function saveImageLocally(imageData: string, recipeId: string): Promise<string> {
    ensureImagesDir();

    const filename = `${recipeId}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);
    const publicPath = `/images/recipes/${filename}`;

    try {
        let imageBuffer: Buffer;

        if (imageData.startsWith('data:')) {
            // Base64 data URL
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
        } else if (imageData.startsWith('http')) {
            // Download from URL with timeout
            const response = await fetchWithTimeout(imageData, {}, 30_000);
            if (!response.ok) {
                console.error(`[RecipeImages] Download failed: ${response.status} ${response.statusText}`);
                return getFallbackImageUrl(recipeId);
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        } else {
            // Raw base64 without prefix
            imageBuffer = Buffer.from(imageData, 'base64');
        }

        // Validate image before saving
        if (!isValidImage(imageBuffer)) {
            console.error(`[RecipeImages] Invalid image data (${imageBuffer.length} bytes, header: ${imageBuffer.slice(0, 4).toString('hex')})`);
            return getFallbackImageUrl(recipeId);
        }

        // Check minimum size (valid images should be at least 1KB)
        if (imageBuffer.length < 1024) {
            console.error(`[RecipeImages] Image too small: ${imageBuffer.length} bytes`);
            return getFallbackImageUrl(recipeId);
        }

        await fs.writeFile(filepath, imageBuffer);
        console.log(`[RecipeImages] Saved image to: ${publicPath} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

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
 * Check if recipe already has a local image (async)
 */
export async function hasLocalImage(recipeId: string): Promise<boolean> {
    ensureImagesDir();
    const filepath = path.join(IMAGES_DIR, `${recipeId}.jpg`);
    try {
        await fs.access(filepath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the local image path for a recipe (async)
 */
export async function getLocalImagePath(recipeId: string): Promise<string | null> {
    if (await hasLocalImage(recipeId)) {
        return `/images/recipes/${recipeId}.jpg`;
    }
    return null;
}
