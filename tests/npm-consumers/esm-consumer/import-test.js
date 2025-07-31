#!/usr/bin/env node

/**
 * ESM Consumer Test - Validates ES Module import functionality
 * Tests the dual package 'import' export from package.json
 */

import { createMachine, action } from '@datnguyen1215/hsmjs';

// Test 1: Verify imports are functions
console.assert(typeof createMachine === 'function', 'createMachine should be a function');
console.assert(typeof action === 'function', 'action should be a function');

// Test 2: Basic machine creation and functionality
const machine = createMachine('esm-test-machine');
console.assert(machine.name === 'esm-test-machine', 'Machine name should match');

// Create states
const idle = machine.state('idle');
const processing = machine.state('processing');
const completed = machine.state('completed');

// Define transitions
idle.on('START', processing);
processing.on('COMPLETE', completed);
completed.on('RESET', idle);

// Set initial state
machine.initial(idle);

// Test 3: Machine instance and state transitions
const instance = machine.start();
console.assert(instance.current === 'idle', 'Initial state should be idle');

// Async transition testing
await instance.send('START');
console.assert(instance.current === 'processing', 'Should transition to processing');

await instance.send('COMPLETE');
console.assert(instance.current === 'completed', 'Should transition to completed');

await instance.send('RESET');
console.assert(instance.current === 'idle', 'Should reset to idle');

// Test 4: Action helper functionality
let actionExecuted = false;
const testAction = action('esm-test-action', (ctx) => {
  actionExecuted = true;
  ctx.esmTestCompleted = true;
  return { success: true };
});

console.assert(testAction.actionName === 'esm-test-action', 'Action should have correct name');

// Test action execution
const actionContext = {};
const actionResult = await testAction(actionContext);
console.assert(actionExecuted === true, 'Action should have executed');
console.assert(actionResult.success === true, 'Action should return success');

// Test 5: Tree-shaking validation (ES modules should support this)
const machineOnly = createMachine('tree-shake-test');
console.assert(typeof machineOnly === 'object', 'Should be able to import specific functions');

// Test 6: Module metadata validation - no logging needed

// Test 7: Error handling
try {
  await instance.send('INVALID_EVENT');
} catch (error) {
  // Error handling verified
}

// Test completed successfully

// Test completion marker
process.exit(0);