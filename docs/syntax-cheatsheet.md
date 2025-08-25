# HSMJS Syntax Cheatsheet

## Machine Creation

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'machineName',
  initial: 'initialState',
  context: { /* initial context */ },
  states: { /* state definitions */ }
}, {
  actions: { /* named actions */ },
  guards: { /* named guards */ },
  historySize: 50  // default
});
```

## State Definition

```javascript
states: {
  stateName: {
    // Lifecycle actions
    entry: ['actionName', () => console.log('entering')],
    exit: [assign({ leaving: true })],

    // Event handlers
    on: {
      EVENT_NAME: 'targetState',
      OTHER_EVENT: {
        target: 'targetState',
        cond: ({ context }) => context.isValid,
        actions: ['actionName']
      }
    },

    // Nested states
    initial: 'childState',
    states: { /* child state definitions */ }
  }
}
```

## Transitions

```javascript
// Simple transition
on: { EVENT: 'targetState' }

// With actions
on: {
  EVENT: {
    target: 'targetState',
    actions: [assign({ loading: true })]
  }
}

// With guard
on: {
  EVENT: {
    target: 'targetState',
    cond: ({ context, event, machine }) => context.count > 0
  }
}

// Multiple conditions (first match wins)
on: {
  EVENT: [
    { target: 'state1', cond: ({ context }) => context.type === 'A' },
    { target: 'state2', cond: ({ context }) => context.type === 'B' },
    { target: 'default' }  // Fallback
  ]
}

// Self-transition (no target)
on: {
  EVENT: {
    actions: [assign({ count: ({ context }) => context.count + 1 })]
  }
}

// Wildcard (catch-all)
on: {
  KNOWN_EVENT: 'state',
  '*': { actions: ['logUnknownEvent'] }
}
```

## Context Updates (assign)

```javascript
// Static value
assign({ loading: true })

// Computed from context
assign({ count: ({ context }) => context.count + 1 })

// Computed from event
assign({ user: ({ context, event, machine }) => event.userData })

// Multiple updates
assign({
  loading: false,
  data: ({ context, event, machine }) => event.data,
  timestamp: () => Date.now()
})

// Array operations
assign({
  items: ({ context, event, machine }) => [...context.items, event.item],
  filtered: ({ context }) => context.items.filter(i => i.active)
})

// Object updates
assign({
  user: ({ context, event, machine }) => ({ ...context.user, name: event.name })
})
```

## Guards

```javascript
// Inline guard
cond: ({ context, event, machine }) => context.isValid && event.confirmed

// Named guard (defined in options)
cond: 'isAuthorized'

// Guard options
{
  guards: {
    isAuthorized: ({ context, event, machine }) => context.user !== null,
    hasPermission: ({ context }) => context.role === 'admin'
  }
}
```

## Actions

```javascript
// Inline action
actions: [() => console.log('Action executed')]

// Named action
actions: ['doSomething']

// Async action
actions: [async ({ context, event, machine }) => {
  const result = await fetchData();
  machine.send('FETCH_COMPLETE', { result });
}]

// Action options
{
  actions: {
    doSomething: () => console.log('Doing something'),
    fetchData: async ({ context, event, machine }) => { /* ... */ }
  }
}
```

## Sending Events

```javascript
// Fire and forget
machine.send('EVENT');

// With payload
machine.send('EVENT', { data: 'value' });

// Await result
const result = await machine.send('EVENT');
// result = { state, context, results }

// Priority (clears queue)
await machine.sendPriority('EMERGENCY');

// Clear queue
const cleared = machine.clearQueue();
```

## State Checking

```javascript
// Current state
machine.state  // 'stateName' or 'parent.child'

// Current context
machine.context  // { /* context object */ }

// Check state
if (machine.matches('active')) { }
if (machine.matches('parent.child')) { }
```

## History & Restore

```javascript
// Access history
machine.history       // Array of snapshots
machine.historySize   // Number of states

// Get snapshot
const snapshot = machine.snapshot;  // { state, context }

// Restore state
await machine.restore(snapshot);

// Implement undo
const previous = machine.history[machine.history.length - 2];
await machine.restore(previous);
```

## Subscriptions

```javascript
// Subscribe to changes
const unsubscribe = machine.subscribe((state, context) => {
  console.log('State:', state);
  console.log('Context:', context);
});

// Unsubscribe
unsubscribe();
```

## Nested States

```javascript
// Define nested states
states: {
  parent: {
    initial: 'child1',
    states: {
      child1: { on: { NEXT: 'child2' } },
      child2: { on: { NEXT: '.child3' } },  // Relative
      child3: {}
    },
    on: { EXIT: 'otherState' }
  }
}

// State IDs
states: {
  auth: {
    id: 'authState',
    states: {
      login: {
        on: { SUCCESS: '#mainApp' }  // Jump by ID
      }
    }
  },
  main: {
    id: 'mainApp',
    // ...
  }
}
```

## Visualization

```javascript
// Generate Mermaid diagram
const mermaid = machine.visualize();
const mermaid = machine.visualize({ direction: 'LR' });

// Generate PlantUML diagram
const plantUml = machine.visualize({ type: 'plantuml' });
```

## Validation

```javascript
// Validate configuration
const result = machine.validate();
if (!result.valid) {
  console.error('Errors:', result.errors);
}

// Result structure
{
  valid: boolean,
  errors: [
    { type: 'INVALID_TARGET', state, event, target },
    { type: 'MISSING_GUARD', state, event, guard },
    { type: 'MISSING_ACTION', state, action }
  ],
  warnings: [
    { type: 'UNREACHABLE_STATE', state },
    { type: 'EMPTY_STATE', state }
  ]
}
```

## Complete Example

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'example',
  initial: 'idle',
  context: {
    count: 0,
    data: null
  },
  states: {
    idle: {
      entry: ['logEntry'],
      on: {
        START: {
          target: 'loading',
          cond: 'canStart',
          actions: [assign({ count: ({ context }) => context.count + 1 })]
        }
      }
    },
    loading: {
      entry: [async ({ event }) => {
        const data = await fetch(event.url);
        machine.send('LOADED', { data });
      }],
      on: {
        LOADED: {
          target: 'success',
          actions: [assign({ data: ({ event }) => event.data })]
        },
        ERROR: 'idle'
      }
    },
    success: {
      on: { RESET: 'idle' }
    }
  }
}, {
  guards: {
    canStart: ({ context }) => context.count < 3
  },
  actions: {
    logEntry: () => console.log('Entering state')
  }
});
```