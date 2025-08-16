# API Reference

Complete documentation for all HSMJS methods and configuration options.

## Core Functions

### `createMachine(config, options?)`

Creates a new state machine instance.

**Parameters:**
- `config` (Object): Machine configuration
- `options` (Object, optional): Additional options like action implementations

**Returns:** Machine instance

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'myMachine',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: { START: 'active' }
    },
    active: {
      on: { STOP: 'idle' }
    }
  }
});
```

**Machine Configuration Structure:**

```javascript
{
  id: 'string',              // Required: Unique machine identifier
  initial: 'string',         // Required: Initial state name
  context: {},               // Optional: Initial context data
  states: {}                 // Required: State definitions
}
```

**Options Structure:**

```javascript
{
  actions: {},               // Optional: Named action implementations
  guards: {},                // Optional: Named guard implementations
  historySize: 50            // Optional: Maximum history size (default: 50)
}
```

### `assign(updater)`

Creates an action that updates the machine's context.

**Parameters:**
- `updater` (Object | Function): Context update specification

**Returns:** Action function

```javascript
import { assign } from '@datnguyen1215/hsmjs';

// Object form - static values
assign({ loading: true, error: null })

// Function form - computed values
assign({
  count: (context, event) => context.count + 1,
  lastUpdated: () => Date.now()
})

// Mixed form
assign({
  loading: false,                           // Static value
  data: (context, event) => event.payload,  // From event
  timestamp: () => Date.now()               // Computed value
})
```

## Machine Instance Methods

### `machine.send(event, payload?)`

Sends an event to the machine.

**Parameters:**
- `event` (String): Event name
- `payload` (Any, optional): Event data

**Returns:** Promise that resolves to transition result

```javascript
// Fire and forget
machine.send('START');

// With payload
machine.send('SET_VALUE', { value: 42 });

// Await results
const result = await machine.send('FETCH', { url: '/api/data' });
console.log(result.state);    // New state
console.log(result.context);  // Updated context
console.log(result.results);  // Action return values
```

**Result Structure:**
```javascript
{
  state: 'string',           // Current state after transition
  context: {},               // Updated context object
  results: [                 // Array of action results
    { name: 'actionName', value: returnValue },  // String actions
    { value: returnValue }                       // Inline functions
  ]
}
```

### `machine.sendPriority(event, payload?)`

Sends a priority event that clears the queue first.

**Parameters:**
- `event` (String): Event name
- `payload` (Any, optional): Event data

**Returns:** Promise that resolves to transition result

```javascript
// Emergency stop - clear queue and process immediately
await machine.sendPriority('EMERGENCY_STOP');
```

### `machine.clearQueue()`

Clears all queued events.

**Returns:** Number of cleared events

```javascript
const clearedCount = machine.clearQueue();
console.log(`Cleared ${clearedCount} events`);
```

### `machine.matches(stateValue)`

Checks if the machine is in a specific state.

**Parameters:**
- `stateValue` (String): State name to check

**Returns:** Boolean

```javascript
if (machine.matches('loading')) {
  console.log('Currently loading...');
}

// Works with nested states
if (machine.matches('auth.loggedIn.dashboard')) {
  console.log('User is on dashboard');
}
```

### `machine.subscribe(callback)`

Subscribes to state changes.

**Parameters:**
- `callback` (Function): Called with `(state, context)` on each change

**Returns:** Unsubscribe function

```javascript
const unsubscribe = machine.subscribe((state, context) => {
  console.log('State changed to:', state);
  console.log('Context is now:', context);
});

// Later...
unsubscribe();
```

## Machine Properties

### `machine.state`

**Type:** String
**Description:** Current state name

```javascript
console.log(machine.state); // 'idle'
```

### `machine.context`

**Type:** Object
**Description:** Current context data

```javascript
console.log(machine.context); // { count: 5, user: null }
```

### `machine.historySize`

**Type:** Number
**Description:** Number of states stored in history

```javascript
console.log(machine.historySize); // 3
```

## History and State Management

### `machine.history`

**Type:** Array<{state: string, context: Object}>
**Description:** Array of all state snapshots in chronological order

```javascript
// Check history
console.log(machine.history.length); // Number of states in history
console.log(machine.history); // [{ state: 'idle', context: {...} }, ...]

// Access specific history entries
const firstState = machine.history[0];
const currentSnapshot = machine.history[machine.history.length - 1];
```

### `machine.snapshot`

**Type:** {state: string, context: Object}
**Description:** Current state and context as a serializable snapshot

```javascript
// Get current snapshot
const snapshot = machine.snapshot;
console.log(snapshot.state); // Current state
console.log(snapshot.context); // Current context

// Snapshot is JSON-serializable for persistence
const serialized = JSON.stringify(snapshot);
localStorage.setItem('machineState', serialized);
```

### `machine.restore(snapshot)`

**Description:** Restore machine to a specific snapshot state. Does not execute entry/exit actions.

**Parameters:**
- `snapshot` (Object): Snapshot with state and context properties

**Returns:** Promise<{ state: string, context: Object }>

```javascript
// Save current state
const checkpoint = machine.snapshot;

// Make some changes
await machine.send('START');
await machine.send('NEXT');

// Restore to checkpoint
const result = await machine.restore(checkpoint);
console.log(result.state); // Restored state
console.log(result.context); // Restored context

// Restore from history
const previousSnapshot = machine.history[machine.history.length - 2];
await machine.restore(previousSnapshot);

// Restore from persisted state
const saved = JSON.parse(localStorage.getItem('machineState'));
await machine.restore(saved);
```

**Important Notes:**
- Does NOT execute entry/exit actions when restoring
- Clears the event queue
- Validates that the snapshot state exists in machine definition
- Adds restored state to history
- Supports full state persistence through JSON serialization

**Error Cases:**
- Throws if snapshot is not an object
- Throws if snapshot lacks state or context properties
- Throws if snapshot.state is not a valid state in the machine

**State Persistence Example:**
```javascript
// Save state before power loss
const snapshot = machine.snapshot;
localStorage.setItem('appState', JSON.stringify(snapshot));

// After restart, restore state
const savedState = localStorage.getItem('appState');
if (savedState) {
  const snapshot = JSON.parse(savedState);
  await machine.restore(snapshot);
  console.log('State restored successfully');
}
```

## State Configuration

### Basic State
```javascript
states: {
  stateName: {
    entry: [Function],    // Actions when entering state
    exit: [Function],     // Actions when leaving state
    on: {}               // Event handlers
  }
}
```

### Entry/Exit Actions
```javascript
states: {
  loading: {
    entry: [
      () => console.log('Loading started'),
      assign({ loading: true })
    ],
    exit: [
      assign({ loading: false }),
      () => console.log('Loading finished')
    ]
  }
}
```

### Event Handlers
```javascript
states: {
  idle: {
    on: {
      // Simple transition
      START: 'loading',

      // Transition with actions
      INCREMENT: {
        actions: [assign({ count: ctx => ctx.count + 1 })]
      },

      // Conditional transition
      SUBMIT: {
        target: 'success',
        cond: (context, event) => context.isValid
      },

      // Multiple conditional transitions
      PROCESS: [
        { target: 'premium', cond: ctx => ctx.isPremium },
        { target: 'standard', cond: ctx => ctx.hasCredits },
        { target: 'denied' }  // Fallback
      ]
    }
  }
}
```

## Transition Configuration

### Full Transition Object
```javascript
{
  target: 'string',           // Target state (optional for self-transitions)
  cond: Function,             // Guard condition (optional)
  actions: [Function]         // Transition actions (optional)
}
```

### Guard Functions
```javascript
// Context-based guard
cond: (context, event) => context.count > 5

// Event-based guard
cond: (context, event) => event.type === 'PREMIUM_USER'

// Combined guard
cond: (context, event) => context.isValid && event.confirmed
```

## Action Types

### Context Updates with `assign()`
```javascript
actions: [
  assign({ loading: true }),
  assign({
    count: ctx => ctx.count + 1,
    lastAction: (ctx, event) => event.type
  })
]
```

### Side Effect Actions
```javascript
actions: [
  () => console.log('Side effect'),
  async (context, event) => {
    const data = await fetch('/api/data');
    return data; // Available in results
  },
  (context, event) => {
    // Access context and event data
    console.log('Count:', context.count);
    console.log('Event:', event.type);
  }
]
```

### String Actions (Named Actions)
```javascript
const actions = {
  logEntry: () => console.log('Entering state'),
  incrementCounter: assign({ count: ctx => ctx.count + 1 }),
  fetchData: async (ctx, event) => {
    const response = await fetch(event.url);
    return response.json();
  }
};

const machine = createMachine({
  states: {
    idle: {
      entry: ['logEntry'],
      on: {
        FETCH: {
          target: 'loading',
          actions: ['fetchData', 'incrementCounter']
        }
      }
    }
  }
}, { actions }); // Pass actions as options
```

## Hierarchical States

### Basic Nesting
```javascript
states: {
  app: {
    initial: 'loading',
    states: {
      loading: {
        on: { LOADED: 'ready' }
      },
      ready: {
        on: { LOGOUT: '#app.loading' } // ID reference
      }
    }
  }
}
```

### State IDs and References
```javascript
states: {
  auth: {
    id: 'authentication',  // Assign ID
    initial: 'login',
    states: {
      login: {
        on: {
          SUCCESS: '#main.dashboard'  // Reference by ID
        }
      }
    }
  },
  main: {
    id: 'main',
    initial: 'dashboard',
    states: {
      dashboard: {},
      profile: {}
    }
  }
}
```

## Event Object Structure

Events passed to actions and guards:

```javascript
{
  type: 'string',      // Event name
  ...payload           // Any additional data sent with event
}
```

```javascript
// When you send:
machine.send('SET_USER', { name: 'John', id: 123 });

// Actions receive:
(context, event) => {
  console.log(event.type);  // 'SET_USER'
  console.log(event.name);  // 'John'
  console.log(event.id);    // 123
}
```

## Error Types

### `QueueClearedError`

Thrown when events are cleared from the queue:

```javascript
import { QueueClearedError } from '@datnguyen1215/hsmjs';

try {
  await machine.send('SOME_EVENT');
} catch (error) {
  if (error instanceof QueueClearedError) {
    console.log('Event was cancelled due to queue clearing');
  }
}
```

## TypeScript Support

HSMJS includes full TypeScript definitions:

```typescript
import { createMachine, assign, MachineConfig } from '@datnguyen1215/hsmjs';

interface Context {
  count: number;
  user?: string;
}

type Events =
  | { type: 'INCREMENT' }
  | { type: 'SET_USER'; user: string };

const config: MachineConfig<Context, Events> = {
  id: 'typed-machine',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: [assign({ count: ctx => ctx.count + 1 })]
        },
        SET_USER: {
          actions: [assign({ user: (ctx, event) => event.user })]
        }
      }
    }
  }
};

const machine = createMachine(config);
```

## Best Practices

### Action Organization
```javascript
// Keep actions pure and testable
const actions = {
  // Good: Pure function
  incrementCounter: assign({ count: ctx => ctx.count + 1 }),

  // Good: Clear side effect
  logAction: (ctx, event) => console.log('Action:', event.type),

  // Good: Async with error handling
  fetchData: async (ctx, event) => {
    try {
      return await fetch(event.url).then(r => r.json());
    } catch (error) {
      machine.send('FETCH_ERROR', { error });
    }
  }
};
```

### State Organization
```javascript
// Keep states focused and single-purpose
states: {
  // Good: Clear state responsibility
  authenticating: {
    entry: ['startAuth'],
    on: {
      SUCCESS: 'authenticated',
      FAILURE: 'unauthenticated'
    }
  },

  // Good: Nested states for related functionality
  authenticated: {
    initial: 'dashboard',
    states: {
      dashboard: {},
      profile: {},
      settings: {}
    }
  }
}
```

### Event Naming
```javascript
// Use consistent, descriptive event names
on: {
  // Good: Verb-based, clear intent
  'FETCH_STARTED': 'loading',
  'FETCH_SUCCEEDED': 'success',
  'FETCH_FAILED': 'error',

  // Good: User action based
  'USER_CLICKED_SUBMIT': 'submitting',
  'USER_CANCELLED': 'cancelled'
}
```