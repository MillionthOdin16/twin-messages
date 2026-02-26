#!/usr/bin/env node
/**
 * A2A Bridge Performance Benchmark
 * 
 * Run with: node benchmark.js
 */

const axios = require('axios');

const API_URL = process.env.A2A_API_URL || 'https://a2a-api.bradarr.com';
const TEST_AGENT = 'benchmark-' + Date.now();

// Benchmark configuration
const CONFIG = {
  statusEndpoint: {
    iterations: 50,
    concurrency: 5
  },
  messageSend: {
    iterations: 30,
    concurrency: 3
  },
  undelivered: {
    iterations: 20,
    concurrency: 2
  }
};

// Results storage
const results = {
  statusEndpoint: [],
  messageSend: [],
  undelivered: [],
  summary: {}
};

async function benchmark(name, fn, iterations, concurrency) {
  console.log(`\nBenchmarking: ${name}`);
  console.log(`Iterations: ${iterations}, Concurrency: ${concurrency}`);
  console.log('-'.repeat(50));
  
  const times = [];
  const errors = [];
  
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && i + j < iterations; j++) {
      batch.push(
        (async () => {
          const start = Date.now();
          try {
            await fn();
            times.push(Date.now() - start);
          } catch (err) {
            errors.push(err.message);
            times.push(Date.now() - start);
          }
        })()
      );
    }
    await Promise.all(batch);
    process.stdout.write('.');
  }
  
  console.log(' Done!\n');
  
  // Calculate statistics
  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  
  const stats = {
    iterations: times.length,
    errors: errors.length,
    min: times[0],
    max: times[times.length - 1],
    mean: Math.round(sum / times.length),
    p50: times[Math.floor(times.length * 0.5)],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)]
  };
  
  console.log(`  Min: ${stats.min}ms`);
  console.log(`  Max: ${stats.max}ms`);
  console.log(`  Mean: ${stats.mean}ms`);
  console.log(`  P50: ${stats.p50}ms`);
  console.log(`  P95: ${stats.p95}ms`);
  console.log(`  P99: ${stats.p99}ms`);
  console.log(`  Errors: ${stats.errors}/${stats.iterations}`);
  
  return stats;
}

async function runBenchmarks() {
  console.log('='.repeat(60));
  console.log('A2A Bridge Performance Benchmark');
  console.log(`Target: ${API_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  // First, send some test messages
  console.log('\nSending test messages...');
  const messageIds = [];
  for (let i = 0; i < 10; i++) {
    const res = await axios.post(`${API_URL}/messages`, {
      from: 'benchmark',
      to: TEST_AGENT,
      content: { text: `Benchmark test message ${i}` }
    });
    messageIds.push(res.data.messageId);
  }
  console.log(`Created ${messageIds.length} test messages`);
  
  // Benchmark 1: Status endpoint
  results.statusEndpoint = await benchmark(
    'GET /messages/:id/status',
    async () => {
      const messageId = messageIds[Math.floor(Math.random() * messageIds.length)];
      await axios.get(`${API_URL}/messages/${messageId}/status`, { timeout: 10000 });
    },
    CONFIG.statusEndpoint.iterations,
    CONFIG.statusEndpoint.concurrency
  );
  
  // Benchmark 2: Message send
  results.messageSend = await benchmark(
    'POST /messages',
    async () => {
      await axios.post(`${API_URL}/messages`, {
        from: 'benchmark',
        to: TEST_AGENT,
        content: { text: 'Benchmark message' }
      }, { timeout: 10000 });
    },
    CONFIG.messageSend.iterations,
    CONFIG.messageSend.concurrency
  );
  
  // Benchmark 3: Undelivered
  results.undelivered = await benchmark(
    'GET /messages/:agentId/undelivered',
    async () => {
      await axios.get(`${API_URL}/messages/${TEST_AGENT}/undelivered`, { timeout: 10000 });
    },
    CONFIG.undelivered.iterations,
    CONFIG.undelivered.concurrency
  );
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK SUMMARY');
  console.log('='.repeat(60));
  
  const allStats = [
    { name: 'Status Endpoint', stats: results.statusEndpoint },
    { name: 'Message Send', stats: results.messageSend },
    { name: 'Undelivered', stats: results.undelivered }
  ];
  
  allStats.forEach(({ name, stats }) => {
    console.log(`\n${name}:`);
    console.log(`  Mean: ${stats.mean}ms | P95: ${stats.p95}ms | Errors: ${stats.errors}/${stats.iterations}`);
    
    // Performance rating
    if (stats.mean < 50) {
      console.log('  Rating: ✅ Excellent');
    } else if (stats.mean < 100) {
      console.log('  Rating: ✅ Good');
    } else if (stats.mean < 500) {
      console.log('  Rating: ⚠️ Acceptable');
    } else {
      console.log('  Rating: ❌ Needs improvement');
    }
  });
  
  // Overall rating
  console.log('\n' + '-'.repeat(60));
  const overallMean = Math.round(
    (results.statusEndpoint.mean + results.messageSend.mean + results.undelivered.mean) / 3
  );
  console.log(`Overall Mean Response Time: ${overallMean}ms`);
  
  if (overallMean < 50) {
    console.log('Overall Rating: ✅ EXCELLENT');
  } else if (overallMean < 100) {
    console.log('Overall Rating: ✅ GOOD');
  } else if (overallMean < 200) {
    console.log('Overall Rating: ⚠️ ACCEPTABLE');
  } else {
    console.log('Overall Rating: ❌ NEEDS IMPROVEMENT');
  }
  
  console.log('='.repeat(60));
}

runBenchmarks().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
