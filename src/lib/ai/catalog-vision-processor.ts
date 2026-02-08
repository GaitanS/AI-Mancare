/**
 * Catalog Vision Processor
 * Extracts products from catalog images using Gemini Vision via OpenRouter
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { sleep } from '@/lib/utils';
import axios from 'axios';
import { logger } from '@/lib/logger';

// OpenRouter client
const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Catalog Vision - AI Mancare',
    },
});

const VISION_MODEL = 'google/gemini-2.5-flash-image'; // Or gemini-pro-vision if preferred

// Product schema for extraction
const extractedProductSchema = z.object({
    products: z.array(z.object({
        name: z.string().describe('Exact product name as shown in catalog'),
        price: z.number().describe('Price in RON'),
        originalPrice: z.number().optional().describe('Original price if discounted'),
        quantity: z.string().describe('Quantity/Unit (e.g. 1kg, 500g, buc)'),
        discount: z.number().optional().describe('Discount percentage'),
        category: z.string().describe('General category (e.g. Meat, Dairy, Vegetables)'),
        brand: z.string().optional().describe('Brand name if visible')
    }))
});

export type ExtractedProduct = z.infer<typeof extractedProductSchema>['products'][0];

interface VisionResponse {
    products: ExtractedProduct[];
    error?: string;
}

/**
 * Process a catalog image to extract products
 * @param imageUrl - Public URL of the catalog image
 * @param store - Store name for context
 */
export async function processCatalogImage(
    imageUrl: string,
    store: string
): Promise<VisionResponse> {
    try {
        console.log(`[VISION] Analyzing image for ${store}: ${imageUrl}`);

        // Construct prompt
        const prompt = `
        Analyze this supermarket catalog page from ${store}.
        Extract all FOOD products visible with their prices.
        Ignore non-food items (clothes, electronics, household items).
        
        For each product extract:
        - Name (in Romanian)
        - Current Price (in RON)
        - Original Price (if visible, cross-out price)
        - Quantity/Unit (e.g. 1kg, 100g, buc, L)
        - Discount percentage (if shown)
        - Category (e.g. Carne, Lactate, Legume, Fructe, Bacanie, Bauturi)
        - Brand (if visible)

        Return ONLY a JSON object with a "products" array.
        `;

        const response = await openrouter.chat.completions.create({
            model: VISION_MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageUrl } }
                    ],
                },
            ],
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content received from Vision API');
        }

        // Parse JSON output
        let parsedData;
        try {
            parsedData = JSON.parse(content);
        } catch (e) {
            // Sometimes Gemini wraps JSON in markdown blocks
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                throw new Error('Failed to parse JSON response');
            }
        }

        // Validate structure
        const result = extractedProductSchema.safeParse(parsedData);

        if (!result.success) {
            console.error('[VISION] Validation failed:', result.error);
            // Try to salvage partial data if array exists
            if (Array.isArray(parsedData.products)) {
                return { products: parsedData.products as ExtractedProduct[] };
            }
            return { products: [], error: 'Invalid data structure' };
        }

        console.log(`[VISION] Extracted ${result.data.products.length} products`);
        return { products: result.data.products };

    } catch (error) {
        console.error('[VISION] Processing failed:', error);
        return {
            products: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
