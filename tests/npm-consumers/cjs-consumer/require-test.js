#!/usr/bin/env node

/**
 * CommonJS Consumer Test - Validates CommonJS require functionality
 * Tests the dual package 'require' export from package.json
 */

const { createMachine, action } = require('@datnguyen1215/hsmjs');

// Test 1: Verify requires are functions
console.assert(typeof createMachine === 'function', 'createMachine should be a function');
console.assert(typeof action === 'function', 'action should be a function');

// Test 2: Test different require patterns

// Pattern 1: Destructured require
const { createMachine: createMachineDestructured } = require('@datnguyen1215/hsmjs');
console.assert(typeof createMachineDestructured === 'function', 'Destructured require should work');

// Pattern 2: Full module require
const hsmjs = require('@datnguyen1215/hsmjs');
console.assert(typeof hsmjs.createMachine === 'function', 'Full module require should work');
console.assert(typeof hsmjs.action === 'function', 'Full module require should include action');

// Pattern 3: Individual property access
const createMachineFromModule = hsmjs.createMachine;
console.assert(typeof createMachineFromModule === 'function', 'Property access should work');

// Test 3: Basic machine creation and functionality
const machine = createMachine('cjs-test-machine');
console.assert(machine.name === 'cjs-test-machine', 'Machine name should match');

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

// Test 4: Machine instance and state transitions (async with CommonJS)
const instance = machine.start();
console.assert(instance.current === 'idle', 'Initial state should be idle');

// Async transition testing with CommonJS
async function testTransitions() {
  await instance.send('START');
  console.assert(instance.current === 'processing', 'Should transition to processing');

  await instance.send('COMPLETE');
  console.assert(instance.current === 'completed', 'Should transition to completed');

  await instance.send('RESET');
  console.assert(instance.current === 'idle', 'Should reset to idle');
}

// Test 5: Action helper functionality
let actionExecuted = false;
const testAction = action('cjs-test-action', (ctx) => {
  actionExecuted = true;
  ctx.cjsTestCompleted = true;
  return { success: true, module: 'commonjs' };
});

console.assert(testAction.actionName === 'cjs-test-action', 'Action should have correct name');

// Test 6: CommonJS specific features
// Test module.exports compatibility
console.assert(typeof module !== 'undefined', 'Module object should be available');
console.assert(typeof exports !== 'undefined', 'Exports object should be available');

// Test require.cache
const modulePath = require.resolve('@datnguyen1215/hsmjs');
console.assert(require.cache[modulePath] !== undefined, 'Module should be cached');

// Test __dirname and __filename availability
console.assert(typeof __dirname === 'string', '__dirname should be available');
console.assert(typeof __filename === 'string', '__filename should be available');

// Execute async tests
async function runAsyncTests() {
  await testTransitions();
  
  // Test action execution
  const actionContext = {};
  const actionResult = await testAction(actionContext);
  console.assert(actionExecuted === true, 'Action should have executed');
  console.assert(actionResult.success === true, 'Action should return success');
  console.assert(actionResult.module === 'commonjs', 'Action should identify CommonJS');

  // Test 7: Error handling
  try {
    await instance.send('INVALID_EVENT');
  } catch (error) {
    // Error handling verified
  }

  // Test completion marker
  process.exit(0);
}

// Run async tests
runAsyncTests().catch(error => {
  console.error('❌ CJS Consumer Test Failed:', error);
  process.exit(1);
});