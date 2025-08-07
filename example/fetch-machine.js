import { createMachine, assign } from '../src/index.js';

// Mock fetch for testing
const mockFetch = (url) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (url.includes('error')) {
        throw new Error('Network error');
      }
      resolve({
        json: async () => ({ data: `Response from ${url}` })
      });
    }, 100);
  });
};

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: {
    data: null,
    error: null,
    retries: 0
  },
  states: {
    idle: {
      on: {
        FETCH: 'loading'
      }
    },
    loading: {
      entry: [async (context, event) => {
        try {
          const response = await mockFetch(event.url);
          const data = await response.json();
          // Using service reference passed through event
          event.service.send('SUCCESS', { data });
        } catch (error) {
          event.service.send('FAILURE', { error: error.message });
        }
      }],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign((ctx, event) => ({ data: event.data }))]
        },
        FAILURE: [
          {
            target: 'loading',
            cond: (ctx) => ctx.retries < 3,
            actions: [assign((ctx) => ({ retries: ctx.retries + 1 }))]
          },
          {
            target: 'failure',
            actions: [assign((ctx, event) => ({ error: event.error }))]
          }
        ]
      }
    },
    success: {
      entry: [() => console.log('✓ Success state reached')],
      on: { FETCH: 'loading' }
    },
    failure: {
      entry: [() => console.log('✗ Failure state reached')],
      on: { RETRY: 'loading' }
    }
  }
});

// Test the machine
const runExample = async () => {
  console.log('Starting fetch machine example...\n');

  // Subscribe to state changes
  fetchMachine.subscribe((snapshot) => {
    console.log(`State: ${snapshot.state}, Context:`, snapshot.context);
  });

  // Test 1: Successful fetch
  console.log('\n=== Test 1: Successful fetch ===');
  const result1 = await fetchMachine.send('FETCH', { url: '/api/users', service: fetchMachine });
  console.log('Result:', result1);

  // Test 2: Failed fetch with retries
  console.log('\n=== Test 2: Failed fetch with retries ===');
  const result2 = await fetchMachine.send('FETCH', { url: '/api/error', service: fetchMachine });
  console.log('Result:', result2);

  // Wait for async actions to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\n=== Final state ===');
  console.log('State:', fetchMachine.state);
  console.log('Context:', fetchMachine.context);
};

runExample().catch(console.error);