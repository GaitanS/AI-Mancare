const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up recipes created today...');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    try {
        const deleted = await prisma.recipe.deleteMany({
            where: {
                createdAt: {
                    gte: startOfDay
                }
            }
        });

        console.log(`✅ Deleted ${deleted.count} recipes created today.`);
    } catch (error) {
        console.error('❌ Error deleting recipes:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
