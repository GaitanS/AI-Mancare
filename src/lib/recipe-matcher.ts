/**
 * Recipe Matcher Service
 * Handles ingredient hashing and recipe matching to avoid duplicate generation
 */

import crypto from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Generate a hash from an array of ingredients
 * Ingredients are normalized (lowercase, trimmed, sorted) before hashing
 */
export function hashIngredients(ingredients: string[]): string {
    // Normalize: lowercase, trim, remove accents, sort alphabetically
    const normalized = ingredients
        .map(ing => ing.toLowerCase().trim())
        .map(ing => ing.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) // Remove accents
        .sort()
        .join('|');

    // Create SHA-256 hash
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Find an existing recipe by ingredient IDs
 * Returns the recipe if found, null otherwise
 */
export async function findRecipeByIngredients(ingredients: string[]): Promise<any | null> {
    if (!ingredients || ingredients.length === 0) return null;

    // Build AND conditions for all ingredients
    const recipe = await prisma.recipe.findFirst({
        where: {
            AND: ingredients.map(ing => ({
                ingredientIds: { contains: ing }
            }))
        },
    });

    return recipe;
}

/**
 * Check if a recipe with these ingredients already exists
 */
export async function recipeExists(ingredients: string[]): Promise<boolean> {
    const recipe = await findRecipeByIngredients(ingredients);
    return recipe !== null;
}

/**
 * Get or create a recipe based on ingredients
 * If recipe exists in cache, return it
 * If not, call the generator function to create a new one
 */
export async function getOrCreateRecipe(
    ingredients: string[],
    generateRecipe: () => Promise<{
        title: string;
        description: string;
        instructions: string;
        servings: number;
        prepTime: number;
        cookTime: number;
        totalTime: number;
        difficulty: string;
        tags: string[];
        tips?: string;
        estimatedCost?: number;
    }>
): Promise<any> {
    // Check cache first
    const existingRecipe = await findRecipeByIngredients(ingredients);
    if (existingRecipe) {
        logger.info(`Found cached recipe: ${existingRecipe.title}`, { recipeId: existingRecipe.id }, 'RecipeMatcher');
        return existingRecipe;
    }

    // Generate new recipe
    logger.info('No cached recipe found, generating new one...', {}, 'RecipeMatcher');
    const recipeData = await generateRecipe();

    // Create slug from title
    const slug = recipeData.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    // Ensure unique slug (add random chars to prevent same-millisecond collisions)
    const existingSlug = await prisma.recipe.findUnique({ where: { slug } });
    const finalSlug = existingSlug
        ? `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        : slug;

    // Save to database
    const newRecipe = await prisma.recipe.create({
        data: {
            title: recipeData.title,
            description: recipeData.description,
            instructions: recipeData.instructions,
            servings: recipeData.servings,
            prepTime: recipeData.prepTime,
            cookTime: recipeData.cookTime,
            totalTime: recipeData.totalTime,
            difficulty: recipeData.difficulty,
            tags: JSON.stringify(recipeData.tags),
            tips: recipeData.tips,
            estimatedCost: recipeData.estimatedCost,
            ingredientIds: JSON.stringify(ingredients),
            slug: finalSlug,
        },
    });

    logger.info(`Created new recipe: ${newRecipe.title}`, { recipeId: newRecipe.id }, 'RecipeMatcher');
    return newRecipe;
}
