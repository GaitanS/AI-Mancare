/**
 * AI PDF Processor using OpenRouter + Gemini Vision
 * Extracts product information from PDF catalog pages
 */

import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import type { ExtractedProduct } from '@/types';
import { retry, sleep } from '@/lib/utils';

// OpenRouter client (OpenAI-compatible API)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Retete Ieftine - AI Mancare',
  },
});

const VISION_MODEL = process.env.AI_MODEL_VISION || 'google/gemini-2.5-flash';
const RATE_LIMIT_DELAY = parseInt(process.env.OPENAI_RATE_LIMIT_DELAY_MS || '2000', 10);

/**
 * Convert PDF page to high-quality PNG image
 */
export async function convertPDFPageToImage(
  pdfPath: string,
  pageIndex: number
): Promise<string> {
  try {
    // Read PDF file
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Check if page exists
    if (pageIndex >= pdfDoc.getPageCount()) {
      throw new Error(`Page ${pageIndex} does not exist in PDF`);
    }

    // Extract single page
    const singlePageDoc = await PDFDocument.create();
    const [page] = await singlePageDoc.copyPages(pdfDoc, [pageIndex]);
    singlePageDoc.addPage(page);

    const singlePageBytes = await singlePageDoc.save();

    // Convert to PNG with high DPI for better OCR
    const pngBuffer = await sharp(Buffer.from(singlePageBytes), {
      density: 300, // High DPI
    })
      .png({
        quality: 95,
        compressionLevel: 6,
      })
      .toBuffer();

    // Convert to base64
    return pngBuffer.toString('base64');
  } catch (error) {
    console.error(`Error converting PDF page ${pageIndex}:`, error);
    throw new Error(`Failed to convert PDF page to image: ${(error as any).message}`);
  }
}

/**
 * Extract products from catalog image using GPT-4o Vision
 */
export async function extractProductsFromImage(
  imageBase64: string,
  storeName: string
): Promise<ExtractedProduct[]> {
  try {
    const response = await retry(
      async () => {
        return await openrouter.chat.completions.create({
          model: VISION_MODEL,
          messages: [
            {
              role: 'system',
              content: `Ești un expert în extragerea de date din cataloage de supermarket românești.

TASK: Analizează imaginea catalogului și extrage informații despre toate produsele alimentare.

OUTPUT FORMAT (JSON STRICT):
{
  "products": [
    {
      "name": "string (nume complet produs)",
      "brand": "string (brandul sau null)",
      "price": number (preț în lei, ex: 10.99),
      "unit": "string (kg, L, buc, 100g, pachet)",
      "original_price": number | null (preț vechi dacă există),
      "discount_percentage": number | null (ex: 25 pentru 25%),
      "category": "string (Proteine, Carbohidrați, Lactate, Legume, Fructe, Băuturi, Condimente)",
      "subcategory": "string (ex: Carne de pui, Mezeluri, Lactate)",
      "extraction_confidence": number (0.0-1.0, ex: 0.95)
    }
  ]
}

REGULI IMPORTANTE:
- Extrage DOAR produse alimentare (ignoră non-food)
- Standardizează unitățile (kg, L, buc, 100g, pachet)
- Dacă există preț vechi și nou, calculează discount_percentage
- Categorisează automat produsele în categorii standard
- Indică confidence score (0-1) pentru fiecare produs
- Returnează DOAR JSON valid, fără text explicativ
- Dacă nu găsești produse, returnează {"products": []}
`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                    detail: 'high',
                  },
                },
                {
                  type: 'text',
                  text: `Extrage toate produsele din această pagină de catalog ${storeName}.`,
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0.2, // Low temp for consistency
        });
      },
      3, // max retries
      RATE_LIMIT_DELAY
    );

    const content = response.choices[0].message.content;
    if (!content) {
      console.warn('Empty response from OpenAI');
      return [];
    }

    // Clean potential markdown formatting
    const jsonContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonContent);

    if (!parsed.products || !Array.isArray(parsed.products)) {
      console.warn('Invalid response format from OpenAI');
      return [];
    }

    // Add store name to each product
    return parsed.products.map((p: any) => ({
      ...p,
      store: storeName,
    }));
  } catch (error) {
    console.error('Error extracting products from image:', error);
    throw new Error(`Failed to extract products: ${(error as any).message}`);
  }
}

/**
 * Process entire catalog PDF
 */
export async function processCatalog(catalogId: string): Promise<{
  success: boolean;
  productsExtracted: number;
  errors: string[];
}> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const errors: string[] = [];
  let productsExtracted = 0;

  try {
    // Get catalog from database
    const catalog = await prisma.catalog.findUnique({
      where: { id: catalogId },
    });

    if (!catalog) {
      throw new Error(`Catalog ${catalogId} not found`);
    }

    if (!catalog.pdfLocalPath) {
      throw new Error(`Catalog ${catalogId} has no local PDF file`);
    }

    console.log(`[PROCESSOR] Processing catalog: ${catalog.title}`);

    // Update status to processing
    await prisma.catalog.update({
      where: { id: catalogId },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
      },
    });

    // Load PDF
    const pdfBytes = await fs.readFile(catalog.pdfLocalPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    console.log(`[PROCESSOR] Total pages: ${totalPages}`);

    await prisma.catalog.update({
      where: { id: catalogId },
      data: { totalPages },
    });

    // Process each page
    for (let i = 0; i < totalPages; i++) {
      console.log(`[PROCESSOR] Processing page ${i + 1}/${totalPages}`);

      try {
        // Convert page to image
        const imageBase64 = await convertPDFPageToImage(catalog.pdfLocalPath, i);

        // Extract products with AI
        const products = await extractProductsFromImage(imageBase64, catalog.store);

        console.log(`[PROCESSOR] Extracted ${products.length} products from page ${i + 1}`);

        // Insert products to database
        for (const product of products) {
          try {
            await prisma.product.create({
              data: {
                name: product.name,
                brand: product.brand || null,
                category: product.category,
                subcategory: product.subcategory || null,
                price: product.price,
                originalPrice: product.original_price || null,
                discountPercentage: product.discount_percentage || null,
                unit: product.unit,
                store: catalog.store,
                validFrom: catalog.validFrom,
                validUntil: catalog.validUntil,
                sourceUrl: catalog.pdfUrl,
                nutritionalInfo: product.nutritionalInfo || null,
                allergens: product.allergens || null,
              },
            });
            productsExtracted++;
          } catch (dbError) {
            const error = `Failed to insert product ${product.name}: ${(dbError as any).message}`;
            console.error(`[PROCESSOR] ${error}`);
            errors.push(error);
          }
        }

        // Update progress
        await prisma.catalog.update({
          where: { id: catalogId },
          data: { processedPages: i + 1 },
        });

        // Rate limiting - don't spam OpenAI API
        await sleep(RATE_LIMIT_DELAY);
      } catch (pageError) {
        const error = `Error on page ${i + 1}: ${(pageError as any).message}`;
        console.error(`[PROCESSOR] ${error}`);
        errors.push(error);
        // Continue processing next pages
      }
    }

    // Mark as completed
    await prisma.catalog.update({
      where: { id: catalogId },
      data: {
        status: 'COMPLETED',
        processingCompletedAt: new Date(),
        processingErrors: errors.length > 0 ? { errors } : null,
      },
    });

    console.log(`[PROCESSOR] Completed catalog: ${catalog.title}`);
    console.log(`[PROCESSOR] Total products extracted: ${productsExtracted}`);

    return {
      success: true,
      productsExtracted,
      errors,
    };
  } catch (error) {
    console.error('[PROCESSOR] Fatal error:', error);

    await prisma.catalog.update({
      where: { id: catalogId },
      data: {
        status: 'FAILED',
        processingErrors: { error: (error as any).message, errors },
      },
    });

    return {
      success: false,
      productsExtracted,
      errors: [...errors, (error as any).message],
    };
  } finally {
    await prisma.$disconnect();
  }
}

export default {
  convertPDFPageToImage,
  extractProductsFromImage,
  processCatalog,
};
