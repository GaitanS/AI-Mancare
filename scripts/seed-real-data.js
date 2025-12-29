#!/usr/bin/env node

/**
 * Seed Real Data - Populate database with realistic Romanian supermarket products
 * These are typical products and prices you'd find in Lidl, Kaufland, Penny, etc.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Realistic Romanian supermarket products with current prices
const realProducts = [
  // === LIDL ===
  { name: 'Piept de pui', brand: 'Pikok', category: 'Proteine', subcategory: 'Carne de pui', price: 24.99, originalPrice: 32.99, unit: 'kg', store: 'Lidl', discountPercentage: 24 },
  { name: 'Pulpe de pui', brand: 'Pikok', category: 'Proteine', subcategory: 'Carne de pui', price: 14.99, originalPrice: 18.99, unit: 'kg', store: 'Lidl', discountPercentage: 21 },
  { name: 'Carne tocată porc-vită', brand: 'Metzger', category: 'Proteine', subcategory: 'Carne tocată', price: 22.99, originalPrice: 28.99, unit: 'kg', store: 'Lidl', discountPercentage: 21 },
  { name: 'Cârnați proaspeți', brand: 'Pikok', category: 'Proteine', subcategory: 'Mezeluri', price: 12.99, originalPrice: 16.99, unit: 'kg', store: 'Lidl', discountPercentage: 24 },
  { name: 'Salam de vară', brand: 'Dulano', category: 'Proteine', subcategory: 'Mezeluri', price: 7.99, originalPrice: 9.99, unit: '200g', store: 'Lidl', discountPercentage: 20 },
  { name: 'Ouă mărimea M', brand: 'Cocorico', category: 'Proteine', subcategory: 'Ouă', price: 8.99, originalPrice: 11.49, unit: '10 buc', store: 'Lidl', discountPercentage: 22 },
  { name: 'Lapte integral 3.5%', brand: 'Pilos', category: 'Lactate', subcategory: 'Lapte', price: 5.49, originalPrice: 6.99, unit: 'L', store: 'Lidl', discountPercentage: 21 },
  { name: 'Iaurt grecesc 10%', brand: 'Pilos', category: 'Lactate', subcategory: 'Iaurt', price: 4.99, originalPrice: 6.49, unit: '400g', store: 'Lidl', discountPercentage: 23 },
  { name: 'Brânză telemea', brand: 'Pilos', category: 'Lactate', subcategory: 'Brânzeturi', price: 18.99, originalPrice: 23.99, unit: 'kg', store: 'Lidl', discountPercentage: 21 },
  { name: 'Cașcaval Rucăr', brand: 'Hochland', category: 'Lactate', subcategory: 'Brânzeturi', price: 8.99, originalPrice: 11.99, unit: '250g', store: 'Lidl', discountPercentage: 25 },
  { name: 'Unt 82%', brand: 'Pilos', category: 'Lactate', subcategory: 'Unt', price: 7.49, originalPrice: 9.49, unit: '200g', store: 'Lidl', discountPercentage: 21 },
  { name: 'Smântână pentru gătit', brand: 'Pilos', category: 'Lactate', subcategory: 'Smântână', price: 3.99, originalPrice: 4.99, unit: '200ml', store: 'Lidl', discountPercentage: 20 },
  { name: 'Pâine toast', brand: 'Golden Toast', category: 'Panificație', subcategory: 'Pâine', price: 5.49, originalPrice: 6.99, unit: '500g', store: 'Lidl', discountPercentage: 21 },
  { name: 'Cartofi albi', brand: null, category: 'Legume', subcategory: 'Legume rădăcinoase', price: 2.49, originalPrice: 3.49, unit: 'kg', store: 'Lidl', discountPercentage: 29 },
  { name: 'Ceapă galbenă', brand: null, category: 'Legume', subcategory: 'Legume rădăcinoase', price: 2.99, originalPrice: 3.99, unit: 'kg', store: 'Lidl', discountPercentage: 25 },
  { name: 'Morcovi', brand: null, category: 'Legume', subcategory: 'Legume rădăcinoase', price: 2.79, originalPrice: 3.49, unit: 'kg', store: 'Lidl', discountPercentage: 20 },
  { name: 'Roșii românești', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 6.99, originalPrice: 9.99, unit: 'kg', store: 'Lidl', discountPercentage: 30 },
  { name: 'Ardei gras', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 7.99, originalPrice: 10.99, unit: 'kg', store: 'Lidl', discountPercentage: 27 },
  { name: 'Castraveți', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 4.99, originalPrice: 6.49, unit: 'kg', store: 'Lidl', discountPercentage: 23 },
  { name: 'Varză albă', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 1.99, originalPrice: 2.99, unit: 'kg', store: 'Lidl', discountPercentage: 33 },
  { name: 'Fasole verde', brand: null, category: 'Legume', subcategory: 'Legume', price: 8.99, originalPrice: 11.99, unit: 'kg', store: 'Lidl', discountPercentage: 25 },
  { name: 'Ulei de floarea soarelui', brand: 'Olio', category: 'Condimente', subcategory: 'Uleiuri', price: 8.99, originalPrice: 11.99, unit: 'L', store: 'Lidl', discountPercentage: 25 },
  { name: 'Orez bob lung', brand: 'Golden Sun', category: 'Carbohidrați', subcategory: 'Orez', price: 5.99, originalPrice: 7.49, unit: 'kg', store: 'Lidl', discountPercentage: 20 },
  { name: 'Paste penne', brand: 'Combino', category: 'Carbohidrați', subcategory: 'Paste', price: 4.49, originalPrice: 5.99, unit: '500g', store: 'Lidl', discountPercentage: 25 },
  { name: 'Făină albă 000', brand: 'Belbake', category: 'Carbohidrați', subcategory: 'Făină', price: 3.29, originalPrice: 4.49, unit: 'kg', store: 'Lidl', discountPercentage: 27 },

  // === KAUFLAND ===
  { name: 'Coaste de porc', brand: 'K-Purland', category: 'Proteine', subcategory: 'Carne de porc', price: 19.99, originalPrice: 26.99, unit: 'kg', store: 'Kaufland', discountPercentage: 26 },
  { name: 'Ceafă de porc', brand: 'K-Purland', category: 'Proteine', subcategory: 'Carne de porc', price: 24.99, originalPrice: 31.99, unit: 'kg', store: 'Kaufland', discountPercentage: 22 },
  { name: 'Aripi de pui', brand: 'K-Purland', category: 'Proteine', subcategory: 'Carne de pui', price: 16.99, originalPrice: 21.99, unit: 'kg', store: 'Kaufland', discountPercentage: 23 },
  { name: 'File de somon', brand: 'K-Classic', category: 'Proteine', subcategory: 'Pește', price: 54.99, originalPrice: 69.99, unit: 'kg', store: 'Kaufland', discountPercentage: 21 },
  { name: 'File de cod', brand: 'K-Classic', category: 'Proteine', subcategory: 'Pește', price: 44.99, originalPrice: 54.99, unit: 'kg', store: 'Kaufland', discountPercentage: 18 },
  { name: 'Șuncă presată', brand: 'Caroli', category: 'Proteine', subcategory: 'Mezeluri', price: 9.99, originalPrice: 12.99, unit: '300g', store: 'Kaufland', discountPercentage: 23 },
  { name: 'Parizer de pui', brand: 'Agricola', category: 'Proteine', subcategory: 'Mezeluri', price: 6.99, originalPrice: 8.99, unit: '300g', store: 'Kaufland', discountPercentage: 22 },
  { name: 'Lapte batut', brand: 'Zuzu', category: 'Lactate', subcategory: 'Lapte', price: 4.99, originalPrice: 6.49, unit: 'L', store: 'Kaufland', discountPercentage: 23 },
  { name: 'Iaurt natural', brand: 'Danone', category: 'Lactate', subcategory: 'Iaurt', price: 2.99, originalPrice: 3.99, unit: '400g', store: 'Kaufland', discountPercentage: 25 },
  { name: 'Brânză de vaci', brand: 'Hochland', category: 'Lactate', subcategory: 'Brânzeturi', price: 5.99, originalPrice: 7.49, unit: '200g', store: 'Kaufland', discountPercentage: 20 },
  { name: 'Mozzarella', brand: 'K-Classic', category: 'Lactate', subcategory: 'Brânzeturi', price: 6.49, originalPrice: 8.49, unit: '200g', store: 'Kaufland', discountPercentage: 24 },
  { name: 'Spanac proaspăt', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 4.99, originalPrice: 6.99, unit: '400g', store: 'Kaufland', discountPercentage: 29 },
  { name: 'Broccoli', brand: null, category: 'Legume', subcategory: 'Legume', price: 7.99, originalPrice: 9.99, unit: 'buc', store: 'Kaufland', discountPercentage: 20 },
  { name: 'Conopidă', brand: null, category: 'Legume', subcategory: 'Legume', price: 5.99, originalPrice: 7.99, unit: 'buc', store: 'Kaufland', discountPercentage: 25 },
  { name: 'Ciuperci champignon', brand: null, category: 'Legume', subcategory: 'Ciuperci', price: 8.99, originalPrice: 11.99, unit: '500g', store: 'Kaufland', discountPercentage: 25 },
  { name: 'Usturoi românesc', brand: null, category: 'Legume', subcategory: 'Condimente', price: 12.99, originalPrice: 16.99, unit: 'kg', store: 'Kaufland', discountPercentage: 24 },
  { name: 'Mere Golden', brand: null, category: 'Fructe', subcategory: 'Mere', price: 4.99, originalPrice: 6.49, unit: 'kg', store: 'Kaufland', discountPercentage: 23 },
  { name: 'Banane', brand: null, category: 'Fructe', subcategory: 'Fructe exotice', price: 5.49, originalPrice: 6.99, unit: 'kg', store: 'Kaufland', discountPercentage: 21 },
  { name: 'Portocale', brand: null, category: 'Fructe', subcategory: 'Citrice', price: 4.99, originalPrice: 6.49, unit: 'kg', store: 'Kaufland', discountPercentage: 23 },
  { name: 'Zahăr alb', brand: 'K-Classic', category: 'Condimente', subcategory: 'Zahăr', price: 4.49, originalPrice: 5.99, unit: 'kg', store: 'Kaufland', discountPercentage: 25 },
  { name: 'Sare de mare', brand: 'K-Classic', category: 'Condimente', subcategory: 'Sare', price: 2.99, originalPrice: 3.99, unit: 'kg', store: 'Kaufland', discountPercentage: 25 },
  { name: 'Boia de ardei dulce', brand: 'Delikat', category: 'Condimente', subcategory: 'Condimente', price: 3.99, originalPrice: 5.49, unit: '100g', store: 'Kaufland', discountPercentage: 27 },

  // === PENNY ===
  { name: 'Cotlet de porc', brand: 'Penny', category: 'Proteine', subcategory: 'Carne de porc', price: 21.99, originalPrice: 27.99, unit: 'kg', store: 'Penny', discountPercentage: 21 },
  { name: 'Pulpe dezosate de pui', brand: 'Penny', category: 'Proteine', subcategory: 'Carne de pui', price: 18.99, originalPrice: 23.99, unit: 'kg', store: 'Penny', discountPercentage: 21 },
  { name: 'Crenvurști', brand: 'Penny', category: 'Proteine', subcategory: 'Mezeluri', price: 5.99, originalPrice: 7.99, unit: '400g', store: 'Penny', discountPercentage: 25 },
  { name: 'Bacon feliat', brand: 'Penny', category: 'Proteine', subcategory: 'Mezeluri', price: 8.99, originalPrice: 11.99, unit: '150g', store: 'Penny', discountPercentage: 25 },
  { name: 'Lapte UHT 1.5%', brand: 'Penny', category: 'Lactate', subcategory: 'Lapte', price: 4.99, originalPrice: 6.49, unit: 'L', store: 'Penny', discountPercentage: 23 },
  { name: 'Unt de masă', brand: 'Penny', category: 'Lactate', subcategory: 'Unt', price: 6.99, originalPrice: 8.99, unit: '200g', store: 'Penny', discountPercentage: 22 },
  { name: 'Cremă de brânză', brand: 'President', category: 'Lactate', subcategory: 'Brânzeturi', price: 4.49, originalPrice: 5.99, unit: '125g', store: 'Penny', discountPercentage: 25 },
  { name: 'Vinete', brand: null, category: 'Legume', subcategory: 'Legume', price: 5.99, originalPrice: 7.99, unit: 'kg', store: 'Penny', discountPercentage: 25 },
  { name: 'Dovlecei', brand: null, category: 'Legume', subcategory: 'Legume', price: 4.99, originalPrice: 6.49, unit: 'kg', store: 'Penny', discountPercentage: 23 },
  { name: 'Ardei iute', brand: null, category: 'Legume', subcategory: 'Legume', price: 9.99, originalPrice: 12.99, unit: 'kg', store: 'Penny', discountPercentage: 23 },
  { name: 'Salată verde', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 2.99, originalPrice: 3.99, unit: 'buc', store: 'Penny', discountPercentage: 25 },
  { name: 'Rodie', brand: null, category: 'Fructe', subcategory: 'Fructe exotice', price: 3.99, originalPrice: 5.49, unit: 'buc', store: 'Penny', discountPercentage: 27 },
  { name: 'Struguri albi', brand: null, category: 'Fructe', subcategory: 'Struguri', price: 6.99, originalPrice: 9.49, unit: 'kg', store: 'Penny', discountPercentage: 26 },
  { name: 'Oțet de vin', brand: 'Penny', category: 'Condimente', subcategory: 'Oțet', price: 3.49, originalPrice: 4.49, unit: '500ml', store: 'Penny', discountPercentage: 22 },
  { name: 'Muștar clasic', brand: 'Penny', category: 'Condimente', subcategory: 'Sosuri', price: 2.49, originalPrice: 3.29, unit: '250g', store: 'Penny', discountPercentage: 24 },
  { name: 'Ketchup', brand: 'Tomi', category: 'Condimente', subcategory: 'Sosuri', price: 4.99, originalPrice: 6.49, unit: '500g', store: 'Penny', discountPercentage: 23 },

  // === CARREFOUR ===
  { name: 'Mușchi de vită', brand: 'Carrefour', category: 'Proteine', subcategory: 'Carne de vită', price: 59.99, originalPrice: 74.99, unit: 'kg', store: 'Carrefour', discountPercentage: 20 },
  { name: 'Antricot de vită', brand: 'Carrefour', category: 'Proteine', subcategory: 'Carne de vită', price: 69.99, originalPrice: 89.99, unit: 'kg', store: 'Carrefour', discountPercentage: 22 },
  { name: 'Pulpă de curcan', brand: 'Carrefour', category: 'Proteine', subcategory: 'Carne de curcan', price: 22.99, originalPrice: 28.99, unit: 'kg', store: 'Carrefour', discountPercentage: 21 },
  { name: 'Creveți decorticați', brand: 'Carrefour', category: 'Proteine', subcategory: 'Fructe de mare', price: 39.99, originalPrice: 49.99, unit: '400g', store: 'Carrefour', discountPercentage: 20 },
  { name: 'Miel - pulpă', brand: 'Carrefour', category: 'Proteine', subcategory: 'Carne de miel', price: 49.99, originalPrice: 64.99, unit: 'kg', store: 'Carrefour', discountPercentage: 23 },
  { name: 'Parmezan', brand: 'Grana Padano', category: 'Lactate', subcategory: 'Brânzeturi', price: 12.99, originalPrice: 16.99, unit: '200g', store: 'Carrefour', discountPercentage: 24 },
  { name: 'Mascarpone', brand: 'Galbani', category: 'Lactate', subcategory: 'Brânzeturi', price: 9.99, originalPrice: 12.99, unit: '250g', store: 'Carrefour', discountPercentage: 23 },
  { name: 'Smântână dulce', brand: 'Carrefour', category: 'Lactate', subcategory: 'Smântână', price: 4.49, originalPrice: 5.99, unit: '200ml', store: 'Carrefour', discountPercentage: 25 },
  { name: 'Avocado', brand: null, category: 'Legume', subcategory: 'Legume', price: 3.99, originalPrice: 5.49, unit: 'buc', store: 'Carrefour', discountPercentage: 27 },
  { name: 'Sparanghel verde', brand: null, category: 'Legume', subcategory: 'Legume', price: 14.99, originalPrice: 19.99, unit: '500g', store: 'Carrefour', discountPercentage: 25 },
  { name: 'Rucola', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 5.99, originalPrice: 7.99, unit: '100g', store: 'Carrefour', discountPercentage: 25 },
  { name: 'Roșii cherry', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 8.99, originalPrice: 11.99, unit: '500g', store: 'Carrefour', discountPercentage: 25 },
  { name: 'Mango', brand: null, category: 'Fructe', subcategory: 'Fructe exotice', price: 4.99, originalPrice: 6.99, unit: 'buc', store: 'Carrefour', discountPercentage: 29 },
  { name: 'Lămâi', brand: null, category: 'Fructe', subcategory: 'Citrice', price: 5.99, originalPrice: 7.99, unit: 'kg', store: 'Carrefour', discountPercentage: 25 },
  { name: 'Caise', brand: null, category: 'Fructe', subcategory: 'Fructe', price: 9.99, originalPrice: 12.99, unit: 'kg', store: 'Carrefour', discountPercentage: 23 },
  { name: 'Ulei de măsline extravirgin', brand: 'Carrefour Bio', category: 'Condimente', subcategory: 'Uleiuri', price: 24.99, originalPrice: 32.99, unit: '750ml', store: 'Carrefour', discountPercentage: 24 },
  { name: 'Paste spaghetti', brand: 'Barilla', category: 'Carbohidrați', subcategory: 'Paste', price: 6.99, originalPrice: 8.99, unit: '500g', store: 'Carrefour', discountPercentage: 22 },
  { name: 'Bulion de roșii', brand: 'Mutti', category: 'Conserve', subcategory: 'Paste de roșii', price: 5.99, originalPrice: 7.99, unit: '200g', store: 'Carrefour', discountPercentage: 25 },

  // === MEGA IMAGE ===
  { name: 'File de pangasius', brand: 'Mega', category: 'Proteine', subcategory: 'Pește', price: 24.99, originalPrice: 31.99, unit: 'kg', store: 'Mega Image', discountPercentage: 22 },
  { name: 'Brânză feta', brand: 'Dodoni', category: 'Lactate', subcategory: 'Brânzeturi', price: 8.99, originalPrice: 11.99, unit: '200g', store: 'Mega Image', discountPercentage: 25 },
  { name: 'Iaurt grecesc Lidl', brand: 'Total', category: 'Lactate', subcategory: 'Iaurt', price: 6.99, originalPrice: 8.99, unit: '200g', store: 'Mega Image', discountPercentage: 22 },
  { name: 'Hummus', brand: 'Sabra', category: 'Conserve', subcategory: 'Paste', price: 9.99, originalPrice: 12.99, unit: '200g', store: 'Mega Image', discountPercentage: 23 },
  { name: 'Tzatziki', brand: 'Mega', category: 'Lactate', subcategory: 'Sosuri', price: 4.99, originalPrice: 6.49, unit: '200g', store: 'Mega Image', discountPercentage: 23 },
  { name: 'Baby spanac', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 6.99, originalPrice: 8.99, unit: '125g', store: 'Mega Image', discountPercentage: 22 },
  { name: 'Mix salată', brand: null, category: 'Legume', subcategory: 'Legume frunze', price: 5.99, originalPrice: 7.99, unit: '150g', store: 'Mega Image', discountPercentage: 25 },
  { name: 'Zmeură', brand: null, category: 'Fructe', subcategory: 'Fructe de pădure', price: 9.99, originalPrice: 12.99, unit: '125g', store: 'Mega Image', discountPercentage: 23 },
  { name: 'Afine', brand: null, category: 'Fructe', subcategory: 'Fructe de pădure', price: 11.99, originalPrice: 15.99, unit: '125g', store: 'Mega Image', discountPercentage: 25 },
  { name: 'Sos pesto', brand: 'Barilla', category: 'Condimente', subcategory: 'Sosuri', price: 11.99, originalPrice: 15.99, unit: '190g', store: 'Mega Image', discountPercentage: 25 },
];

async function seedData() {
  console.log('🌱 Starting seed with real Romanian supermarket data...\n');

  const now = new Date();
  const validFrom = new Date(now);
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days

  let created = 0;
  let skipped = 0;

  for (const product of realProducts) {
    try {
      // Check if product already exists (by name + store)
      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          store: product.store,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.product.create({
        data: {
          name: product.name,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          price: product.price,
          originalPrice: product.originalPrice,
          discountPercentage: product.discountPercentage,
          unit: product.unit,
          store: product.store,
          validFrom,
          validUntil,
          extractionConfidence: 0.95,
        },
      });

      created++;
      console.log(`✅ ${product.store}: ${product.name} - ${product.price} lei (${product.discountPercentage}% reducere)`);
    } catch (error) {
      console.error(`❌ Error creating ${product.name}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} products`);
  console.log(`   Skipped: ${skipped} (already exist)`);
  console.log(`   Total in DB: ${await prisma.product.count()}`);

  // Show products by store
  const stores = await prisma.product.groupBy({
    by: ['store'],
    _count: { id: true },
  });

  console.log(`\n🏪 Products by store:`);
  for (const store of stores) {
    console.log(`   ${store.store}: ${store._count.id} products`);
  }
}

seedData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
