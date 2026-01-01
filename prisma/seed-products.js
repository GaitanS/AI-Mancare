const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleProducts = [
    // Pui (match: pui, piept pui)
    {
        name: 'Piept de pui dezosat 1kg',
        category: 'carne',
        price: 32.99,
        originalPrice: 42.99,
        discountPercentage: 23,
        unit: 'kg',
        store: 'Kaufland',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
        catalogPageImage: '/hero-plate.png'
    },
    {
        name: 'Pulpe pui inferioare',
        category: 'carne',
        price: 18.99,
        originalPrice: 24.99,
        discountPercentage: 24,
        unit: 'kg',
        store: 'Lidl',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-plate.png'
    },
    {
        name: 'Pui Grill',
        category: 'carne',
        price: 14.50,
        originalPrice: 16.50,
        discountPercentage: 12,
        unit: 'kg',
        store: 'Penny',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-plate.png'
    },

    // Roșii (match: roșii)
    {
        name: 'Roșii Cherry caserolă 500g',
        category: 'legume',
        price: 6.99,
        originalPrice: 9.99,
        discountPercentage: 30,
        unit: 'buc',
        store: 'Lidl',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-vegetables.png'
    },
    {
        name: 'Roșii Românești',
        category: 'legume',
        price: 8.49,
        originalPrice: 10.99,
        discountPercentage: 22,
        unit: 'kg',
        store: 'Kaufland',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-vegetables.png'
    },

    // Ceapă (match: ceapă)
    {
        name: 'Ceapă Galbenă',
        category: 'legume',
        price: 2.99,
        originalPrice: 4.49,
        discountPercentage: 33,
        unit: 'kg',
        store: 'Penny',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-vegetables.png'
    },

    // Smântână (match: smântână)
    {
        name: 'Smântână Zuzu 12%',
        category: 'lactate',
        price: 12.50,
        originalPrice: 15.90,
        discountPercentage: 21,
        unit: 'buc',
        store: 'Kaufland',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-spices.png'
    },
    {
        name: 'Smântână Covalact 20%',
        category: 'lactate',
        price: 14.90,
        originalPrice: 18.50,
        discountPercentage: 19,
        unit: 'buc',
        store: 'Lidl',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-spices.png'
    },

    // Cartofi (match: cartofi)
    {
        name: 'Cartofi Albi',
        category: 'legume',
        price: 2.49,
        originalPrice: 3.99,
        discountPercentage: 37,
        unit: 'kg',
        store: 'Lidl',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-vegetables.png'
    },

    // Ulei (match: ulei)
    {
        name: 'Ulei Floarea Soarelui Bunica',
        category: 'uleiuri',
        price: 6.49,
        originalPrice: 8.99,
        discountPercentage: 27,
        unit: 'L',
        store: 'Kaufland',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-spices.png'
    },
    {
        name: 'Ulei Măsline Extra Virgin',
        category: 'uleiuri',
        price: 29.99,
        originalPrice: 45.99,
        discountPercentage: 34,
        unit: 'L',
        store: 'Lidl',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-spices.png'
    },

    // Ouă (match: ouă)
    {
        name: 'Ouă M 30 buc',
        category: 'lactate',
        price: 29.99,
        originalPrice: 35.99,
        discountPercentage: 16,
        unit: 'buc',
        store: 'Lidl',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-spices.png'
    },
    {
        name: 'Ouă L 10 buc',
        category: 'lactate',
        price: 11.49,
        originalPrice: 14.49,
        discountPercentage: 20,
        unit: 'buc',
        store: 'Kaufland',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        catalogPageImage: '/hero-spices.png'
    }
];

async function main() {
    console.log('Seeding products...');

    for (const product of sampleProducts) {
        await prisma.product.create({
            data: product
        });
    }

    console.log(`Seeded ${sampleProducts.length} products`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
