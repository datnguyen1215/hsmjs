# Advanced Features

This guide covers advanced HSMJS features for complex state management scenarios.

## Hierarchical States (Nested States)

Hierarchical states allow you to organize complex logic into manageable nested structures.

### Basic Nesting

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const authMachine = createMachine({
  id: 'auth',
  initial: 'loggedOut',
  states: {
    loggedOut: {
      on: { LOGIN: 'loggedIn' }
    },
    loggedIn: {
      initial: 'dashboard',    // Default nested state
      states: {
        dashboard: {
          on: {
            GO_TO_PROFILE: 'profile',
            GO_TO_SETTINGS: 'settings'
          }
        },
        profile: {
          on: {
            GO_TO_DASHBOARD: 'dashboard',
            GO_TO_SETTINGS: 'settings'
          }
        },
        settings: {
          on: {
            GO_TO_DASHBOARD: 'dashboard',
            GO_TO_PROFILE: 'profile'
          }
        }
      },
      on: {
        LOGOUT: 'loggedOut'  // Parent-level transition
      }
    }
  }
});

// Usage
await authMachine.send('LOGIN');
console.log(authMachine.state); // 'loggedIn.dashboard'

await authMachine.send('GO_TO_PROFILE');
console.log(authMachine.state); // 'loggedIn.profile'

await authMachine.send('LOGOUT');
console.log(authMachine.state); // 'loggedOut'
```

### State IDs and External Transitions

Use state IDs to reference states from anywhere in the machine:

```javascript
const appMachine = createMachine({
  id: 'app',
  initial: 'loading',
  states: {
    loading: {
      on: { LOADED: 'authenticated' }
    },
    authenticated: {
      id: 'auth',
      initial: 'dashboard',
      states: {
        dashboard: {
          on: {
            ERROR: '#error',           // Jump to error state
            SETTINGS: 'settings'
          }
        },
        settings: {
          on: {
            SAVE: 'dashboard',
            ERROR: '#error'
          }
        }
      }
    },
    error: {
      id: 'error',
      on: {
        RETRY: '#auth.dashboard',      // Jump back to specific nested state
        RESET: 'loading'
      }
    }
  }
});
```

### Deep State Matching

Check for specific nested states:

```javascript
// Check exact state
if (machine.matches('loggedIn.profile')) {
  console.log('User is viewing profile');
}

// Check parent state (matches any child)
if (machine.matches('loggedIn')) {
  console.log('User is logged in');
}
```

## Guards and Conditional Logic

Guards control when transitions can occur based on context or event data.

### Basic Guards

```javascript
const counterMachine = createMachine({
  id: 'counter',
  initial: 'active',
  context: { count: 0, max: 10 },
  states: {
    active: {
      on: {
        INCREMENT: [
          {
            target: 'active',
            cond: (ctx) => ctx.count < ctx.max,
            actions: [assign({ count: ctx => ctx.count + 1 })]
          },
          {
            target: 'maxed',
            cond: (ctx) => ctx.count >= ctx.max
          }
        ]
      }
    },
    maxed: {
      entry: [() => console.log('Counter reached maximum!')],
      on: {
        RESET: {
          target: 'active',
          actions: [assign({ count: 0 })]
        }
      }
    }
  }
});
```

### Event-Based Guards

```javascript
const validationMachine = createMachine({
  id: 'validation',
  initial: 'input',
  context: { attempts: 0 },
  states: {
    input: {
      on: {
        SUBMIT: [
          {
            target: 'success',
            cond: (ctx, event) => event.isValid && ctx.attempts < 3
          },
          {
            target: 'error',
            actions: [assign({ attempts: ctx => ctx.attempts + 1 })],
            cond: (ctx, event) => !event.isValid && ctx.attempts < 2
          },
          {
            target: 'locked',
            cond: (ctx, event) => ctx.attempts >= 2
          }
        ]
      }
    },
    success: {},
    error: {
      on: { TRY_AGAIN: 'input' }
    },
    locked: {
      on: { UNLOCK: 'input' }
    }
  }
});

// Usage
await validationMachine.send('SUBMIT', { isValid: false });
```

### Named Guards

For reusable guard logic:

```javascript
const guards = {
  isValidUser: (ctx, event) => event.user && event.user.verified,
  hasPermission: (ctx, event) => ctx.permissions.includes(event.action),
  withinLimit: (ctx, event) => ctx.count < ctx.limit
};

const machine = createMachine({
  id: 'protected',
  initial: 'idle',
  context: { permissions: ['read'], count: 0, limit: 5 },
  states: {
    idle: {
      on: {
        ACCESS: [
          {
            target: 'granted',
            cond: 'isValidUser'
          },
          {
            target: 'denied'
          }
        ],
        INCREMENT: {
          cond: 'withinLimit',
          actions: [assign({ count: ctx => ctx.count + 1 })]
        }
      }
    },
    granted: {},
    denied: {}
  }
}, { guards });
```

## Async Actions and Side Effects

Handle asynchronous operations elegantly with HSMJS.

### Basic Async Actions

```javascript
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
        assign({ error: null }),
        async (ctx, event) => {
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
          actions: [assign({ data: (ctx, event) => event.data })]
        },
        ERROR: {
          target: 'error',
          actions: [assign({ error: (ctx, event) => event.error })]
        },
        CANCEL: 'idle'
      }
    },
    success: {
      on: {
        FETCH: 'loading',
        CLEAR: {
          target: 'idle',
          actions: [assign({ data: null })]
        }
      }
    },
    error: {
      on: {
        RETRY: 'loading',
        CLEAR: {
          target: 'idle',
          actions: [assign({ error: null })]
        }
      }
    }
  }
});
```

### Async Action Results

Get return values from async actions:

```javascript
const uploadMachine = createMachine({
  id: 'upload',
  initial: 'idle',
  states: {
    idle: {
      on: { UPLOAD: 'uploading' }
    },
    uploading: {
      entry: [
        async (ctx, event) => {
          const formData = new FormData();
          formData.append('file', event.file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          return response.json(); // This will be in results
        }
      ],
      on: {
        SUCCESS: 'success',
        ERROR: 'error'
      }
    },
    success: {},
    error: {}
  }
});

// Usage
const result = await uploadMachine.send('UPLOAD', { file: fileObject });
console.log('Upload response:', result.results[0].value);
```

### Parallel Async Operations

Handle multiple async operations:

```javascript
const parallelMachine = createMachine({
  id: 'parallel',
  initial: 'idle',
  context: { results: [] },
  states: {
    idle: {
      on: { START: 'processing' }
    },
    processing: {
      entry: [
        async (ctx, event) => {
          // Start multiple operations
          const promises = event.urls.map(url => fetch(url).then(r => r.json()));
          const results = await Promise.allSettled(promises);

          return { results }; // Return for access in results
        }
      ],
      on: {
        COMPLETE: {
          target: 'complete',
          actions: [assign({
            results: (ctx, event) => event.results
          })]
        }
      }
    },
    complete: {}
  }
});
```

## Complex State Patterns

### Retry Logic with Backoff

```javascript
const retryMachine = createMachine({
  id: 'retry',
  initial: 'idle',
  context: {
    attempts: 0,
    maxAttempts: 3,
    backoffMs: 1000,
    data: null,
    error: null
  },
  states: {
    idle: {
      on: { START: 'attempting' }
    },
    attempting: {
      entry: [
        assign({ attempts: ctx => ctx.attempts + 1 }),
        async (ctx, event) => {
          try {
            const response = await fetch(event.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            machine.send('SUCCESS', { data });
          } catch (error) {
            machine.send('FAILURE', { error: error.message });
          }
        }
      ],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({
            data: (ctx, event) => event.data,
            attempts: 0  // Reset on success
          })]
        },
        FAILURE: [
          {
            target: 'retrying',
            cond: (ctx) => ctx.attempts < ctx.maxAttempts,
            actions: [assign({ error: (ctx, event) => event.error })]
          },
          {
            target: 'failed',
            actions: [assign({ error: (ctx, event) => event.error })]
          }
        ]
      }
    },
    retrying: {
      entry: [
        async (ctx) => {
          // Exponential backoff
          const delay = ctx.backoffMs * Math.pow(2, ctx.attempts - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          machine.send('RETRY');
        }
      ],
      on: {
        RETRY: 'attempting'
      }
    },
    success: {
      on: { RESET: 'idle' }
    },
    failed: {
      entry: [() => console.log('All retry attempts exhausted')],
      on: {
        RESET: {
          target: 'idle',
          actions: [assign({ attempts: 0, error: null })]
        }
      }
    }
  }
});
```

### State Machine Composition

Combine multiple machines:

```javascript
// Child machine for authentication
const authMachine = createMachine({
  id: 'auth',
  initial: 'loggedOut',
  context: { user: null },
  states: {
    loggedOut: {
      on: { LOGIN: 'authenticating' }
    },
    authenticating: {
      entry: [async (ctx, event) => {
        try {
          const user = await authenticate(event.credentials);
          machine.send('AUTH_SUCCESS', { user });
        } catch (error) {
          machine.send('AUTH_FAILURE', { error });
        }
      }],
      on: {
        AUTH_SUCCESS: {
          target: 'loggedIn',
          actions: [assign({ user: (ctx, event) => event.user })]
        },
        AUTH_FAILURE: 'loggedOut'
      }
    },
    loggedIn: {
      on: { LOGOUT: 'loggedOut' }
    }
  }
});

// Parent machine that uses auth machine
const appMachine = createMachine({
  id: 'app',
  initial: 'initializing',
  context: { authState: authMachine.state },
  states: {
    initializing: {
      entry: [
        // Subscribe to auth machine changes
        () => {
          authMachine.subscribe((state, context) => {
            appMachine.send('AUTH_CHANGED', { authState: state, authContext: context });
          });
        }
      ],
      on: { READY: 'running' }
    },
    running: {
      on: {
        AUTH_CHANGED: {
          actions: [assign({
            authState: (ctx, event) => event.authState
          })]
        },
        // Delegate auth events to auth machine
        LOGIN: {
          actions: [(ctx, event) => authMachine.send('LOGIN', event)]
        },
        LOGOUT: {
          actions: [() => authMachine.send('LOGOUT')]
        }
      }
    }
  }
});
```

### Event Sourcing Pattern

Track all state changes for debugging or replay:

```javascript
const auditMachine = createMachine({
  id: 'audit',
  initial: 'active',
  context: {
    data: {},
    eventLog: []
  },
  states: {
    active: {
      on: {
        '*': {  // Catch-all for any event
          actions: [
            // Log all events
            assign({
              eventLog: (ctx, event) => [
                ...ctx.eventLog,
                {
                  timestamp: Date.now(),
                  event: event.type,
                  payload: { ...event }
                }
              ]
            }),
            // Handle specific events
            (ctx, event) => {
              switch (event.type) {
                case 'UPDATE_DATA':
                  machine.send('DATA_UPDATED', event);
                  break;
                case 'DELETE_DATA':
                  machine.send('DATA_DELETED', event);
                  break;
              }
            }
          ]
        },
        DATA_UPDATED: {
          actions: [assign({
            data: (ctx, event) => ({ ...ctx.data, ...event.updates })
          })]
        },
        DATA_DELETED: {
          actions: [assign({
            data: (ctx, event) => {
              const { [event.key]: deleted, ...remaining } = ctx.data;
              return remaining;
            }
          })]
        },
        REPLAY_EVENTS: {
          entry: [(ctx) => {
            // Replay events from log
            ctx.eventLog.forEach(logEntry => {
              setTimeout(() => {
                machine.send(logEntry.event, logEntry.payload);
              }, 0);
            });
          }]
        }
      }
    }
  }
});
```

## Performance Considerations

### Minimizing Re-renders

```javascript
// Good: Update context efficiently
actions: [
  assign({
    // Only update what changed
    loading: false,
    data: (ctx, event) => event.data
    // Don't spread entire context unless needed
  })
]

// Avoid: Unnecessary context spread
actions: [
  assign(ctx => ({
    ...ctx,  // Avoid this - creates new object every time
    loading: false
  }))
]
```

### Debouncing Events

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
        // Clear existing timer
        (ctx) => {
          if (ctx.debounceTimer) {
            clearTimeout(ctx.debounceTimer);
          }
        },
        // Set new timer
        assign({
          query: (ctx, event) => event.query,
          debounceTimer: (ctx, event) => setTimeout(() => {
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
      entry: [
        async (ctx) => {
          const results = await searchAPI(ctx.query);
          machine.send('RESULTS', { results });
        }
      ],
      on: {
        RESULTS: {
          target: 'idle',
          actions: [assign({ results: (ctx, event) => event.results })]
        },
        TYPE: 'debouncing'  // New input cancels search
      }
    }
  }
});
```

## Testing Advanced Features

### Testing Guards

```javascript
// test/guards.test.js
import { createMachine } from '@datnguyen1215/hsmjs';

test('guards prevent invalid transitions', async () => {
  const machine = createMachine({
    id: 'test',
    initial: 'idle',
    context: { count: 0 },
    states: {
      idle: {
        on: {
          INCREMENT: [
            {
              target: 'active',
              cond: (ctx) => ctx.count < 5,
              actions: [assign({ count: ctx => ctx.count + 1 })]
            },
            {
              target: 'maxed'
            }
          ]
        }
      },
      active: {},
      maxed: {}
    }
  });

  // Should transition to active
  await machine.send('INCREMENT');
  expect(machine.state).toBe('active');
  expect(machine.context.count).toBe(1);

  // After 4 more increments, should go to maxed
  for (let i = 0; i < 4; i++) {
    await machine.send('INCREMENT');
  }
  expect(machine.state).toBe('maxed');
});
```

### Testing Async Actions

```javascript
test('async actions handle errors', async () => {
  const machine = createMachine({
    id: 'async-test',
    initial: 'idle',
    states: {
      idle: {
        on: { FETCH: 'loading' }
      },
      loading: {
        entry: [async () => {
          throw new Error('Network error');
        }],
        on: {
          ERROR: 'error'
        }
      },
      error: {}
    }
  });

  const result = await machine.send('FETCH');
  // Should handle error gracefully
  expect(machine.state).toBe('loading'); // Still in loading state
});
```

## State History and Persistence

HSMJS automatically tracks state history and provides powerful state management capabilities for implementing undo functionality, debugging, error recovery, and full state persistence.

### Basic Usage

```javascript
const machine = createMachine({
  id: 'editor',
  initial: 'idle',
  context: { text: '', saved: false },
  states: {
    idle: {
      on: {
        TYPE: {
          target: 'editing',
          actions: [assign({ text: (ctx, event) => event.text, saved: false })]
        }
      }
    },
    editing: {
      on: {
        SAVE: {
          target: 'idle',
          actions: [assign({ saved: true })]
        },
        TYPE: {
          actions: [assign({ text: (ctx, event) => event.text })]
        }
      }
    }
  }
});

// Make some changes
await machine.send('TYPE', { text: 'Hello' });
await machine.send('TYPE', { text: 'Hello World' });
await machine.send('SAVE');

// Check history
console.log(machine.historySize); // 4 (initial + 3 transitions)
console.log(machine.history); // Array of all snapshots

// Get current snapshot
const currentSnapshot = machine.snapshot;
console.log(currentSnapshot.state); // 'idle'
console.log(currentSnapshot.context); // { text: 'Hello World', saved: true }

// Restore to previous state
const previousSnapshot = machine.history[machine.history.length - 2];
const result = await machine.restore(previousSnapshot);
console.log(result.state); // 'editing'
console.log(result.context); // { text: 'Hello World', saved: false }
```

### Configuring History Size

By default, HSMJS keeps the last 50 states in history. You can configure this:

```javascript
const machine = createMachine({
  id: 'limited',
  initial: 'idle',
  states: {
    idle: {
      on: { TOGGLE: 'active' }
    },
    active: {
      on: { TOGGLE: 'idle' }
    }
  }
}, { historySize: 10 }); // Keep only last 10 states
```

### State Restoration Behavior

When restoring state:
- **No entry/exit actions are executed** - The state is restored directly
- **Context is preserved exactly** - All context values are restored
- **Event queue is cleared** - Pending events are discarded
- **History is updated** - The restored state is added to history
- **Subscribers are notified** - State change notifications are sent

```javascript
const machine = createMachine({
  id: 'restore-demo',
  initial: 'idle',
  states: {
    idle: {
      entry: [() => console.log('Entering idle')],
      exit: [() => console.log('Exiting idle')],
      on: { START: 'active' }
    },
    active: {
      entry: [() => console.log('Entering active')],
      exit: [() => console.log('Exiting active')]
    }
  }
});

await machine.send('START');
// Logs: "Exiting idle", "Entering active"

const idleSnapshot = machine.history[0]; // Initial idle state
await machine.restore(idleSnapshot);
// No logs - entry/exit actions are not executed
console.log(machine.state); // 'idle'
```

### State Persistence

One of the key features is full state persistence for power outage recovery:

```javascript
const appMachine = createMachine({
  id: 'app',
  initial: 'loading',
  context: { user: null, data: [], preferences: {} },
  states: {
    loading: {
      on: { LOADED: 'authenticated' }
    },
    authenticated: {
      on: {
        UPDATE_PREFS: {
          actions: [assign({ preferences: (ctx, event) => event.prefs })]
        },
        LOAD_DATA: {
          actions: [assign({ data: (ctx, event) => event.data })]
        }
      }
    }
  }
});

// Normal operation
await appMachine.send('LOADED');
await appMachine.send('UPDATE_PREFS', { prefs: { theme: 'dark' } });
await appMachine.send('LOAD_DATA', { data: [1, 2, 3] });

// Save state before potential power loss
const snapshot = appMachine.snapshot;
localStorage.setItem('appState', JSON.stringify(snapshot));

// After restart/power loss, restore state
const savedState = localStorage.getItem('appState');
if (savedState) {
  const snapshot = JSON.parse(savedState);
  await appMachine.restore(snapshot);
  console.log('Application state restored successfully');
  console.log('User preferences:', appMachine.context.preferences);
  console.log('Loaded data:', appMachine.context.data);
}
```

### Use Cases

#### Undo Functionality with History

```javascript
const textEditor = createMachine({
  id: 'textEditor',
  initial: 'editing',
  context: { content: '', cursor: 0 },
  states: {
    editing: {
      on: {
        TYPE: {
          actions: [assign({
            content: (ctx, event) => ctx.content + event.char,
            cursor: ctx => ctx.cursor + 1
          })]
        },
        DELETE: {
          actions: [assign({
            content: ctx => ctx.content.slice(0, -1),
            cursor: ctx => Math.max(0, ctx.cursor - 1)
          })]
        },
        UNDO: {
          actions: [async () => {
            // Restore to previous state in history
            if (textEditor.history.length > 1) {
              const previousSnapshot = textEditor.history[textEditor.history.length - 2];
              await textEditor.restore(previousSnapshot);
            }
          }]
        }
      }
    }
  }
});

// Type some text
await textEditor.send('TYPE', { char: 'H' });
await textEditor.send('TYPE', { char: 'i' });

// Undo last action
await textEditor.send('UNDO');
console.log(textEditor.context.content); // 'H'
```

#### Error Recovery with Checkpoints

```javascript
const apiMachine = createMachine({
  id: 'api',
  initial: 'idle',
  context: { data: null, error: null, checkpoint: null },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      entry: [
        // Save checkpoint before risky operation
        assign({ checkpoint: (ctx) => apiMachine.snapshot }),
        async (ctx, event) => {
          try {
            const data = await fetch(event.url);
            apiMachine.send('SUCCESS', { data });
          } catch (error) {
            apiMachine.send('ERROR', { error });
          }
        }
      ],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({ data: (ctx, event) => event.data, checkpoint: null })]
        },
        ERROR: {
          target: 'error',
          actions: [assign({ error: (ctx, event) => event.error })]
        }
      }
    },
    success: {},
    error: {
      on: {
        RECOVER: {
          actions: [async (ctx) => {
            // Restore to checkpoint before the failed operation
            if (ctx.checkpoint) {
              await apiMachine.restore(ctx.checkpoint);
            }
          }]
        }
      }
    }
  }
});
```

#### Debugging with History Navigation

```javascript
const debugMachine = createMachine({
  id: 'debug',
  initial: 'start',
  context: { steps: [] },
  states: {
    start: {
      on: {
        STEP1: {
          target: 'middle',
          actions: [assign({ steps: ctx => [...ctx.steps, 'step1'] })]
        }
      }
    },
    middle: {
      on: {
        STEP2: {
          target: 'end',
          actions: [assign({ steps: ctx => [...ctx.steps, 'step2'] })]
        }
      }
    },
    end: {}
  }
});

// Step through states
await debugMachine.send('STEP1');
await debugMachine.send('STEP2');

// Debug: Inspect history
console.log('History size:', debugMachine.historySize); // 3
console.log('All states:', debugMachine.history.map(s => s.state)); // ['start', 'middle', 'end']

// Navigate to any previous state
const middleState = debugMachine.history[1];
await debugMachine.restore(middleState);
console.log('Restored to:', debugMachine.state); // 'middle'
console.log('Context:', debugMachine.context); // { steps: ['step1'] }
```

### Limitations and Considerations

- History only stores state and context, not the full machine configuration
- Restore doesn't replay events - it directly restores the snapshot state
- History is stored in memory and is lost when the machine instance is destroyed (unless persisted)
- Large history sizes can impact memory usage for machines with large contexts
- Snapshots are JSON-serializable, so context must contain serializable data for persistence
- State validation ensures only valid states can be restored