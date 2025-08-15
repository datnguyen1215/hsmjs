import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const advancedFetchMachine = createMachine({
    id: 'advancedFetch',
    initial: 'idle',
    context: {
      data: null,
      error: null,
      cache: new Map(),
      retryCount: 0,
      maxRetries: 3,
      cacheKey: null
    },
    states: {
      idle: {
        on: {
          FETCH: [
            {
              target: 'success',
              cond: (ctx, event) => ctx.cache.has(event.url),
              actions: [assign({
                data: (ctx, event) => ctx.cache.get(event.url),
                cacheKey: (ctx, event) => event.url
              })]
            },
            {
              target: 'loading',
              actions: [assign({
                cacheKey: (ctx, event) => event.url,
                retryCount: 0,
                error: null
              })]
            }
          ]
        }
      },
      loading: {
        entry: [async (ctx, event) => {
          try {
            // Mock fetch for Node.js example
            console.log(`Fetching from: ${event.url || ctx.cacheKey}`);

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Simulate different responses for demo
            const url = event.url || ctx.cacheKey;
            if (url.includes('error')) {
              throw new Error('Network error');
            }

            const data = { message: 'Data from ' + url, timestamp: Date.now() };
            advancedFetchMachine.send('SUCCESS', { data });
          } catch (error) {
            advancedFetchMachine.send('ERROR', { error: error.message });
          }
        }],
        on: {
          SUCCESS: {
            target: 'success',
            actions: [assign({
              data: (ctx, event) => event.data,
              cache: (ctx, event) => {
                ctx.cache.set(ctx.cacheKey, event.data);
                return ctx.cache;
              }
            })]
          },
          ERROR: [
            {
              target: 'retrying',
              cond: (ctx) => ctx.retryCount < ctx.maxRetries,
              actions: [assign({
                error: (ctx, event) => event.error,
                retryCount: (ctx) => ctx.retryCount + 1
              })]
            },
            {
              target: 'error',
              actions: [assign({ error: (ctx, event) => event.error })]
            }
          ],
          CANCEL: 'idle'
        }
      },
      retrying: {
        entry: [async (ctx) => {
          // Exponential backoff
          const delay = Math.pow(2, ctx.retryCount) * 1000;
          console.log(`Retrying in ${delay}ms (attempt ${ctx.retryCount}/${ctx.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          advancedFetchMachine.send('RETRY');
        }],
        on: {
          RETRY: 'loading',
          CANCEL: 'idle'
        }
      },
      success: {
        on: {
          FETCH: [
            {
              target: 'success',
              cond: (ctx, event) => ctx.cache.has(event.url),
              actions: [assign({
                data: (ctx, event) => ctx.cache.get(event.url),
                cacheKey: (ctx, event) => event.url
              })]
            },
            {
              target: 'loading',
              actions: [assign({
                cacheKey: (ctx, event) => event.url,
                retryCount: 0,
                error: null
              })]
            }
          ],
          INVALIDATE: {
            target: 'idle',
            actions: [assign({
              cache: (ctx) => {
                ctx.cache.delete(ctx.cacheKey);
                return ctx.cache;
              },
              data: null,
              cacheKey: null
            })]
          }
        }
      },
      error: {
        on: {
          RETRY: {
            target: 'loading',
            actions: [assign({ retryCount: 0, error: null })]
          },
          FETCH: {
            target: 'loading',
            actions: [assign({
              cacheKey: (ctx, event) => event.url,
              retryCount: 0,
              error: null
            })]
          }
        }
      }
    }
  });

  // Usage demonstration
  console.log('Advanced Fetch Example with Retry and Cache:');
  console.log('Initial state:', advancedFetchMachine.state);

  // First fetch - will hit the network
  console.log('\n1. First fetch:');
  await advancedFetchMachine.send('FETCH', { url: 'https://api.example.com/data' });
  console.log('State after fetch:', advancedFetchMachine.state);
  console.log('Data:', advancedFetchMachine.context.data);
  console.log('Cache size:', advancedFetchMachine.context.cache.size);

  // Second fetch - will hit cache
  console.log('\n2. Second fetch (cached):');
  await advancedFetchMachine.send('FETCH', { url: 'https://api.example.com/data' });
  console.log('State after cached fetch:', advancedFetchMachine.state);
  console.log('Data (from cache):', advancedFetchMachine.context.data);

  // Test error scenario
  console.log('\n3. Error scenario:');
  await advancedFetchMachine.send('FETCH', { url: 'https://api.example.com/error' });
  // Wait for retries to complete
  await new Promise(resolve => setTimeout(resolve, 8000));
  console.log('Final state after retries:', advancedFetchMachine.state);
  console.log('Error:', advancedFetchMachine.context.error);
};

runExample().catch(console.error);