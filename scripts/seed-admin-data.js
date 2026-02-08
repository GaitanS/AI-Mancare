/**
 * Seed Admin Data
 *
 * This script seeds the database with:
 * - Default scraping processes
 * - Default stores
 *
 * Run with: node scripts/seed-admin-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_PROCESSES = [
  {
    name: 'Catalog Scraper',
    description: 'Downloads catalog images from cataloagedeoferte.ro for all enabled stores',
    type: 'catalog',
    script: 'scripts/cron-scraper.js',
    icon: '📚',
    color: 'blue',
    sortOrder: 1,
    enabled: true,
  },
  {
    name: 'Product Extractor',
    description: 'Extracts products from catalog images using Gemini Vision AI',
    type: 'product',
    script: 'scripts/catalog-processor.js',
    icon: '📦',
    color: 'emerald',
    sortOrder: 2,
    enabled: true,
  },
  {
    name: 'Recipe Generator',
    description: 'Generates budget-friendly recipes using AI based on current offers',
    type: 'recipe',
    script: 'scripts/cron-recipe-generator.js',
    icon: '🍳',
    color: 'orange',
    sortOrder: 3,
    enabled: true,
  },
  {
    name: 'Image Generator',
    description: 'Generates food photography images for recipes using Gemini Image',
    type: 'image',
    script: 'scripts/cron-image-generator.js',
    icon: '🖼️',
    color: 'pink',
    sortOrder: 4,
    enabled: true,
  },
];

const DEFAULT_STORES = [
  {
    name: 'Kaufland',
    slug: 'kaufland',
    scraperUrl: 'https://cataloagedeoferte.ro/kaufland/',
    logoUrl: null,
    sortOrder: 1,
    enabled: true,
  },
  {
    name: 'Lidl',
    slug: 'lidl',
    scraperUrl: 'https://cataloagedeoferte.ro/lidl/',
    logoUrl: null,
    sortOrder: 2,
    enabled: true,
  },
  {
    name: 'Penny',
    slug: 'penny',
    scraperUrl: 'https://cataloagedeoferte.ro/penny/',
    logoUrl: null,
    sortOrder: 3,
    enabled: true,
  },
  {
    name: 'Profi',
    slug: 'profi',
    scraperUrl: 'https://cataloagedeoferte.ro/profi/',
    logoUrl: null,
    sortOrder: 4,
    enabled: true,
  },
  {
    name: 'Mega Image',
    slug: 'mega-image',
    scraperUrl: 'https://cataloagedeoferte.ro/mega-image/',
    logoUrl: null,
    sortOrder: 5,
    enabled: true,
  },
  {
    name: 'Carrefour',
    slug: 'carrefour',
    scraperUrl: 'https://cataloagedeoferte.ro/carrefour/',
    logoUrl: null,
    sortOrder: 6,
    enabled: true,
  },
  {
    name: 'Auchan',
    slug: 'auchan',
    scraperUrl: 'https://cataloagedeoferte.ro/auchan/',
    logoUrl: null,
    sortOrder: 7,
    enabled: true,
  },
  {
    name: 'Selgros',
    slug: 'selgros',
    scraperUrl: 'https://cataloagedeoferte.ro/selgros/',
    logoUrl: null,
    sortOrder: 8,
    enabled: true,
  },
];

async function seed() {
  console.log('🌱 Seeding admin data...\n');

  // Seed Processes
  console.log('📋 Seeding processes...');
  for (const process of DEFAULT_PROCESSES) {
    const existing = await prisma.scrapingProcess.findFirst({
      where: { script: process.script },
    });

    if (existing) {
      console.log(`  ⏭️  Process already exists: ${process.name}`);
    } else {
      await prisma.scrapingProcess.create({ data: process });
      console.log(`  ✅ Created process: ${process.name}`);
    }
  }

  // Seed Stores
  console.log('\n🏪 Seeding stores...');
  for (const store of DEFAULT_STORES) {
    const existing = await prisma.store.findUnique({
      where: { slug: store.slug },
    });

    if (existing) {
      console.log(`  ⏭️  Store already exists: ${store.name}`);
    } else {
      await prisma.store.create({ data: store });
      console.log(`  ✅ Created store: ${store.name}`);
    }
  }

  console.log('\n✨ Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
