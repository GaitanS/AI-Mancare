const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sample = await prisma.product.findFirst();
  console.log('Sample validFrom:', sample.validFrom);
  console.log('Sample validUntil:', sample.validUntil);
  console.log('Current date:', new Date());

  const now = new Date();

  const active = await prisma.product.count({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now }
    }
  });
  console.log('\nActive products (valid now):', active);

  const withDiscount = await prisma.product.count({
    where: {
      validFrom: { lte: now },
      validUntil: { gte: now },
      discountPercentage: { gte: 20 }
    }
  });
  console.log('With 20%+ discount:', withDiscount);

  // Show all unique date ranges
  const dates = await prisma.product.groupBy({
    by: ['validFrom', 'validUntil'],
    _count: true,
    orderBy: { validFrom: 'asc' }
  });

  console.log('\nDate ranges in database:');
  dates.forEach(d => {
    const status = (d.validFrom <= now && d.validUntil >= now) ? '✓ ACTIVE' : '✗ EXPIRED';
    console.log(`${d.validFrom.toISOString().split('T')[0]} - ${d.validUntil.toISOString().split('T')[0]}: ${d._count} products ${status}`);
  });

  await prisma.$disconnect();
}

check();
