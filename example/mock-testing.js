import { createMachine, assign } from '../src/index.js';

// Mock testing helper
const createMockMachine = (states, initialState = Object.keys(states)[0]) => {
  let currentState = initialState;
  let context = {};
  const subscribers = new Set();

  return {
    get state() { return currentState; },
    get context() { return context; },

    send: (event, payload) => {
      const stateConfig = states[currentState];
      const handler = stateConfig?.on?.[event];

      if (handler) {
        if (typeof handler === 'string') {
          currentState = handler;
        } else if (handler.target) {
          currentState = handler.target;
          if (handler.actions) {
            // Simulate context updates
            handler.actions.forEach(action => {
              if (action.assign) {
                Object.assign(context, action.assign);
              }
            });
          }
        }

        // Notify subscribers
        subscribers.forEach(callback => callback(currentState, context));
      }

      return Promise.resolve({ state: currentState, context });
    },

    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    matches: (state) => currentState === state
  };
};

// Mock test functions
const test = (name, fn) => {
  console.log(`\nTest: ${name}`);
  return fn();
};

const expect = (actual) => ({
  toBe: (expected) => {
    if (actual === expected) {
      console.log(`✓ Expected ${expected}, got ${actual}`);
    } else {
      console.log(`✗ Expected ${expected}, got ${actual}`);
      throw new Error(`Expected ${expected}, got ${actual}`);
    }
  }
});

const runExample = async () => {
  console.log('Mock Testing Helper Example:');

  await test('mock machine behavior', async () => {
    const mockMachine = createMockMachine({
      idle: { on: { START: 'loading' } },
      loading: { on: { SUCCESS: 'success', ERROR: 'error' } },
      success: {},
      error: { on: { RETRY: 'loading' } }
    });

    console.log('Initial state:', mockMachine.state);
    expect(mockMachine.state).toBe('idle');

    await mockMachine.send('START');
    console.log('After START:', mockMachine.state);
    expect(mockMachine.state).toBe('loading');

    await mockMachine.send('SUCCESS');
    console.log('After SUCCESS:', mockMachine.state);
    expect(mockMachine.state).toBe('success');
  });

  await test('mock machine with context updates', async () => {
    const mockMachine = createMockMachine({
      idle: {
        on: {
          SET_VALUE: {
            target: 'idle',
            actions: [{ assign: { value: 'test' } }]
          }
        }
      }
    });

    console.log('Initial context:', mockMachine.context);

    await mockMachine.send('SET_VALUE');
    console.log('After SET_VALUE:', mockMachine.context);
    expect(mockMachine.context.value).toBe('test');
  });

  await test('mock machine subscription', async () => {
    const mockMachine = createMockMachine({
      idle: { on: { START: 'active' } },
      active: { on: { STOP: 'idle' } }
    });

    let notificationCount = 0;
    const unsubscribe = mockMachine.subscribe((state, context) => {
      notificationCount++;
      console.log(`Subscription notification ${notificationCount}: ${state}`);
    });

    await mockMachine.send('START');
    await mockMachine.send('STOP');

    expect(notificationCount).toBe(2);
    unsubscribe();
  });

  await test('mock machine matches', async () => {
    const mockMachine = createMockMachine({
      idle: { on: { START: 'running' } },
      running: { on: { STOP: 'idle' } }
    });

    expect(mockMachine.matches('idle')).toBe(true);
    expect(mockMachine.matches('running')).toBe(false);

    await mockMachine.send('START');
    expect(mockMachine.matches('running')).toBe(true);
    expect(mockMachine.matches('idle')).toBe(false);
  });

  console.log('\n--- Comparing with Real Machine ---');

  // Create a real machine for comparison
  const realMachine = createMachine({
    id: 'real',
    initial: 'idle',
    context: { count: 0 },
    states: {
      idle: {
        on: {
          START: 'active',
          INCREMENT: {
            actions: [assign({ count: ctx => ctx.count + 1 })]
          }
        }
      },
      active: { on: { STOP: 'idle' } }
    }
  });

  console.log('Real machine initial state:', realMachine.state);
  console.log('Real machine initial context:', realMachine.context);

  await realMachine.send('INCREMENT');
  console.log('Real machine after INCREMENT:', realMachine.context.count);

  await realMachine.send('START');
  console.log('Real machine after START:', realMachine.state);

  console.log('\n--- Mock vs Real Summary ---');
  console.log('Mock machines are useful for:');
  console.log('- Fast unit testing without full state machine overhead');
  console.log('- Testing components that depend on state machines');
  console.log('- Prototyping state machine behavior');
  console.log('- Integration testing with controlled state transitions');
};

runExample().catch(console.error);