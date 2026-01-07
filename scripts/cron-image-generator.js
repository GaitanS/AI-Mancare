#!/usr/bin/env node

/**
 * Cron Image Generator - Gemini via OpenRouter
 * Generates images for recipes that don't have one
 */

require('dotenv').config({ path: '.env.production' });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const AI_MODEL = process.env.AI_MODEL_VISION || process.env.AI_MODEL || 'google/gemini-3-flash-preview';
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../storage');

// Logging utilities
const log = {
    info: (msg) => console.log(`[IMAGE-GEN] [INFO] ${new Date().toISOString()} - ${msg}`),
    error: (msg) => console.error(`[IMAGE-GEN] [ERROR] ${new Date().toISOString()} - ${msg}`),
    success: (msg) => console.log(`[IMAGE-GEN] [SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

/**
 * Generate an image description prompt for a recipe
 */
function createImagePrompt(recipe) {
    return `Generate a photorealistic, appetizing food photography image of: "${recipe.title}".

The dish should look:
- Professional food photography style
- Warm, inviting lighting
- Garnished beautifully
- Served on an elegant plate or bowl
- Top-down or 45-degree angle view
- Soft background blur

Style: Modern food blog photography, high-end restaurant presentation.
Mood: Warm, cozy, delicious, home-cooked but elegant.

Do NOT include any text, watermarks, or labels in the image.`;
}

/**
 * Call OpenRouter/Gemini to generate an image
 * Note: Gemini 3 Flash can generate images natively
 */
async function generateImage(prompt) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY not configured');
    }

    log.info(`Generating image with model: ${AI_MODEL}`);

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro',
            'X-Title': 'CatalogSmart - Recipe Images',
        },
        body: JSON.stringify({
            model: AI_MODEL,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                }
            ],
            // Gemini image generation modality
            modalities: ['text', 'image'],
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Extract image from response
    // Gemini returns images as base64 in the response
    const content = data.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
        // Multi-modal response
        for (const part of content) {
            if (part.type === 'image' || part.type === 'image_url') {
                return part.image_url?.url || part.data;
            }
        }
    }

    // If no image, return null
    log.error('No image in response');
    return null;
}

/**
 * Save base64 image to file
 */
async function saveImage(base64Data, filename) {
    const imagePath = path.join(STORAGE_PATH, 'recipe-images', filename);
    await fs.mkdir(path.dirname(imagePath), { recursive: true });

    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    await fs.writeFile(imagePath, buffer);
    log.success(`Saved image: ${filename}`);

    return `/storage/recipe-images/${filename}`;
}

/**
 * Main function - generate images for recipes without them
 */
async function generateRecipeImages(limit = 5) {
    log.info(`Starting image generation (limit: ${limit})`);

    try {
        // Find recipes without images
        const recipesWithoutImages = await prisma.recipe.findMany({
            where: {
                OR: [
                    { imageUrl: null },
                    { imageUrl: '' },
                    { imageUrl: { startsWith: '/placeholder' } },
                ]
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        log.info(`Found ${recipesWithoutImages.length} recipes needing images`);

        let successCount = 0;

        for (const recipe of recipesWithoutImages) {
            try {
                log.info(`Processing: ${recipe.title}`);

                const prompt = createImagePrompt(recipe);
                const imageData = await generateImage(prompt);

                if (imageData) {
                    // If it's a URL, use it directly; if base64, save to file
                    let imageUrl;
                    if (imageData.startsWith('http')) {
                        imageUrl = imageData;
                    } else {
                        const filename = `recipe-${recipe.id}-${Date.now()}.png`;
                        imageUrl = await saveImage(imageData, filename);
                    }

                    // Update recipe in database
                    await prisma.recipe.update({
                        where: { id: recipe.id },
                        data: { imageUrl },
                    });

                    log.success(`Updated recipe "${recipe.title}" with image`);
                    successCount++;
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                log.error(`Failed to generate image for "${recipe.title}": ${error.message}`);
            }
        }

        log.success(`Image generation completed. ${successCount}/${recipesWithoutImages.length} images created.`);
        return successCount;
    } catch (error) {
        log.error(`Fatal error: ${error.message}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Main execution
if (require.main === module) {
    const limit = parseInt(process.argv[2]) || 5;

    generateRecipeImages(limit)
        .then((count) => {
            log.success(`Job finished. Generated ${count} images.`);
            process.exit(0);
        })
        .catch((error) => {
            log.error(`Job failed: ${error.message}`);
            console.error(error);
            process.exit(1);
        });
}

module.exports = { generateRecipeImages };
