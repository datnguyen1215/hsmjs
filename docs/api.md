# HSMJS API Documentation

A lightweight hierarchical state machine library with XState-like syntax.

## Basic Usage

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'myMachine',
  initial: 'idle',
  context: {
    count: 0
  },
  states: {
    idle: {
      on: {
        START: 'active'
      }
    },
    active: {
      entry: [() => console.log('Activated')],
      exit: [() => console.log('Deactivated')],
      on: {
        STOP: 'idle'
      }
    }
  }
});

// Fire and forget
machine.send('START');

// Or wait for completion
await machine.send('START');
```

## Configuration Structure

### Machine Definition

```javascript
{
  id: 'machineName',           // Unique identifier
  initial: 'stateName',        // Initial state
  context: {},                 // Initial context data
  states: {}                   // State definitions
}
```

### State Definition

```javascript
{
  entry: [Function | string],    // Array of actions on state entry
  exit: [Function | string],     // Array of actions on state exit
  on: {                         // Event handlers
    EVENT_NAME: 'targetState' | TransitionConfig
  }
}
```

### Transition Configuration

```javascript
{
  target: 'stateName',          // Target state
  cond: Function,               // Guard condition
  actions: [Function | string]   // Array of transition actions
}
```

## Features

### Actions

Actions can update context using `assign()` or perform side effects:

```javascript
import { assign } from '@datnguyen1215/hsmjs';

// Context updates with assign()
actions: [
  assign((context, event) => ({
    count: context.count + 1
  }))
]

// Side effects that return values
actions: [
  async (context, event) => {
    const result = await api.fetchData();
    return result; // Available in send() result
  }
]

// Combining both
actions: [
  assign({ loading: true }),
  async (context, event) => {
    const data = await api.fetchData();
    return data;
  },
  assign({ loading: false })
]
```

### String Actions

Actions can be referenced by string names for reusability:

```javascript
const actions = {
  increment: assign((context) => ({ count: context.count + 1 })),
  reset: assign({ count: 0 }),
  fetchData: async (context) => {
    const data = await api.getData();
    return data; // Available in send() result
  }
};

const machine = createMachine({
  states: {
    counting: {
      entry: ['increment'],
      exit: ['reset'],
      on: {
        ADD: {
          target: 'counting',
          actions: ['increment']
        }
      }
    }
  }
}, { actions }); // Pass actions as second parameter
```

### Guards

Conditional transitions using `cond`:

```javascript
on: {
  SUBMIT: {
    target: 'success',
    cond: (context) => context.isValid
  }
}
```

### Multiple Conditional Transitions

Array of transitions evaluated in order:

```javascript
on: {
  SUBMIT: [
    {
      target: 'premium',
      cond: (ctx) => ctx.isPremium
    },
    {
      target: 'standard',
      cond: (ctx) => ctx.hasCredits
    },
    {
      target: 'denied'  // Fallback
    }
  ]
}
```

### Nested States

```javascript
states: {
  auth: {
    initial: 'login',
    states: {
      login: {
        on: {
          SUBMIT: 'verifying'
        }
      },
      verifying: {
        on: {
          SUCCESS: '#main.dashboard'  // ID reference
        }
      }
    }
  }
}
```

### Async Actions

```javascript
entry: [async (context, event) => {
  const data = await fetchData();
  machine.send('SUCCESS', { data });
}]
```

## Send Method and Results

### Send Method

The `send()` method always returns a Promise. You can use it for fire-and-forget or await the result:

```javascript
// Fire and forget (don't await)
machine.send('START');
machine.send('CLICK');

// Wait for completion and get results
const result = await machine.send('FETCH', { url: '/api/data' });
```

### Result Structure

`send()` returns a Promise that resolves to:

```javascript
{
  state: 'stateName',      // New state after transition
  context: { /* ... */ },  // Updated context
  results: [               // Array of action results
    // Results from all actions in order
  ]
}
```

### Results Array

The results array contains return values from all actions executed during the transition, in this order:
1. Exit actions (from leaving state)
2. Transition actions
3. Entry actions (from entering state)

Each result item has:
- **String actions**: `{ name: 'actionName', value: returnValue }`
- **Inline functions**: `{ value: returnValue }`
- **assign() actions**: `{ value: undefined }`

```javascript
// Example with mixed actions
actions: [
  'validateInput',                    // { name: 'validateInput', value: true }
  assign({ loading: true }),          // { value: undefined }
  async () => await fetchData(),      // { value: fetchedData }
  'processResult'                     // { name: 'processResult', value: processed }
]

// Accessing specific results
const result = await machine.send('PROCESS');
const validationResult = result.results.find(r => r.name === 'validateInput')?.value;
```

## Event Queue Processing

The state machine processes one event at a time. When an event is sent while the machine is processing another event, it is automatically queued and processed sequentially.

### Key Behaviors

- **Sequential Processing**: Events are processed one at a time in FIFO order
- **Automatic Queuing**: Events sent during a transition are queued automatically
- **Individual Results**: Each `send()` Promise resolves with that specific event's result
- **State Consistency**: The machine maintains consistent state through all transitions

### Example

```javascript
// Send multiple events rapidly
const promise1 = machine.send('FIRST');  // Starts processing immediately
const promise2 = machine.send('SECOND'); // Queued until FIRST completes

// Each promise resolves with its own transition result
const result1 = await promise1; // State after FIRST event
const result2 = await promise2; // State after SECOND event

// machine.state always reflects the current state
console.log(machine.state); // Final state after all events
```

## API Methods

### Machine Instance

- `machine.send(event, payload)` - Send event (returns Promise)
- `machine.sendPriority(event, payload)` - Clear queue and send priority event
- `machine.clearQueue()` - Clear all queued events (returns count of cleared)
- `machine.matches(stateValue)` - Check if current state matches given state
- `machine.state` - Get current state
- `machine.context` - Get current context
- `machine.historySize` - Get number of states in history
- `machine.rollback()` - Rollback to previous state (returns Promise)
- `machine.subscribe(callback)` - Subscribe to state changes

### Queue Management

#### clearQueue()

Clears all queued events waiting to be processed. Does not affect the currently processing event.

```javascript
const clearedCount = machine.clearQueue();
console.log(`Cleared ${clearedCount} events from queue`);
```

- Returns the number of events that were cleared
- Rejects all cleared event promises with `QueueClearedError`
- Current transition (if any) continues to completion

#### sendPriority()

Sends a priority event that clears the queue before processing.

```javascript
// Emergency stop - clear queue and transition immediately
await machine.sendPriority('EMERGENCY_STOP');
```

- Clears all queued events first
- Then sends the priority event
- Useful for critical state changes that must happen immediately

### History Management

#### rollback()

Rollback to the previous state in history without executing entry/exit actions.

```javascript
const result = await machine.rollback();
console.log(result.state);    // Previous state
console.log(result.context);  // Previous context
```

- Returns Promise that resolves to `{ state, context }`
- Does NOT execute entry/exit actions
- Clears the event queue
- Returns current state if no history available

#### historySize property

Get the number of states currently stored in history.

```javascript
console.log(machine.historySize); // e.g., 5
```

#### Configuring History Size

Set maximum history size when creating the machine:

```javascript
const machine = createMachine({
  // ... machine config
}, {
  historySize: 20  // Keep last 20 states (default: 50)
});
```

### Error Types

#### QueueClearedError

Thrown when events are cleared from the queue:

```javascript
try {
  await machine.send('SOME_EVENT');
} catch (error) {
  if (error instanceof QueueClearedError) {
    console.log('Event was cancelled due to queue clearing');
  }
}
```

## Example: Fetch Machine

```javascript
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
          const response = await fetch(event.url);
          const data = await response.json();
          machine.send('SUCCESS', { data });  // Fire and forget
        } catch (error) {
          machine.send('FAILURE', { error });  // Fire and forget
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
      on: { FETCH: 'loading' }
    },
    failure: {
      on: { RETRY: 'loading' }
    }
  }
});

// Usage
// Fire and forget
fetchMachine.send('FETCH', { url: '/api/users' });

// Or wait for results
const result = await fetchMachine.send('FETCH', { url: '/api/users' });
console.log('Final state:', result.state);
console.log('Updated context:', result.context);
```