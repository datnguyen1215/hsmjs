/**
 * ES6 Module Integration Test for HSMJS
 * Tests that the ES6 module build can be imported and used correctly
 */

import { createMachine, assign } from '@datnguyen1215/hsmjs';

console.log('Starting ES6 module integration test...');

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
              assign(({ context }) => ({ count: context.count + 1 }))
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

// Test 4: Module imports check
console.log('Test 4: Module imports check');
try {
  if (typeof createMachine !== 'function') {
    throw new Error('createMachine import missing or invalid');
  }

  if (typeof assign !== 'function') {
    throw new Error('assign import missing or invalid');
  }

  console.log('✓ Module imports are correct');
} catch (error) {
  console.error('✗ Test 4 failed:', error.message);
  process.exit(1);
}

// Test 5: Dynamic import test
console.log('Test 5: Dynamic import test');
try {
  const hsmjs = await import('@datnguyen1215/hsmjs');

  if (typeof hsmjs.createMachine !== 'function') {
    throw new Error('createMachine export missing or invalid in dynamic import');
  }

  if (typeof hsmjs.assign !== 'function') {
    throw new Error('assign export missing or invalid in dynamic import');
  }

  console.log('✓ Dynamic imports work correctly');
} catch (error) {
  console.error('✗ Test 5 failed:', error.message);
  process.exit(1);
}

// Test 6: Comprehensive action tests
console.log('Test 6: Comprehensive action tests');
try {
  const machine = createMachine({
    id: 'action-test',
    initial: 'idle',
    context: {
      count: 0,
      results: []
    },
    states: {
      idle: {
        on: {
          START: {
            target: 'working',
            actions: [
              // Test simple assign
              assign({ count: 1 }),
              // Test computed assign with context and event
              assign(({ context, event }) => ({
                results: [...context.results, `Started: ${event.payload || 'default'}`]
              })),
              // Test action that returns a value
              ({ context, event }) => {
                return `Action result: ${context.count}`;
              },
              // Test async action
              async ({ context, event }) => {
                return new Promise(resolve => {
                  setTimeout(() => resolve('async result'), 10);
                });
              }
            ]
          }
        }
      },
      working: {
        entry: [
          // Test entry action
          ({ context }) => console.log('Entered working state'),
          assign(({ context }) => ({ count: context.count + 10 }))
        ],
        exit: [
          // Test exit action
          ({ context }) => console.log('Exiting working state'),
          assign({ count: 0 })
        ],
        on: {
          FINISH: 'completed'
        }
      },
      completed: {
        entry: [
          assign(({ context }) => ({
            results: [...context.results, 'Completed!']
          }))
        ]
      }
    }
  });

  // Test initial state and context
  if (machine.state !== 'idle' || machine.context.count !== 0) {
    throw new Error('Initial state or context incorrect');
  }

  // Test transition with actions and get results
  const result = machine.send('START', { payload: 'test-payload' });

  // Wait for async actions to complete by checking state
  let timeoutCount = 0;
  const checkResult = () => {
    if (machine.state !== 'working' && timeoutCount < 10) {
      timeoutCount++;
      setTimeout(checkResult, 5);
      return;
    }

    if (machine.state !== 'working') {
      throw new Error(`Expected state 'working', got '${machine.state}'`);
    }

    if (machine.context.count !== 11) { // 1 from assign + 10 from entry
      throw new Error(`Expected count 11, got ${machine.context.count}`);
    }

    if (!machine.context.results.includes('Started: test-payload')) {
      throw new Error('Action with event payload failed');
    }

    // Test exit actions
    machine.send('FINISH');

    if (machine.state !== 'completed') {
      throw new Error(`Expected state 'completed', got '${machine.state}'`);
    }

    if (machine.context.count !== 0) { // Should be reset by exit action
      throw new Error(`Expected count 0 after exit action, got ${machine.context.count}`);
    }

    if (!machine.context.results.includes('Completed!')) {
      throw new Error('Entry action on completed state failed');
    }

    console.log('✓ Comprehensive action tests working correctly');

    console.log('All ES6 module integration tests passed! ✓');
  };

  checkResult();
} catch (error) {
  console.error('✗ Test 6 failed:', error.message);
  process.exit(1);
}