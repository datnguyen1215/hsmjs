#!/usr/bin/env node

/**
 * Test CommonJS Import for @datnguyen1215/hsmjs
 * Tests: const HSM = require('@datnguyen1215/hsmjs')
 */

console.log('=== Testing CommonJS Import ===\n');

async function runTest() {
try {
  // Test 1: Default import
  console.log('1. Testing default import...');
  const HSM = require('./dist/cjs/index.js');
  console.log('✅ Default import successful:', typeof HSM);
  console.log('   Available properties:', Object.keys(HSM).join(', '));

  // Test 2: Destructured import
  console.log('\n2. Testing destructured import...');
  const { createMachine, action } = require('./dist/cjs/index.js');
  console.log('✅ Destructured import successful');
  console.log('   createMachine:', typeof createMachine);
  console.log('   action:', typeof action);

  // Test 3: Create a simple machine to verify functionality
  console.log('\n3. Testing basic functionality...');
  const machine = createMachine('test-machine');
  
  // Use the machine's API to create states
  const idle = machine.state('idle');
  const active = machine.state('active');
  
  // Set initial state and create transition
  machine.initial(idle);
  idle.on('activate', active);
  
  // Start the machine (returns instance)
  const instance = machine.start();
  
  console.log('✅ Basic functionality working');
  console.log('   Machine name:', machine.name);
  console.log('   Current state:', instance.current.id);
  
  // Test 4: Fire transition
  await instance.send('activate');
  console.log('   After transition:', instance.current.id);

  console.log('\n🎉 CommonJS import test PASSED!\n');

} catch (error) {
  console.error('❌ CommonJS import test FAILED:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
}

runTest();