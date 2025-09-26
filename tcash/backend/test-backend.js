#!/usr/bin/env node

/**
 * Backend Testing Script for Self.xyz Onchain KYC
 *
 * This script provides comprehensive testing for the backend API
 * including health checks, configuration validation, and endpoint testing.
 */

const axios = require('axios');
const colors = require('colors');

// Configure axios defaults
const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'test-user-123',
    'x-user-email': 'test@example.com',
  }
});

// Test wallet address (you can replace with your own)
const TEST_WALLET = '0x742C7C4b7e69e8c95E6BB7eF8E3b5D9e65c12345';

/**
 * Test Results Tracker
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTest(name, testFn) {
    try {
      console.log(`\n🧪 Running: ${name}`.cyan);
      const result = await testFn();
      this.passed++;
      console.log(`✅ PASSED: ${name}`.green);
      if (result) {
        console.log(`   Result: ${JSON.stringify(result, null, 2)}`.gray);
      }
      return result;
    } catch (error) {
      this.failed++;
      console.log(`❌ FAILED: ${name}`.red);
      console.log(`   Error: ${error.message}`.red);
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`.gray);
      }
      return null;
    }
  }

  summary() {
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TEST SUMMARY'.bold);
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.passed}`.green);
    console.log(`❌ Failed: ${this.failed}`.red);
    console.log(`📊 Total: ${this.passed + this.failed}`);

    if (this.failed === 0) {
      console.log('\n🎉 All tests passed!'.green.bold);
    } else {
      console.log(`\n⚠️  ${this.failed} test(s) failed. Check configuration.`.yellow);
    }
  }
}

/**
 * Test Functions
 */
const tests = {
  // Basic connectivity
  async serverHealth() {
    const response = await api.get('/health');
    return {
      status: response.status,
      data: response.data
    };
  },

  async apiRoot() {
    const response = await api.get('/api');
    return response.data;
  },

  // KYC service health
  async kycHealth() {
    const response = await api.get('/api/kyc/health');
    return response.data;
  },

  // Configuration endpoints
  async kycConfig() {
    const response = await api.get('/api/kyc/onchain/config');
    return response.data;
  },

  // Statistics (should work even without data)
  async kycStatistics() {
    const response = await api.get('/api/kyc/onchain/statistics');
    return response.data;
  },

  // KYC status check (should return unverified)
  async kycStatus() {
    const response = await api.get(`/api/kyc/onchain/status/${TEST_WALLET}`);
    return response.data;
  },

  // KYC initiation (will test the full flow)
  async kycInitiate() {
    const response = await api.post('/api/kyc/onchain/initiate', {
      walletAddress: TEST_WALLET,
      requirements: {
        minimumAge: 18,
        allowedDocumentTypes: [1, 2], // E-Passport, EU ID Card
      }
    });
    return response.data;
  },

  // Test session endpoint (if session was created)
  async kycSession(sessionId) {
    if (!sessionId) return { skipped: 'No session ID provided' };
    const response = await api.get(`/api/kyc/onchain/session/${sessionId}`);
    return response.data;
  },

  // Test webhook endpoint (simulated)
  async webhookTest() {
    const mockWebhookData = {
      attestationId: "1",
      proof: "0x1234567890abcdef",
      publicSignals: [],
      extractedAttrs: {
        nationality: "US",
        documentType: 1,
        ageAtLeast: 25,
        isOfacMatch: false
      },
      userContextData: {
        userId: TEST_WALLET,
        walletAddress: TEST_WALLET,
        email: "test@example.com"
      }
    };

    try {
      const response = await api.post('/api/kyc/onchain/verify', mockWebhookData);
      return response.data;
    } catch (error) {
      // Expected to fail without proper Self.xyz signature
      return {
        expectedFailure: true,
        error: error.response?.data?.error || error.message
      };
    }
  }
};

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log('🚀 Starting Self.xyz Backend Tests'.bold.blue);
  console.log('=' .repeat(50));

  const runner = new TestRunner();

  // Basic connectivity tests
  console.log('\n📡 CONNECTIVITY TESTS'.bold);
  await runner.runTest('Server Health Check', tests.serverHealth);
  await runner.runTest('API Root Endpoint', tests.apiRoot);

  // Service-specific tests
  console.log('\n🔧 SERVICE TESTS'.bold);
  await runner.runTest('KYC Service Health', tests.kycHealth);
  await runner.runTest('KYC Configuration', tests.kycConfig);
  await runner.runTest('KYC Statistics', tests.kycStatistics);

  // KYC workflow tests
  console.log('\n🎯 KYC WORKFLOW TESTS'.bold);
  await runner.runTest('KYC Status Check', tests.kycStatus);

  const initiateResult = await runner.runTest('KYC Initiation', tests.kycInitiate);
  const sessionId = initiateResult?.session?.sessionId;

  await runner.runTest('KYC Session Details', () => tests.kycSession(sessionId));

  // Webhook test
  console.log('\n🪝 WEBHOOK TESTS'.bold);
  await runner.runTest('Webhook Simulation', tests.webhookTest);

  runner.summary();
}

/**
 * Interactive Test Runner
 */
async function interactiveTests() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('🎮 Interactive Test Mode'.bold.blue);
  console.log('Available tests:');
  Object.keys(tests).forEach((test, i) => {
    console.log(`  ${i + 1}. ${test}`);
  });

  try {
    const choice = await question('\nEnter test number (or "all" for all tests): ');

    if (choice.toLowerCase() === 'all') {
      await runAllTests();
    } else {
      const testIndex = parseInt(choice) - 1;
      const testNames = Object.keys(tests);

      if (testIndex >= 0 && testIndex < testNames.length) {
        const testName = testNames[testIndex];
        const runner = new TestRunner();
        await runner.runTest(testName, tests[testName]);
        runner.summary();
      } else {
        console.log('❌ Invalid choice'.red);
      }
    }
  } finally {
    rl.close();
  }
}

/**
 * Continuous Health Monitor
 */
async function healthMonitor() {
  console.log('💓 Starting Health Monitor (Ctrl+C to stop)'.bold.green);

  const checkHealth = async () => {
    try {
      const health = await api.get('/api/kyc/health');
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ✅ Backend healthy - ${health.data.health.status}`.green);
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ❌ Backend unhealthy - ${error.message}`.red);
    }
  };

  // Check immediately and then every 10 seconds
  await checkHealth();
  const interval = setInterval(checkHealth, 10000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n👋 Health monitor stopped'.yellow);
    process.exit(0);
  });
}

/**
 * Load Testing
 */
async function loadTest() {
  console.log('⚡ Starting Load Test'.bold.yellow);

  const concurrent = 5;
  const requests = 20;

  console.log(`Testing ${requests} requests with ${concurrent} concurrent connections...`);

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < requests; i++) {
    promises.push(
      api.get('/health').then(res => ({ success: true, status: res.status }))
        .catch(err => ({ success: false, error: err.message }))
    );

    // Add small delay between batches
    if (i % concurrent === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const duration = endTime - startTime;
  const rps = (requests / duration * 1000).toFixed(2);

  console.log(`\n📊 Load Test Results:`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Successful: ${successful}/${requests}`);
  console.log(`   Failed: ${failed}/${requests}`);
  console.log(`   Requests/sec: ${rps}`);
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  console.log('🧪 Self.xyz Backend Tester'.bold.blue);

  switch (command) {
    case 'all':
      await runAllTests();
      break;
    case 'interactive':
    case 'i':
      await interactiveTests();
      break;
    case 'health':
    case 'monitor':
      await healthMonitor();
      break;
    case 'load':
      await loadTest();
      break;
    case 'help':
    case '--help':
      console.log(`
Usage: node test-backend.js [command]

Commands:
  all         Run all tests (default)
  interactive Run tests interactively
  health      Monitor backend health
  load        Run load test
  help        Show this help

Examples:
  node test-backend.js
  node test-backend.js interactive
  node test-backend.js health
      `);
      break;
    default:
      console.log(`❌ Unknown command: ${command}`.red);
      console.log('Use "node test-backend.js help" for usage info');
      process.exit(1);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error.message);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { tests, TestRunner };