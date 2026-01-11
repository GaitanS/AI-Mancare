const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRecipeCosts() {
    console.log('🔍 Fetching all recipes...');

    const recipes = await prisma.recipe.findMany({
        select: {
            id: true,
            title: true,
            ingredientIds: true,
            estimatedCost: true,
            servings: true
        }
    });

    console.log(`Found ${recipes.length} recipes\n`);

    let updated = 0;
    let errors = 0;

    for (const recipe of recipes) {
        try {
            // Parse ingredient IDs
            let ingredientIds = [];
            try {
                ingredientIds = JSON.parse(recipe.ingredientIds);
            } catch {
                console.log(`⚠️  ${recipe.title}: Could not parse ingredientIds, skipping`);
                errors++;
                continue;
            }

            // If ingredientIds is an array of objects with product_id
            const productIds = ingredientIds.map(ing =>
                typeof ing === 'object' ? ing.product_id : ing
            );

            if (productIds.length === 0) {
                console.log(`⚠️  ${recipe.title}: No ingredients found, skipping`);
                errors++;
                continue;
            }

            // Fetch products
            const products = await prisma.product.findMany({
                where: {
                    id: { in: productIds }
                },
                select: {
                    id: true,
                    name: true,
                    price: true
                }
            });

            // Calculate total cost
            const totalCost = products.reduce((sum, product) => {
                return sum + Number(product.price);
            }, 0);

            const roundedCost = Math.round(totalCost * 100) / 100;

            // Check if needs update
            const currentCost = recipe.estimatedCost ? Number(recipe.estimatedCost) : 0;
            const diff = Math.abs(roundedCost - currentCost);

            if (diff > 0.01) {
                // Update the recipe
                await prisma.recipe.update({
                    where: { id: recipe.id },
                    data: { estimatedCost: roundedCost }
                });

                console.log(`✅ ${recipe.title}`);
                console.log(`   Old: ${currentCost.toFixed(2)} RON → New: ${roundedCost.toFixed(2)} RON`);
                console.log(`   Ingredients: ${products.map(p => `${p.name} (${Number(p.price).toFixed(2)} RON)`).join(', ')}\n`);
                updated++;
            } else {
                console.log(`✓  ${recipe.title}: Already correct (${currentCost.toFixed(2)} RON)`);
            }

        } catch (error) {
            console.error(`❌ Error processing ${recipe.title}:`, error.message);
            errors++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total recipes: ${recipes.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Already correct: ${recipes.length - updated - errors}`);

    await prisma.$disconnect();
}

fixRecipeCosts().catch(console.error);
