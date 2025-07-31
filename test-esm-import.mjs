#!/usr/bin/env node

/**
 * Test ESM Import for @datnguyen1215/hsmjs
 * Tests: import HSM from '@datnguyen1215/hsmjs'
 */

console.log('=== Testing ESM Import ===\n');

try {
  // Test 1: Default import
  console.log('1. Testing default ESM import...');
  const HSM = await import('./dist/esm/index.js');
  console.log('✅ Default ESM import successful:', typeof HSM.default);
  console.log('   Available exports:', Object.keys(HSM).join(', '));

  // Test 2: Named imports
  console.log('\n2. Testing named ESM imports...');
  const { createMachine, action } = HSM;
  console.log('✅ Named imports successful');
  console.log('   createMachine:', typeof createMachine);
  console.log('   action:', typeof action);

  // Test 3: Direct named import syntax (simulation)
  console.log('\n3. Testing direct named import...');
  const module = await import('./dist/esm/index.js');
  const { 
    createMachine: createMachineNamed, 
    action: actionNamed
  } = module;
  console.log('✅ Direct named import successful');
  console.log('   createMachine:', typeof createMachineNamed);
  console.log('   action:', typeof actionNamed);

  // Test 4: Create a simple machine to verify functionality  
  console.log('\n4. Testing basic functionality...');
  const machine = createMachine('test-esm-machine');
  
  // Use machine API to create states
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
  
  // Test 5: Fire transition
  await instance.send('activate');
  console.log('   After transition:', instance.current.id);

  console.log('\n🎉 ESM import test PASSED!\n');

} catch (error) {
  console.error('❌ ESM import test FAILED:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}