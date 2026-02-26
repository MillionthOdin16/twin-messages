#!/usr/bin/env node
/**
 * A2A Bridge API Test Suite
 * 
 * Run with: node test-api.js
 * Or: npm test (after adding to package.json)
 */

const axios = require('axios');

const API_URL = process.env.A2A_API_URL || 'https://a2a-api.bradarr.com';
const TEST_AGENT = 'test-' + Date.now();

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.passed++;
    results.tests.push({ name, status: 'PASS', duration });
    console.log(`✓ ${name} (${duration}ms)`);
  } catch (err) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: err.message });
    console.error(`✗ ${name}: ${err.message}`);
  }
}

async function runTests() {
  console.log(`Testing A2A Bridge API at ${API_URL}\n`);
  
  // Health check
  await test('Health endpoint', async () => {
    const res = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'healthy') throw new Error('Status not healthy');
  });
  
  // Stats endpoint
  await test('Stats endpoint', async () => {
    const res = await axios.get(`${API_URL}/stats`, { timeout: 5000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.messages || !res.data.tasks) throw new Error('Missing data fields');
  });
  
  // Metrics endpoint
  await test('Metrics endpoint', async () => {
    const res = await axios.get(`${API_URL}/metrics`, { timeout: 5000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (typeof res.data.messages_total !== 'number') throw new Error('Missing messages_total');
  });
  
  // Send message
  let messageId;
  await test('Send message', async () => {
    const res = await axios.post(`${API_URL}/messages`, {
      from: 'test-suite',
      to: TEST_AGENT,
      type: 'message',
      content: { text: 'Test message from API test suite' }
    }, { timeout: 5000 });
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.messageId) throw new Error('No messageId returned');
    messageId = res.data.messageId;
  });
  
  // Get messages
  await test('Get messages', async () => {
    const res = await axios.get(`${API_URL}/messages/${TEST_AGENT}`, { timeout: 5000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.messages)) throw new Error('Messages not an array');
  });
  
  // Status endpoint (with timeout check)
  await test('Status endpoint (no hang)', async () => {
    const start = Date.now();
    const res = await axios.get(`${API_URL}/messages/${messageId}/status`, { timeout: 10000 });
    const duration = Date.now() - start;
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (duration > 5000) throw new Error(`Status endpoint too slow: ${duration}ms`);
  });
  
  // Undelivered endpoint
  await test('Undelivered endpoint', async () => {
    const start = Date.now();
    const res = await axios.get(`${API_URL}/messages/${TEST_AGENT}/undelivered`, { timeout: 10000 });
    const duration = Date.now() - start;
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.messages)) throw new Error('Messages not an array');
    if (duration > 3000) throw new Error(`Undelivered endpoint too slow: ${duration}ms`);
  });
  
  // Delivery receipt
  await test('Delivery receipt', async () => {
    const res = await axios.post(`${API_URL}/messages/${messageId}/receipt`, {
      agentId: TEST_AGENT,
      status: 'read'
    }, { timeout: 5000 });
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Receipt not successful');
  });
  
  // Verify receipt saved
  await test('Verify receipt saved', async () => {
    const res = await axios.get(`${API_URL}/messages/${messageId}/status`, { timeout: 5000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    
    const hasReceipt = res.data.receipts && res.data.receipts[TEST_AGENT];
    if (!hasReceipt) throw new Error('Receipt not found');
    if (res.data.receipts[TEST_AGENT].status !== 'read') throw new Error('Status not read');
  });
  
  // Agents endpoint
  await test('Agents endpoint', async () => {
    const res = await axios.get(`${API_URL}/agents`, { timeout: 5000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.webhooks || !Array.isArray(res.data.webhooks)) throw new Error('Webhooks not an array');
  });
  
  // Version endpoint
  await test('Version endpoint', async () => {
    const res = await axios.get(`${API_URL}/version`, { timeout: 5000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.version) throw new Error('Version not returned');
    if (!res.data.features || !Array.isArray(res.data.features)) throw new Error('Features not returned');
  });
  
  // Note: Cleanup endpoint not implemented in current version
  // Would require DELETE /messages/:agentId endpoint
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${results.passed} passed, ${results.failed} failed`);
  console.log('='.repeat(50));
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
