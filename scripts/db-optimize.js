#!/usr/bin/env node
/**
 * Database Optimization Script
 * Rulează ANALYZE TABLE și verifică performanța bazei de date
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function optimizeDatabase() {
  console.log('🔧 Starting database optimization...\n');

  try {
    // 1. Analyze tables
    console.log('📊 Analyzing tables...');
    const tables = ['products', 'catalogs', 'recipes', 'weekly_menus', 'cache', 'users'];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ANALYZE TABLE ${table}`);
        console.log(`✅ ${table} - analyzed`);
      } catch (error) {
        console.error(`❌ ${table} - failed:`, error.message);
      }
    }

    // 2. Check table sizes
    console.log('\n📦 Table sizes:');
    const sizes = await prisma.$queryRaw`
      SELECT
        table_name AS tableName,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS sizeMB,
        table_rows AS rowCount,
        ROUND((index_length / 1024 / 1024), 2) AS indexSizeMB
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `;

    console.table(sizes);

    // 3. Check cache hit ratio
    console.log('\n💾 InnoDB Buffer Pool Stats:');
    try {
      const stats = await prisma.$queryRaw`
        SHOW GLOBAL STATUS WHERE
          Variable_name IN (
            'Innodb_buffer_pool_read_requests',
            'Innodb_buffer_pool_reads'
          )
      `;

      const readRequests = stats.find(s => s.Variable_name === 'Innodb_buffer_pool_read_requests')?.Value || 0;
      const reads = stats.find(s => s.Variable_name === 'Innodb_buffer_pool_reads')?.Value || 0;

      const hitRatio = readRequests > 0
        ? ((readRequests - reads) / readRequests) * 100
        : 0;

      console.log(`  Read Requests: ${readRequests.toLocaleString()}`);
      console.log(`  Disk Reads: ${reads.toLocaleString()}`);
      console.log(`  Hit Ratio: ${hitRatio.toFixed(2)}%`);

      if (hitRatio < 95) {
        console.log('  ⚠️  Hit ratio is low! Consider increasing innodb_buffer_pool_size');
      } else {
        console.log('  ✅ Hit ratio is good!');
      }
    } catch (error) {
      console.log('  ⚠️  Could not retrieve buffer pool stats');
    }

    // 4. Check for unused indexes
    console.log('\n🔍 Checking for unused indexes...');
    try {
      const unusedIndexes = await prisma.$queryRaw`
        SELECT
          object_schema as dbName,
          object_name as tableName,
          index_name as indexName
        FROM performance_schema.table_io_waits_summary_by_index_usage
        WHERE index_name IS NOT NULL
        AND count_star = 0
        AND object_schema = DATABASE()
        AND index_name != 'PRIMARY'
        ORDER BY object_name, index_name
      `;

      if (unusedIndexes.length > 0) {
        console.log('  ⚠️  Found potentially unused indexes:');
        console.table(unusedIndexes);
      } else {
        console.log('  ✅ All indexes are being used!');
      }
    } catch (error) {
      console.log('  ⚠️  Could not check unused indexes');
    }

    // 5. Clean expired cache entries
    console.log('\n🗑️  Cleaning expired cache...');
    const deletedCache = await prisma.cache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    console.log(`  ✅ Deleted ${deletedCache.count} expired cache entries`);

    // 6. Clean old products (older than 30 days)
    console.log('\n🗑️  Cleaning old products...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedProducts = await prisma.product.deleteMany({
      where: {
        validUntil: {
          lt: thirtyDaysAgo,
        },
      },
    });
    console.log(`  ✅ Deleted ${deletedProducts.count} old products`);

    console.log('\n✅ Database optimization completed!');
  } catch (error) {
    console.error('\n❌ Optimization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run optimization
optimizeDatabase();
