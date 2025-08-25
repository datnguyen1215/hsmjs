# Async Patterns

## Syntax Quick Reference

```javascript
// Basic async action
entry: [async ({ context, event, machine }) => {
  const data = await fetchData();
  machine.send('SUCCESS', { data });
}]

// Async with error handling
entry: [async () => {
  try {
    const result = await api.call();
    machine.send('SUCCESS', { result });
  } catch (error) {
    machine.send('ERROR', { error });
  }
}]

// Parallel operations
entry: [async () => {
  const results = await Promise.all([
    fetch('/api/1'),
    fetch('/api/2')
  ]);
  machine.send('ALL_COMPLETE', { results });
}]
```

## Basic Usage

Handle asynchronous operations in state machines:

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: { data: null, error: null },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      entry: [
        assign({ error: null, loading: true }),
        async ({ context, event, machine }) => {
          try {
            const response = await fetch(event.url);
            const data = await response.json();
            machine.send('SUCCESS', { data });
          } catch (error) {
            machine.send('ERROR', { error: error.message });
          }
        }
      ],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({
            data: ({ context, event, machine }) => event.data,
            loading: false
          })]
        },
        ERROR: {
          target: 'error',
          actions: [assign({
            error: ({ context, event, machine }) => event.error,
            loading: false
          })]
        },
        CANCEL: 'idle'
      }
    },
    success: {
      on: { FETCH: 'loading' }
    },
    error: {
      on: { RETRY: 'loading' }
    }
  }
});
```

## Async Action Patterns

### Fire and Forget

Async action without waiting for result:

```javascript
entry: [
  async () => {
    // Fire analytics event
    await analytics.track('page_view');
    // No need to send events back
  }
]
```

### Result Handling

Send events based on async results:

```javascript
entry: [
  async ({ context, event, machine }) => {
    const result = await processData(event.data);

    if (result.success) {
      machine.send('PROCESS_SUCCESS', {
        processedData: result.data
      });
    } else {
      machine.send('PROCESS_FAILURE', {
        error: result.error
      });
    }
  }
]
```

### Return Values

Async actions can return values accessible in results:

```javascript
const machine = createMachine({
  states: {
    idle: {
      on: {
        CALCULATE: {
          target: 'calculating',
          actions: [
            async () => {
              const result = await complexCalculation();
              return result;  // Available in transition results
            }
          ]
        }
      }
    }
  }
});

const result = await machine.send('CALCULATE');
console.log(result.results[0].value);  // The returned value
```

## Parallel Operations

### Promise.all Pattern

Execute multiple async operations in parallel:

```javascript
entry: [
  async ({ context, event, machine }) => {
    try {
      const [users, posts, comments] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/posts').then(r => r.json()),
        fetch('/api/comments').then(r => r.json())
      ]);

      machine.send('DATA_LOADED', { users, posts, comments });
    } catch (error) {
      machine.send('LOAD_ERROR', { error });
    }
  }
]
```

### Promise.allSettled Pattern

Handle mixed success/failure:

```javascript
entry: [
  async ({ context, event, machine }) => {
    const results = await Promise.allSettled([
      fetch('/api/primary'),
      fetch('/api/backup'),
      fetch('/api/cache')
    ]);

    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason);

    machine.send('PARTIAL_SUCCESS', { successful, failed });
  }
]
```

### Race Conditions

First to complete wins:

```javascript
entry: [
  async () => {
    const result = await Promise.race([
      fetch('/api/fast-server'),
      fetch('/api/slow-server'),
      new Promise((_, reject) =>
        setTimeout(() => reject('Timeout'), 5000)
      )
    ]);

    machine.send('FIRST_RESPONSE', { result });
  }
]
```

## Retry Patterns

### Basic Retry

```javascript
const retryMachine = createMachine({
  id: 'retry',
  initial: 'idle',
  context: {
    attempts: 0,
    maxAttempts: 3,
    data: null
  },
  states: {
    idle: {
      on: { START: 'trying' }
    },
    trying: {
      entry: [
        assign({ attempts: ({ context }) => context.attempts + 1 }),
        async ({ context, event, machine }) => {
          try {
            const data = await fetchWithTimeout(event.url, 5000);
            machine.send('SUCCESS', { data });
          } catch (error) {
            machine.send('FAILURE', { error });
          }
        }
      ],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({
            data: ({ context, event, machine }) => event.data,
            attempts: 0
          })]
        },
        FAILURE: [
          {
            target: 'retrying',
            cond: ({ context }) => context.attempts < context.maxAttempts
          },
          {
            target: 'failed'
          }
        ]
      }
    },
    retrying: {
      entry: [
        () => console.log('Retrying...'),
        async ({ context }) => {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          machine.send('RETRY');
        }
      ],
      on: { RETRY: 'trying' }
    },
    success: {},
    failed: {}
  }
});
```

### Exponential Backoff

```javascript
entry: [
  async ({ context }) => {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const delay = Math.pow(2, context.attempts - 1) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    machine.send('RETRY');
  }
]
```

## Cancellation Patterns

### Abort Controller

```javascript
const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: {
    abortController: null,
    data: null
  },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      entry: [
        assign({
          abortController: () => new AbortController()
        }),
        async ({ context, event, machine }) => {
          try {
            const response = await fetch(event.url, {
              signal: context.abortController.signal
            });
            const data = await response.json();
            machine.send('SUCCESS', { data });
          } catch (error) {
            if (error.name === 'AbortError') {
              console.log('Fetch cancelled');
            } else {
              machine.send('ERROR', { error });
            }
          }
        }
      ],
      on: {
        CANCEL: {
          target: 'idle',
          actions: [({ context }) => {
            context.abortController?.abort();
          }]
        },
        SUCCESS: 'success',
        ERROR: 'error'
      }
    }
  }
});
```

## Debouncing and Throttling

### Debounce Pattern

```javascript
const searchMachine = createMachine({
  id: 'search',
  initial: 'idle',
  context: {
    query: '',
    debounceTimer: null,
    results: []
  },
  states: {
    idle: {
      on: { TYPE: 'debouncing' }
    },
    debouncing: {
      entry: [
        ({ context }) => {
          if (context.debounceTimer) {
            clearTimeout(context.debounceTimer);
          }
        },
        assign({
          query: ({ context, event, machine }) => event.query,
          debounceTimer: () => setTimeout(() => {
            machine.send('SEARCH');
          }, 300)
        })
      ],
      on: {
        TYPE: 'debouncing',  // Reset timer
        SEARCH: 'searching'
      }
    },
    searching: {
      entry: [async ({ context }) => {
        const results = await searchAPI(context.query);
        machine.send('RESULTS', { results });
      }],
      on: {
        RESULTS: {
          target: 'idle',
          actions: [assign({
            results: ({ context, event, machine }) => event.results
          })]
        }
      }
    }
  }
});
```

### Throttle Pattern

```javascript
const throttleMachine = createMachine({
  id: 'throttle',
  initial: 'ready',
  context: {
    lastCall: 0,
    throttleMs: 1000
  },
  states: {
    ready: {
      on: {
        CALL: [
          {
            target: 'calling',
            cond: ({ context }) => {
              const now = Date.now();
              return now - context.lastCall > context.throttleMs;
            }
          }
        ]
      }
    },
    calling: {
      entry: [
        assign({ lastCall: () => Date.now() }),
        async () => {
          await makeAPICall();
          machine.send('DONE');
        }
      ],
      on: { DONE: 'ready' }
    }
  }
});
```

## Common Pitfalls

### ❌ Not Handling Errors

```javascript
// Wrong - no error handling
entry: [async () => {
  const data = await fetch('/api/data');
  machine.send('SUCCESS', { data });
}]

// Correct - handle errors
entry: [async () => {
  try {
    const data = await fetch('/api/data');
    machine.send('SUCCESS', { data });
  } catch (error) {
    machine.send('ERROR', { error });
  }
}]
```

### ❌ Blocking State Transitions

```javascript
// Wrong - blocks other events
entry: [async () => {
  await longRunningOperation();  // Blocks for long time
}]

// Better - allow cancellation
on: {
  CANCEL: 'idle',  // Can cancel during async operation
}
```

### ❌ Memory Leaks with Timers

```javascript
// Wrong - timer not cleaned up
entry: [() => {
  setTimeout(() => machine.send('TIMEOUT'), 5000);
}]

// Correct - store and clean up
entry: [
  assign({
    timer: () => setTimeout(() => machine.send('TIMEOUT'), 5000)
  })
],
exit: [({ context }) => {
  clearTimeout(context.timer);
}]
```

## Best Practices

1. **Always handle errors** in async operations
2. **Send events** for results rather than direct assignment
3. **Allow cancellation** of long-running operations
4. **Clean up resources** (timers, abort controllers) on exit
5. **Use debouncing** for user input
6. **Consider retry logic** for network operations
7. **Test async flows** with mocked delays and failures