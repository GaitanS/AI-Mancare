import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Define strict dietary info for ingredients
const dietaryInfo: Record<string, { isGlutenFree: boolean; isDairyFree: boolean; isVegan: boolean; isVegetarian: boolean }> = {
    // Fructe si Legume (All safe)
    'rosii': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'ceapa': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'usturoi': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'morcovi': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'cartofi': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'ardei': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'castraveti': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'salata': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'ciuperci': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'marar': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'patrunjel': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'fasole': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'mazare': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'porumb': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },

    // Carne (Not Vegan/Veg)
    'pui': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: false },
    'porc': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: false },
    'vita': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: false },
    'peste': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: false },
    'ton': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: false },
    'carnati': { isGlutenFree: false, isDairyFree: true, isVegan: false, isVegetarian: false }, // Often contain fillers
    'sunca': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: false },
    'slanina': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: false },

    // Lactate (Not Dairy Free, Not Vegan)
    'lapte': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },
    'smantana': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },
    'iaurt': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },
    'branza': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },
    'cascaval': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },
    'unt': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },
    'oua': { isGlutenFree: true, isDairyFree: true, isVegan: false, isVegetarian: true }, // Eggs are dairy free but non-vegan
    'frisca': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },
    'parmezan': { isGlutenFree: true, isDairyFree: false, isVegan: false, isVegetarian: true },

    // Panificatie (Not Gluten Free)
    'paine': { isGlutenFree: false, isDairyFree: true, isVegan: true, isVegetarian: true },
    'faina': { isGlutenFree: false, isDairyFree: true, isVegan: true, isVegetarian: true },
    'pesmet': { isGlutenFree: false, isDairyFree: true, isVegan: true, isVegetarian: true },
    'paste': { isGlutenFree: false, isDairyFree: true, isVegan: true, isVegetarian: true },
    'crutoane': { isGlutenFree: false, isDairyFree: true, isVegan: true, isVegetarian: true },

    // Altele
    'orez': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
    'ulei': { isGlutenFree: true, isDairyFree: true, isVegan: true, isVegetarian: true },
};

async function main() {
    console.log('🥗 Updating dietary info...');

    // 1. Update IngredientMappings
    for (const [name, flags] of Object.entries(dietaryInfo)) {
        // Find ingredients that mostly match this name
        // We use 'contains' because 'pui' should match 'piept de pui' logic if mapped improperly, 
        // but here we are updating the Mapping table which has normalized names like 'pui', 'rosii'.
        // So strict match on keyword or part of ingredientName.

        // Actually, seed-ingredients.ts created specific ingredientNames: 'pui', 'rosii', etc.
        // We can straightforwardly update them.

        // Also handle "roșii" vs "rosii" mapping normalization if needed
        let targetName = name;
        if (name === 'rosii') targetName = 'roșii';
        if (name === 'ceapa') targetName = 'ceapă';
        if (name === 'faina') targetName = 'făină';
        if (name === 'paine') targetName = 'pâine';
        // ... (simplified for this script, assuming seed names match mostly)

        // Try update by precise name first
        try {
            await prisma.ingredientMapping.updateMany({
                where: {
                    OR: [
                        { ingredientName: { equals: name } },
                        { ingredientName: { contains: name } },
                        { keywords: { contains: name } }
                    ]
                },
                data: flags
            });
        } catch (e) {
            console.log(`Skipping update for ${name}`);
        }
    }
    console.log('✅ Ingredients updated');

    // 2. Scan and Update Recipes
    const recipes = await prisma.recipe.findMany();

    for (const recipe of recipes) {
        // Simple heuristic: check if recipe text contains non-compliant ingredients
        const fullText = (recipe.title + ' ' + recipe.instructions + ' ' + (recipe.tags || '')).toLowerCase();

        let isGlutenFree = true;
        let isDairyFree = true;
        let isVegan = true;
        let isVegetarian = true;

        // Check against our "Bad List" rules

        // 1. Check for Meat (Breaks Vegan/Veg)
        const meats = ['pui', 'porc', 'vita', 'carne', 'sunca', 'slanina', 'carnati', 'peste', 'ton'];
        if (meats.some(m => fullText.includes(m))) {
            isVegan = false;
            isVegetarian = false;
        }

        // 2. Check for Eggs/Dairy (Breaks Vegan (Eggs), Dairy Free (Dairy))
        const dairy = ['lapte', 'smantana', 'iaurt', 'branza', 'cascaval', 'unt', 'frisca', 'parmezan'];
        if (dairy.some(d => fullText.includes(d))) {
            isDairyFree = false;
            isVegan = false;
        }

        const eggs = ['oua', 'ou ']; // space to avoid 'noua' etc
        if (eggs.some(e => fullText.includes(e))) {
            isVegan = false;
            // Eggs are vegetarian
        }

        // 3. Check for Gluten
        const gluten = ['paine', 'faina', 'pesmet', 'paste', 'crutoane', 'grau', 'gluten'];
        if (gluten.some(g => fullText.includes(g))) {
            isGlutenFree = false;
        }

        // Manual overrides for known recipes based on slug
        if (recipe.slug.includes('paste')) isGlutenFree = false;
        if (recipe.slug.includes('pui')) { isVegan = false; isVegetarian = false; }
        if (recipe.slug.includes('omleta')) { isVegan = false; }
        if (recipe.slug.includes('caesar')) { isVegan = false; isVegetarian = false; } // Chicken + Cheese

        console.log(`Update ${recipe.title}: GF=${isGlutenFree}, DF=${isDairyFree}, Vn=${isVegan}, Vg=${isVegetarian}`);

        await prisma.recipe.update({
            where: { id: recipe.id },
            data: {
                isGlutenFree,
                isDairyFree,
                isVegan,
                isVegetarian
            }
        });
    }

    console.log('✅ Recipes updated');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
