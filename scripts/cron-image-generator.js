#!/usr/bin/env node

/**
 * Cron Image Generator - Gemini 3 Pro (Nano Banana Pro)
 * Settings: ZERO TEXT, HD Resolution (1280x720 / 16:9)
 */

require('dotenv').config({ path: '.env.production', override: false });
require('dotenv').config({ path: '.env', override: false });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../storage');
const STATUS_FILE = path.join(STORAGE_PATH, 'images-status.json');
const LOGS_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOGS_DIR, `image-generator-${new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' }).replace(/[/:, ]/g, '-')}.log`);

if (!fsSync.existsSync(LOGS_DIR)) {
    fsSync.mkdirSync(LOGS_DIR, { recursive: true });
}

function writeLog(message) {
    try {
        fsSync.appendFileSync(LOG_FILE, message + '\n');
    } catch (e) {}
}

const getRoTime = () => new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
const log = {
    info: (msg) => { const line = `[${getRoTime()}] ${msg}`; console.log(line); writeLog(line); },
    error: (msg) => { const line = `[${getRoTime()}] ❌ ${msg}`; console.error(line); writeLog(line); },
    success: (msg) => { const line = `[${getRoTime()}] ✅ ${msg}`; console.log(line); writeLog(line); },
};

function writeStatus(status) {
    try {
        if (!fsSync.existsSync(STORAGE_PATH)) {
            fsSync.mkdirSync(STORAGE_PATH, { recursive: true });
        }
        fsSync.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    } catch (e) {
        log.error(`Failed to write status: ${e.message}`);
    }
}

/**
 * UPDATED PROMPT:
 * - Enforces 16:9 Aspect Ratio (1280x720)
 * - Enforces Zero Text
 */
function createImagePrompt(recipe) {
    return `CRITICAL INSTRUCTION: Generate a pure, photorealistic food photograph.
STRICT CONSTRAINTS:
1. NO TEXT: The image must contain ABSOLUTELY NO TEXT, NO LABELS, NO WATERMARKS, and NO OVERLAYS.
2. FORMAT: Landscape orientation, 16:9 Aspect Ratio (HD 1280x720).

Subject: A delicious, high-end presentation of "${recipe.title}".

Visual details:
- Camera: Professional DSLR, macro lens.
- Lighting: Warm, natural sunlight, appetizing shadows.
- View: 45-degree angle or top-down.
- Background: Soft bokeh (blurred) restaurant setting.

Generate ONLY the visual scene.`;
}

/**
 * Call OpenRouter with Gemini 3
 */
async function generateImage(prompt) {
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');

    log.info(`Generating image with model: ${IMAGE_MODEL}`);

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogsmart.ro',
            'X-Title': 'CatalogSmart - Recipe Images',
        },
        body: JSON.stringify({
            model: IMAGE_MODEL,
            messages: [{
                role: 'user',
                content: prompt
            }],
            // PARAMETRII CRITICI:
            modalities: ['image', 'text'], // Obligatoriu pentru generare
            // Deși 'size' nu e întotdeauna respectat de Gemini prin API-ul chat, 
            // prompt-ul de mai sus cu "16:9" face greutatea principală.
            // Putem încerca să sugerăm preferința, dar promptul e baza.
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    log.info(`Response received from ${IMAGE_MODEL}`);

    const message = data.choices?.[0]?.message;

    // 1. Check for images array (Gemini format)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
        return message.images[0].image_url?.url;
    }

    // 2. Fallback check
    const content = message?.content;
    if (typeof content === 'string') {
        if (content.startsWith('data:image')) return content;
        const urlMatch = content.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp))/i);
        if (urlMatch) return urlMatch[1];
    }

    log.error('No image found. Full response: ' + JSON.stringify(data).substring(0, 1000));
    return null;
}

/**
 * Save image to file
 */
async function saveImage(imageData, filename) {
    const imagePath = path.join(__dirname, '../public/images/recipes', filename);
    await fs.mkdir(path.dirname(imagePath), { recursive: true });

    let buffer;
    if (imageData.startsWith('data:image')) {
        const base64Clean = imageData.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Clean, 'base64');
    } else if (imageData.startsWith('http')) {
        const resp = await fetch(imageData);
        const arrayBuffer = await resp.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    } else {
        buffer = Buffer.from(imageData, 'base64');
    }

    await fs.writeFile(imagePath, buffer);
    log.success(`Saved image: ${filename}`);
    return `/images/recipes/${filename}`;
}

/**
 * Main function
 */
async function generateRecipeImages(limit = 5) {
    log.info(`Starting image generation (limit: ${limit})`);

    writeStatus({
        running: true,
        current: 0,
        total: limit,
        message: 'Se inițializează Gemini 3 HD (1280x720)...',
        complete: false,
        generatedCount: 0,
        currentRecipe: null,
        error: null
    });

    try {
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
        const total = recipesWithoutImages.length;
        let successCount = 0;

        for (let i = 0; i < recipesWithoutImages.length; i++) {
            const recipe = recipesWithoutImages[i];
            try {
                log.info(`Processing: ${recipe.title}`);
                writeStatus({
                    running: true,
                    current: i,
                    total: total,
                    message: `Procesăm ${i + 1}/${total}`,
                    complete: false,
                    generatedCount: successCount,
                    currentRecipe: recipe.title,
                    error: null
                });

                const prompt = createImagePrompt(recipe);
                const imageData = await generateImage(prompt);

                if (imageData) {
                    const filename = `recipe-${recipe.id}-${Date.now()}.png`;
                    const imageUrl = await saveImage(imageData, filename);

                    await prisma.recipe.update({
                        where: { id: recipe.id },
                        data: { imageUrl },
                    });

                    log.success(`Updated recipe "${recipe.title}"`);
                    successCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                log.error(`Failed: ${error.message}`);
            }
        }

        writeStatus({
            running: false,
            startedAt: null,
            completedAt: new Date().toISOString(),
            current: total,
            total: total,
            message: `Generare completă! ${successCount}/${total} imagini HD.`,
            complete: true,
            generatedCount: successCount,
            currentRecipe: null,
            error: null
        });

        return successCount;
    } catch (error) {
        writeStatus({ running: false, complete: false, error: error.message, generatedCount: 0 });
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    const limit = parseInt(process.argv[2]) || 5;
    generateRecipeImages(limit).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { generateRecipeImages };