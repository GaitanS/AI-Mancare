/**
 * AI PDF Processor using OpenRouter + Gemini Vision + Puppeteer
 * Extracts product information from PDF catalog pages and saves images for viewer
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import type { ExtractedProduct } from '@/types';
import { retry, sleep } from '@/lib/utils';
import puppeteer from 'puppeteer';

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
 * Render PDF page to Base64 Image using Puppeteer (Headless Chrome)
 * This bypasses the need for local system dependencies like Poppler or GraphicsMagick
 */
async function renderPdfPage(browser: any, pdfBytes: Uint8Array, pageIndex: number): Promise<string> {
  const page = await browser.newPage();
  try {
    await page.goto('about:blank');

    // Inject PDF.js
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });

    // Pass PDF data to page context
    // We convert Uint8Array to Array for serializability
    const pdfDataArray = Array.from(pdfBytes);

    const base64Image = await page.evaluate(async (data: number[], idx: number) => {
      // @ts-ignore
      const pdfjs = window['pdfjsLib'];
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
      const pdf = await loadingTask.promise;
      const pdfPage = await pdf.getPage(idx + 1); // 1-based index in PDF.js

      const viewport = pdfPage.getViewport({ scale: 2.0 }); // High quality (2x)
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) throw new Error('Canvas context not found');

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await pdfPage.render(renderContext).promise;
      return canvas.toDataURL('image/jpeg', 0.9);
    }, pdfDataArray, pageIndex);

    // Strip prefix "data:image/jpeg;base64,"
    return base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  } catch (e) {
    console.error(`Error rendering page ${pageIndex} with Puppeteer:`, e);
    throw e;
  } finally {
    await page.close();
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
                    url: `data:image/jpeg;base64,${imageBase64}`,
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
  let browser = null;

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

    if (!catalog.pdfUrl) {
      throw new Error(`Catalog ${catalogId} has no PDF URL`);
    }

    console.log(`[PROCESSOR] Processing catalog for store: ${catalog.store}`);

    // Update status to processing
    await prisma.catalog.update({
      where: { id: catalogId },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
      },
    });

    // 1. Fetch PDF from URL
    console.log(`[PROCESSOR] Fetching PDF from: ${catalog.pdfUrl}`);
    const pdfResponse = await fetch(catalog.pdfUrl);
    if (!pdfResponse.ok) throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    // 2. Launch Puppeteer
    console.log('[PROCESSOR] Launching Puppeteer for PDF rendering...');
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Get total pages via PDF.js logic or we could trust the DB if set
    // We'll rely on the loop until error/bound
    // But first let's get page count using pdf-lib or just try to render? 
    // We can use pdf-lib just for counting pages efficiently.
    const { PDFDocument } = await import('pdf-lib'); // Still use pdf-lib for structure checks
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    console.log(`[PROCESSOR] Total pages: ${totalPages}`);

    await prisma.catalog.update({
      where: { id: catalogId },
      data: { totalPages },
    });

    // Ensure public/catalog-images/[store] exists
    const publicDir = path.join(process.cwd(), 'public', 'catalog-images', catalog.store);
    await fs.mkdir(publicDir, { recursive: true });

    // Process each page
    for (let i = 0; i < totalPages; i++) {
      console.log(`[PROCESSOR] Processing page ${i + 1}/${totalPages}`);

      try {
        // Convert page to image (Puppeteer)
        const imageBase64 = await renderPdfPage(browser, pdfBytes, i);

        // Save image to disk for Viewer
        const pageNum = String(i + 1).padStart(2, '0');
        const fileName = `page-${pageNum}.jpg`; // Standard pattern: page-01.jpg
        const filePath = path.join(publicDir, fileName);

        const imageBuffer = Buffer.from(imageBase64, 'base64');
        await fs.writeFile(filePath, imageBuffer);
        console.log(`[PROCESSOR] Saved image to: ${filePath}`);

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
                nutritionalInfo: product.nutritionalInfo ? JSON.stringify(product.nutritionalInfo) : null,
                allergens: product.allergens ? JSON.stringify(product.allergens) : null,
              },
            });
            productsExtracted++;
          } catch (dbError) {
            console.error(`[PROCESSOR] Failed to insert product: ${(dbError as any).message}`);
          }
        }

        // Update progress
        await prisma.catalog.update({
          where: { id: catalogId },
          data: { processedPages: i + 1 },
        });

        // Rate limiting
        await sleep(RATE_LIMIT_DELAY);

      } catch (pageError) {
        const error = `Error on page ${i + 1}: ${(pageError as any).message}`;
        console.error(`[PROCESSOR] ${error}`);
        errors.push(error);
      }
    }

    // Mark as completed
    await prisma.catalog.update({
      where: { id: catalogId },
      data: {
        status: 'COMPLETED',
        processingCompletedAt: new Date(),
        processingErrors: errors.length > 0 ? JSON.stringify({ errors }) : null,
      },
    });

    console.log(`[PROCESSOR] Completed catalog for store: ${catalog.store}`);
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
        processingErrors: JSON.stringify({ error: (error as any).message, errors }),
      },
    });
    return {
      success: false,
      productsExtracted,
      errors: [...errors, (error as any).message],
    };
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

export default {
  extractProductsFromImage,
  processCatalog,
};
