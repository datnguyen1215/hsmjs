/**
 * CommonJS Integration Test for HSMJS
 * Tests that the CommonJS build can be imported and used correctly
 */

const { createMachine, assign } = require('hsmjs');

console.log('Starting CommonJS integration test...');

// Test 1: Basic machine creation
console.log('Test 1: Basic machine creation');
try {
  const machine = createMachine({
    id: 'test',
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: 'running'
        }
      },
      running: {
        on: {
          STOP: 'idle'
        }
      }
    }
  });

  if (machine && typeof machine.send === 'function') {
    console.log('✓ Machine created successfully');
  } else {
    throw new Error('Machine creation failed - invalid machine object');
  }
} catch (error) {
  console.error('✗ Test 1 failed:', error.message);
  process.exit(1);
}

// Test 2: State transitions
console.log('Test 2: State transitions');
try {
  const machine = createMachine({
    id: 'transition-test',
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: 'running'
        }
      },
      running: {
        on: {
          STOP: 'idle'
        }
      }
    }
  });

  if (machine.state !== 'idle') {
    throw new Error(`Expected initial state 'idle', got '${machine.state}'`);
  }

  // Send START event
  machine.send('START');
  if (machine.state !== 'running') {
    throw new Error(`Expected state 'running' after START, got '${machine.state}'`);
  }

  // Send STOP event
  machine.send('STOP');
  if (machine.state !== 'idle') {
    throw new Error(`Expected state 'idle' after STOP, got '${machine.state}'`);
  }

  console.log('✓ State transitions working correctly');
} catch (error) {
  console.error('✗ Test 2 failed:', error.message);
  process.exit(1);
}

// Test 3: Context and assign function
console.log('Test 3: Context and assign function');
try {
  const machine = createMachine({
    id: 'context-test',
    initial: 'idle',
    context: { count: 0 },
    states: {
      idle: {
        on: {
          INCREMENT: {
            actions: [
              assign(ctx => ({ count: ctx.count + 1 }))
            ]
          }
        }
      }
    }
  });

  if (machine.context.count !== 0) {
    throw new Error(`Expected initial count 0, got ${machine.context.count}`);
  }

  machine.send('INCREMENT');
  if (machine.context.count !== 1) {
    throw new Error(`Expected count 1 after increment, got ${machine.context.count}`);
  }

  console.log('✓ Context and assign function working correctly');
} catch (error) {
  console.error('✗ Test 3 failed:', error.message);
  process.exit(1);
}

// Test 4: Module exports check
console.log('Test 4: Module exports check');
try {
  const hsmjs = require('hsmjs');

  if (typeof hsmjs.createMachine !== 'function') {
    throw new Error('createMachine export missing or invalid');
  }

  if (typeof hsmjs.assign !== 'function') {
    throw new Error('assign export missing or invalid');
  }

  console.log('✓ Module exports are correct');
} catch (error) {
  console.error('✗ Test 4 failed:', error.message);
  process.exit(1);
}

console.log('All CommonJS integration tests passed! ✓');