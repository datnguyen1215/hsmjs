/**
 * Test ES6 (ESM) import compatibility
 */

import { createMachine, action } from '../../dist/es/index.js';

console.log('Testing ES6 imports...');

// Test that imports work
console.assert(typeof createMachine === 'function', 'createMachine should be a function');
console.assert(typeof action === 'function', 'action should be a function');

// Test basic functionality
const machine = createMachine('test');
console.assert(machine.name === 'test', 'Machine name should be "test"');

const idle = machine.state('idle');
const active = machine.state('active');

idle.on('ACTIVATE', active);
machine.initial(idle);

const instance = machine.start();
console.assert(instance.current === 'idle', 'Initial state should be "idle"');

// Test async functionality
await instance.send('ACTIVATE');
console.assert(instance.current === 'active', 'State should be "active" after transition');

// Test action helper
const namedAction = action('test', (ctx) => {
  ctx.tested = true;
});
console.assert(namedAction.actionName === 'test', 'Action should have correct name');

// Test that named exports work correctly
console.assert(createMachine !== undefined, 'createMachine should be exported');
console.assert(action !== undefined, 'action should be exported');

console.log('✓ ES6 import tests passed!');