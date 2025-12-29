#!/usr/bin/env node
/**
 * Load Testing Script
 * Testează performanța aplicației sub load
 */

const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  // Target server
  host: process.env.TEST_HOST || 'localhost',
  port: process.env.TEST_PORT || 3000,
  protocol: process.env.TEST_PROTOCOL || 'http',

  // Load test params
  totalRequests: parseInt(process.env.TOTAL_REQUESTS || '1000'),
  concurrency: parseInt(process.env.CONCURRENCY || '50'),

  // Test scenarios
  scenarios: [
    { path: '/', weight: 40 },                    // Homepage
    { path: '/oferte', weight: 25 },              // Offers page
    { path: '/retete', weight: 25 },              // Recipes page
    { path: '/api/products?page=1', weight: 10 }, // API
  ],
};

/**
 * Make HTTP request
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const client = CONFIG.protocol === 'https' ? https : http;

    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path,
      method: 'GET',
      timeout: 10000,
    };

    const startTime = Date.now();

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        resolve({
          path,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;

      resolve({
        path,
        statusCode: 0,
        duration,
        success: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;

      resolve({
        path,
        statusCode: 0,
        duration,
        success: false,
        error: 'Timeout',
      });
    });

    req.end();
  });
}

/**
 * Get random path based on weights
 */
function getRandomPath() {
  const totalWeight = CONFIG.scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;

  for (const scenario of CONFIG.scenarios) {
    random -= scenario.weight;
    if (random <= 0) {
      return scenario.path;
    }
  }

  return CONFIG.scenarios[0].path;
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('🚀 Starting load test...\n');
  console.log(`Target: ${CONFIG.protocol}://${CONFIG.host}:${CONFIG.port}`);
  console.log(`Total Requests: ${CONFIG.totalRequests}`);
  console.log(`Concurrency: ${CONFIG.concurrency}\n`);

  const results = [];
  let completed = 0;
  let inFlight = 0;
  let startTime = Date.now();

  // Progress reporter
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const rps = completed / elapsed;

    process.stdout.write(
      `\rProgress: ${completed}/${CONFIG.totalRequests} | ` +
      `In Flight: ${inFlight} | ` +
      `RPS: ${rps.toFixed(2)}`
    );
  }, 100);

  // Request pool
  const promises = [];

  for (let i = 0; i < CONFIG.totalRequests; i++) {
    // Wait if too many concurrent requests
    while (inFlight >= CONFIG.concurrency) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    inFlight++;

    const path = getRandomPath();
    const promise = makeRequest(path)
      .then((result) => {
        results.push(result);
        completed++;
        inFlight--;
      })
      .catch((error) => {
        console.error('Request failed:', error);
        completed++;
        inFlight--;
      });

    promises.push(promise);
  }

  // Wait for all requests to complete
  await Promise.all(promises);

  clearInterval(progressInterval);
  console.log('\n\n✅ Load test completed!\n');

  // Calculate statistics
  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  const totalDuration = (Date.now() - startTime) / 1000;
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p75 = durations[Math.floor(durations.length * 0.75)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const min = durations[0];
  const max = durations[durations.length - 1];

  // Results
  console.log('📊 Results:');
  console.log('─'.repeat(50));
  console.log(`Total Requests:    ${CONFIG.totalRequests}`);
  console.log(`Successful:        ${successCount} (${((successCount / CONFIG.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed:            ${errorCount} (${((errorCount / CONFIG.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Total Duration:    ${totalDuration.toFixed(2)}s`);
  console.log(`Requests/Second:   ${(CONFIG.totalRequests / totalDuration).toFixed(2)}`);
  console.log('');
  console.log('Response Times (ms):');
  console.log(`  Min:             ${min}ms`);
  console.log(`  Avg:             ${avgDuration.toFixed(2)}ms`);
  console.log(`  p50 (median):    ${p50}ms`);
  console.log(`  p75:             ${p75}ms`);
  console.log(`  p95:             ${p95}ms`);
  console.log(`  p99:             ${p99}ms`);
  console.log(`  Max:             ${max}ms`);
  console.log('');

  // Status code distribution
  const statusCodes = results.reduce((acc, r) => {
    acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
    return acc;
  }, {});

  console.log('Status Codes:');
  Object.entries(statusCodes)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });

  // Check if performance is acceptable
  console.log('\n🎯 Performance Assessment:');
  console.log('─'.repeat(50));

  const checks = [
    { name: 'Success Rate', value: (successCount / CONFIG.totalRequests) * 100, threshold: 99, unit: '%' },
    { name: 'Avg Response', value: avgDuration, threshold: 200, unit: 'ms', reverse: true },
    { name: 'p95 Response', value: p95, threshold: 500, unit: 'ms', reverse: true },
    { name: 'p99 Response', value: p99, threshold: 1000, unit: 'ms', reverse: true },
  ];

  checks.forEach((check) => {
    const passed = check.reverse
      ? check.value < check.threshold
      : check.value > check.threshold;

    const status = passed ? '✅' : '❌';
    console.log(
      `${status} ${check.name}: ${check.value.toFixed(2)}${check.unit} ` +
      `(threshold: ${check.threshold}${check.unit})`
    );
  });

  const allPassed = checks.every((check) =>
    check.reverse
      ? check.value < check.threshold
      : check.value > check.threshold
  );

  console.log('');
  if (allPassed) {
    console.log('✅ All performance checks passed!');
  } else {
    console.log('⚠️  Some performance checks failed. Review results above.');
    process.exit(1);
  }
}

// Run test
runLoadTest().catch((error) => {
  console.error('Load test failed:', error);
  process.exit(1);
});
