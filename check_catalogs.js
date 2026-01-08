
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.catalog.count();
        console.log(`CATALOG_COUNT:${count}`);
        if (count > 0) {
            const first = await prisma.catalog.findFirst();
            console.log(`FIRST:${first.title} (${first.store})`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
