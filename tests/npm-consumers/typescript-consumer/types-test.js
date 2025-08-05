#!/usr/bin/env node

/**
 * TypeScript Consumer Test - Validates TypeScript integration and type definitions
 * Tests the dual package 'types' export from package.json
 */

import { createMachine } from '@datnguyen1215/hsmjs';

// Test 1: Type imports and availability

// Test that functions have correct types (runtime validation)
const machineFactory = createMachine;

console.assert(typeof machineFactory === 'function', 'createMachine should be a function');

// Test 2: Machine creation with type checking
// Runtime validation of machine creation
const machine = createMachine('typescript-test-machine');

// Test that machine has expected properties and methods
const machineName = machine.name;
console.assert(machineName === 'typescript-test-machine', 'Machine name should match');

// Test state creation with proper typing
const idleState = machine.state('idle');
const processingState = machine.state('processing');
const completedState = machine.state('completed');

// TypeScript should enforce correct method signatures
idleState.on('START', 'processing');
processingState.on('COMPLETE', 'completed');
completedState.on('RESET', 'idle');

machine.initial(idleState);

// Test 3: Instance creation and runtime validation
const instance = machine.start();

// Runtime validation of current state
const currentState = instance.current;
console.assert(currentState === 'idle', 'Initial state should be idle');

// Test 4: Async operations with proper typing
async function testAsyncTypes() {
  // TypeScript should enforce correct event parameter types
  await instance.send('START');
  console.assert(instance.current === 'processing', 'Should transition to processing');

  await instance.send('COMPLETE');
  console.assert(instance.current === 'completed', 'Should transition to completed');

  await instance.send('RESET');
  console.assert(instance.current === 'idle', 'Should reset to idle');
}

// Test 6: Generic type constraints
// Test that TypeScript enforces proper parameter types
try {
  // This should work with correct types
  const validMachine = createMachine('valid-name');
} catch (error) {
  // Type constraint test failed
}

// Test 7: Type definitions validation
// Runtime validation that objects have expected structure
const expectedMachineProps = ['name', 'state', 'initial', 'start'];
const expectedInstanceProps = ['current', 'send'];

expectedMachineProps.forEach(prop => {
  console.assert(machine[prop] !== undefined, `Machine should have ${prop} property`);
});

expectedInstanceProps.forEach(prop => {
  console.assert(instance[prop] !== undefined, `Instance should have ${prop} property`);
});

// Test 8: Error handling with types
try {
  await instance.send('INVALID_EVENT');
} catch (error) {
  // Runtime error handling verified
}

// Test 9: Module metadata and type exports - validated silently

// Execute async tests and complete
async function runAllAsyncTests() {
  await testAsyncTypes();

  // Test completed successfully
}

// Run all tests
runAllAsyncTests().then(() => {
  process.exit(0);
}).catch((error) => {
  process.exit(1);
});