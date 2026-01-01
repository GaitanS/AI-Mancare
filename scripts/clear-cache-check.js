const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndReport() {
  console.log('=== Verificare Baza de Date ===\n');

  const now = new Date();
  console.log('Data curenta:', now.toISOString());

  // Total products
  const totalProducts = await prisma.product.count();
  console.log('\nTotal produse in DB:', totalProducts);

  // Active products (valid now)
  const activeProducts = await prisma.product.count({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now }
    }
  });
  console.log('Produse active (valide acum):', activeProducts);

  // Products with 20%+ discount (what homepage shows)
  const discountedProducts = await prisma.product.count({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now },
      discountPercentage: { gte: 20 }
    }
  });
  console.log('Produse cu 20%+ reducere:', discountedProducts);

  // Get sample products that SHOULD show on homepage
  const sampleProducts = await prisma.product.findMany({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now },
      discountPercentage: { gte: 20 }
    },
    take: 5,
    orderBy: { discountPercentage: 'desc' },
    select: {
      id: true,
      name: true,
      store: true,
      discountPercentage: true,
      validFrom: true,
      validUntil: true
    }
  });

  console.log('\n=== Produse care ar trebui sa apara pe homepage ===');
  if (sampleProducts.length === 0) {
    console.log('PROBLEMA: Nu exista produse care sa indeplineasca criteriile!');
    console.log('Criterii: validFrom <= now && validUntil >= now && discountPercentage >= 20');
  } else {
    sampleProducts.forEach((p, i) => {
      console.log(`${i+1}. ${p.name} (${p.store}) - ${p.discountPercentage}% reducere`);
      console.log(`   Valid: ${p.validFrom.toISOString().split('T')[0]} - ${p.validUntil.toISOString().split('T')[0]}`);
    });
  }

  // Check all date ranges
  console.log('\n=== Toate intervalele de validitate ===');
  const dateRanges = await prisma.product.groupBy({
    by: ['validFrom', 'validUntil'],
    _count: true,
    orderBy: { validFrom: 'asc' }
  });

  dateRanges.forEach(d => {
    const isActive = d.validFrom <= now && d.validUntil >= now;
    const status = isActive ? '✓ ACTIV' : '✗ EXPIRAT';
    console.log(`${d.validFrom.toISOString().split('T')[0]} - ${d.validUntil.toISOString().split('T')[0]}: ${d._count} produse ${status}`);
  });

  // Recipes
  const recipeCount = await prisma.recipe.count();
  console.log('\n=== Retete ===');
  console.log('Total retete:', recipeCount);

  if (recipeCount === 0) {
    console.log('ATENTIE: Nu exista retete in baza de date!');
  }

  // Conclusion
  console.log('\n=== CONCLUZIE ===');
  if (discountedProducts > 0) {
    console.log(`✓ Exista ${discountedProducts} produse care ar trebui sa apara pe homepage`);
    console.log('→ Daca nu apar, problema este probabil CACHE-ul serverului');
    console.log('→ Solutie: Reporneste serverul Next.js pentru a goli cache-ul in-memory');
  } else {
    console.log('✗ Nu exista produse valide cu 20%+ reducere');
    console.log('→ Trebuie sa actualizezi datele produselor sau sa scazi pragul de reducere');
  }

  await prisma.$disconnect();
}

checkAndReport().catch(console.error);
