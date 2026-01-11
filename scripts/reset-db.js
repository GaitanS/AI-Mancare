const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function reset() {
    console.log('🗑️  Starting database reset...');

    try {
        // Delete in order to respect dependencies (if any, though most are loose in this schema)
        console.log('Deleting ShoppingCart...');
        await prisma.shoppingCart.deleteMany();

        console.log('Deleting UserPantry...');
        await prisma.userPantry.deleteMany();

        console.log('Deleting WeeklyMenu...');
        await prisma.weeklyMenu.deleteMany();

        console.log('Deleting RecipeArchive...');
        await prisma.recipeArchive.deleteMany();

        console.log('Deleting Recipe...');
        await prisma.recipe.deleteMany();

        console.log('Deleting Product...');
        await prisma.product.deleteMany();

        console.log('Deleting Catalog...');
        await prisma.catalog.deleteMany();

        console.log('Deleting Article...');
        await prisma.article.deleteMany();

        console.log('Deleting IngredientMapping...');
        await prisma.ingredientMapping.deleteMany();

        console.log('Deleting ScheduleConfig...');
        await prisma.scheduleConfig.deleteMany();

        console.log('Deleting ScrapingSource...');
        await prisma.scrapingSource.deleteMany();

        console.log('Deleting User...');
        await prisma.user.deleteMany();

        console.log('✅ Database tables cleared.');

        // Clear images
        const imagesDir = path.join(process.cwd(), 'public', 'catalog-images');
        if (fs.existsSync(imagesDir)) {
            console.log('🗑️  Deleting catalog images...');
            fs.rmSync(imagesDir, { recursive: true, force: true });
            console.log('✅ Catalog images cleared.');
        }

        // Re-create empty dir to avoid build errors
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        // Clear PDF catalogs
        const catalogsDir = path.join(process.cwd(), 'public', 'catalogs');
        if (fs.existsSync(catalogsDir)) {
            console.log('🗑️  Deleting catalog PDFs...');
            fs.rmSync(catalogsDir, { recursive: true, force: true });
            console.log('✅ Catalog PDFs cleared.');
        }

        // Re-create empty dir
        if (!fs.existsSync(catalogsDir)) {
            fs.mkdirSync(catalogsDir, { recursive: true });
        }

    } catch (error) {
        console.error('❌ Error during reset:', error);
        process.exit(1);
    }
}

reset()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
