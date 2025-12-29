#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Get sample products
  const products = await prisma.product.findMany({
    take: 15,
    orderBy: { price: 'asc' }
  });

  console.log('=== Cele mai ieftine 15 produse ===\n');
  products.forEach(p => {
    const discount = p.discountPercentage ? ` (-${p.discountPercentage}%)` : '';
    console.log(`${p.name.substring(0, 45).padEnd(47)} ${p.price.toString().padStart(6)} lei  [${p.category}]${discount}`);
  });

  // Get expensive ones
  const expensive = await prisma.product.findMany({
    take: 5,
    orderBy: { price: 'desc' }
  });

  console.log('\n=== Cele mai scumpe 5 produse ===\n');
  expensive.forEach(p => {
    console.log(`${p.name.substring(0, 45).padEnd(47)} ${p.price.toString().padStart(6)} lei  [${p.category}]`);
  });

  // Stats
  const stats = await prisma.product.aggregate({
    _avg: { price: true },
    _min: { price: true },
    _max: { price: true },
    _count: true
  });

  console.log('\n=== Statistici ===');
  console.log(`Total produse: ${stats._count}`);
  console.log(`Preț mediu: ${stats._avg.price?.toFixed(2)} lei`);
  console.log(`Preț minim: ${stats._min.price} lei`);
  console.log(`Preț maxim: ${stats._max.price} lei`);

  await prisma.$disconnect();
})();
