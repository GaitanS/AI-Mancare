/**
 * Recipe Generator using OpenRouter + Gemini
 * Generates economical recipes based on current product offers
 */

import OpenAI from 'openai';
import { z } from 'zod';
import type { Product, GeneratedRecipe } from '@/types';
import { generateSlug, sleep } from '@/lib/utils';
import prisma from '@/lib/db';
import { calculateDietaryFlags } from '@/lib/dietary';

// OpenRouter client (OpenAI-compatible API)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Retete Ieftine - AI Mancare',
  },
});

const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.5-flash';

// Recipe schema for structured output
const recipeSchema = z.object({
  title: z.string().describe('Titlul rețetei în limba română'),
  description: z.string().describe('Descriere scurtă și atractivă a rețetei'),
  servings: z.number().describe('Număr de porții'),
  prep_time: z.number().describe('Timp de preparare în minute'),
  cook_time: z.number().describe('Timp de gătit în minute'),
  difficulty: z.enum(['ușor', 'mediu', 'dificil']).describe('Nivelul de dificultate'),
  ingredients: z
    .array(
      z.object({
        product_id: z.string().describe('ID-ul produsului din baza de date'),
        quantity: z.string().describe('Cantitatea necesară (ex: 500g, 2 buc)'),
        notes: z.string().optional().describe('Note opționale despre ingredient'),
      })
    )
    .describe('Lista de ingrediente cu referințe la produse'),
  instructions: z
    .array(
      z.object({
        step: z.number().describe('Numărul pasului'),
        text: z.string().describe('Instrucțiunea detaliată pentru acest pas'),
      })
    )
    .describe('Pașii de preparare'),
  tips: z.array(z.string()).describe('Sfaturi utile pentru preparare și economisire'),
  estimated_cost: z.number().describe('Costul estimat total în lei'),
});

interface RecipeConstraints {
  maxCost?: number;
  maxTime?: number;
  dietary?: string[];
  preferredStores?: string[];
}

/**
 * Generate a single recipe based on available products
 */
export async function generateRecipe(
  availableProducts: Product[],
  constraints: RecipeConstraints = {}
): Promise<GeneratedRecipe> {
  try {
    // Format products for the prompt
    const productsFormatted = availableProducts
      .map(
        (p) =>
          `- ${p.name} (${p.brand || 'no brand'}): ${p.price} lei/${p.unit} ${p.discountPercentage ? `[${p.discountPercentage}% reducere]` : ''
          } [ID: ${p.id}] [Store: ${p.store}]`
      )
      .join('\n');

    const systemPrompt = `Ești un chef profesionist român care creează rețete economice și delicioase.

IMPORTANT - RETURNEAZĂ DOAR JSON VALID, fără text explicativ înainte sau după!

Schema JSON obligatorie:
{
  "title": "string (titlul rețetei în română)",
  "description": "string (descriere scurtă)",
  "servings": number (nr porții),
  "prep_time": number (minute preparare),
  "cook_time": number (minute gătit),
  "difficulty": "ușor" | "mediu" | "dificil",
  "ingredients": [{"product_id": "string", "quantity": "string", "notes": "string optional"}],
  "instructions": [{"step": number, "text": "string"}],
  "tips": ["string"],
  "estimated_cost": number (cost total în lei)
}`;

    const userPrompt = `PRODUSE DISPONIBILE LA OFERTĂ:
${productsFormatted}

CONSTRÂNGERI:
- Cost maxim: ${constraints.maxCost || 50} lei
- Timp maxim preparare: ${constraints.maxTime || 60} minute
- Restricții dietetice: ${constraints.dietary?.join(', ') || 'none'}
- Magazine preferate: ${constraints.preferredStores?.join(', ') || 'orice magazin'}

SARCINĂ:
Creează o rețetă completă care:
1. Folosește PRIORITAR produsele cu cele mai mari reduceri (discount %)
2. Este PRACTICĂ și ușor de preparat pentru o familie română
3. Are un raport calitate-preț EXCELENT
4. Include instrucțiuni clare pas-cu-pas
5. Oferă tips utile pentru preparare și economisire

IMPORTANT:
- Folosește DOAR produse din lista furnizată
- Referențiază produsele prin ID-ul lor exact
- Calculează costul total corect
- Returnează DOAR JSON valid!`;

    const response = await openrouter.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Clean potential markdown formatting
    const jsonContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(jsonContent);
    return result as GeneratedRecipe;
  } catch (error: any) {
    console.error('Error generating recipe:', error);
    throw new Error(`Failed to generate recipe: ${error.message}`);
  }
}

// Status Interface
interface RecipeStatus {
  running: boolean;
  current: number;
  total: number;
  message: string;
  complete?: boolean;
  error?: string;
  generatedCount?: number;
  updatedAt?: string;
}

// Helper to update status file
async function updateStatus(status: RecipeStatus) {
  // We need to use fs/promises here, but since this runs in Next.js API context, 
  // we should be careful. Using 'fs' usually works in API routes/scripts.
  // However, if we were in Edge, this would fail. We assume Node runtime.
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const storagePath = path.join(process.cwd(), 'storage');
    const statusPath = path.join(storagePath, 'recipes-status.json');

    await fs.mkdir(storagePath, { recursive: true });
    await fs.writeFile(statusPath, JSON.stringify({
      ...status,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (e) {
    console.error('Failed to update recipe status file:', e);
  }
}

/**
 * Generate weekly recipes based on current offers
 */
export async function generateWeeklyRecipes(count: number = 10): Promise<string[]> {
  console.log('[RECIPE GEN] Starting weekly recipe generation');

  await updateStatus({
    running: true,
    current: 0,
    total: count,
    message: 'Starting recipe generation...',
    generatedCount: 0
  });

  try {
    // Get products with active offers (biggest discounts first)
    const products = await prisma.product.findMany({
      where: {
        validUntil: {
          gte: new Date(),
        },
      },
      orderBy: {
        discountPercentage: 'desc',
      },
      take: 100, // Top 100 offers
    });

    console.log(`[RECIPE GEN] Found ${products.length} products on offer`);

    if (products.length === 0) {
      console.warn('[RECIPE GEN] No products found with active offers');
      await updateStatus({
        running: false,
        current: 0,
        total: count,
        message: 'No products found with offers. Stopping.',
        complete: true,
        generatedCount: 0
      });
      return [];
    }


    const recipeIds: string[] = [];

    // Generate diverse recipes with different constraints
    for (let i = 0; i < count; i++) {
      // Update status for current item
      await updateStatus({
        running: true,
        current: i + 1,
        total: count,
        message: `Generating recipe ${i + 1}/${count}...`,
        generatedCount: recipeIds.length
      });

      try {
        console.log(`[RECIPE GEN] Generating recipe ${i + 1}/${count}`);

        // Vary constraints for diversity
        const constraints: RecipeConstraints = {
          maxCost: 20 + i * 5, // Vary budget: 20, 25, 30, ..., 65
          maxTime: 45,
          dietary: i % 3 === 0 ? ['vegetarian'] : [],
        };

        // Convert Prisma products to Product type
        const typedProducts: Product[] = products.map(p => ({
          ...p,
          price: Number(p.price),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        }));

        const recipe = await generateRecipe(typedProducts, constraints);

        // Create slug
        const slug = generateSlug(recipe.title);

        // Check if recipe with this slug already exists
        const existing = await prisma.recipe.findUnique({
          where: { slug },
        });

        if (existing) {
          console.log(`[RECIPE GEN] Recipe with slug ${slug} already exists, skipping`);
          continue;
        }

        // Save to database
        const saved = await prisma.recipe.create({
          data: {
            title: recipe.title,
            description: recipe.description,
            servings: recipe.servings,
            prepTime: recipe.prep_time,
            cookTime: recipe.cook_time,
            totalTime: recipe.prep_time + recipe.cook_time,
            difficulty: recipe.difficulty === 'ușor' ? 'USOR' : recipe.difficulty === 'mediu' ? 'MEDIU' : 'DIFICIL',
            instructions: JSON.stringify(recipe.instructions),
            tips: JSON.stringify(recipe.tips),
            ingredientIds: JSON.stringify(recipe.ingredients.map((i) => i.product_id)),
            estimatedCost: recipe.estimated_cost,
            slug,
            metaDescription: recipe.description.substring(0, 160),
            tags: JSON.stringify([
              recipe.difficulty,
              'economic',
              `${recipe.servings} portii`,
              `${recipe.prep_time + recipe.cook_time} minute`,
            ]),
            // Automatic Dietary Classification
            ...calculateDietaryFlags(recipe.title + ' ' + recipe.instructions.map(s => s.text).join(' ') + ' ' + recipe.ingredients.map(i => i.product_id).join(' ')),
          },
        });

        recipeIds.push(saved.id);
        console.log(`[RECIPE GEN] Created recipe: ${recipe.title} (ID: ${saved.id})`);

        // Rate limiting
        await sleep(3000);
      } catch (error) {
        console.error(`[RECIPE GEN] Error generating recipe ${i + 1}:`, error);
        // Continue with next recipe
      }
    }

    console.log(`[RECIPE GEN] Generated ${recipeIds.length} recipes successfully`);

    // Final success status
    await updateStatus({
      running: false,
      current: count,
      total: count,
      message: `Complete! Generated ${recipeIds.length} new recipes.`,
      complete: true,
      generatedCount: recipeIds.length
    });

    return recipeIds;
  } catch (error: any) {
    console.error('[RECIPE GEN] Fatal error:', error);

    // Error status
    await updateStatus({
      running: false,
      current: 0,
      total: count,
      message: `Error: ${error.message}`,
      error: error.message,
      complete: false
    });

    throw error;
  }
}

/**
 * Generate a custom recipe based on user preferences
 */
export async function generateCustomRecipe(
  budget: number,
  servings: number = 4,
  dietaryRestrictions: string[] = [],
  preferredStores: string[] = []
): Promise<GeneratedRecipe> {
  console.log('[RECIPE GEN] Generating custom recipe');

  try {
    // Build query for products
    const where: any = {
      validUntil: {
        gte: new Date(),
      },
    };

    if (preferredStores.length > 0) {
      where.store = {
        in: preferredStores,
      };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        discountPercentage: 'desc',
      },
      take: 80,
    });

    if (products.length === 0) {
      throw new Error('No products found matching criteria');
    }

    // Convert Prisma products to Product type
    const typedProducts: Product[] = products.map(p => ({
      ...p,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    }));

    const recipe = await generateRecipe(typedProducts, {
      maxCost: budget,
      maxTime: 60,
      dietary: dietaryRestrictions,
      preferredStores,
    });

    return recipe;
  } catch (error) {
    console.error('[RECIPE GEN] Error generating custom recipe:', error);
    throw error;
  }
}

export default {
  generateRecipe,
  generateWeeklyRecipes,
  generateCustomRecipe,
};
