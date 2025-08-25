# Migration from XState

This guide helps you migrate from XState to HSMJS. While HSMJS uses XState-like syntax, there are important differences.

## Quick Comparison

| Feature | XState | HSMJS |
|---------|---------|-------|
| **Service Start** | `interpret(machine).start()` | Not needed - use machine directly |
| **Send Events** | `service.send()` | `machine.send()` |
| **State Access** | `service.state.value` | `machine.state` |
| **Context Access** | `service.state.context` | `machine.context` |
| **Subscribe** | `service.subscribe()` | `machine.subscribe()` |
| **Invoke Services** | `invoke: { src: ... }` | Use async actions |
| **Parallel States** | Supported | Not supported |
| **History States** | `type: 'history'` | Use `machine.restore()` |
| **Activities** | Supported | Not supported |
| **Actors** | Supported | Not supported |

## Basic Migration

### Machine Creation

**XState:**
```javascript
import { createMachine, interpret } from 'xstate';

const machine = createMachine({
  id: 'toggle',
  initial: 'off',
  states: {
    off: { on: { TOGGLE: 'on' } },
    on: { on: { TOGGLE: 'off' } }
  }
});

const service = interpret(machine).start();
```

**HSMJS:**
```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'toggle',
  initial: 'off',
  states: {
    off: { on: { TOGGLE: 'on' } },
    on: { on: { TOGGLE: 'off' } }
  }
});

// No need to start - machine is ready to use
```

### Sending Events

**XState:**
```javascript
service.send('TOGGLE');
service.send({ type: 'TOGGLE' });
service.send('UPDATE', { data: 'value' });
```

**HSMJS:**
```javascript
machine.send('TOGGLE');
// Object form not supported - use string + payload
machine.send('UPDATE', { data: 'value' });

// Can await results
const result = await machine.send('TOGGLE');
```

### Accessing State

**XState:**
```javascript
console.log(service.state.value);    // Current state
console.log(service.state.context);  // Current context
console.log(service.state.matches('active'));  // Check state
```

**HSMJS:**
```javascript
console.log(machine.state);          // Current state
console.log(machine.context);        // Current context
console.log(machine.matches('active'));  // Check state
```

## Context Updates

### Assign Action

**XState:**
```javascript
import { assign } from 'xstate';

actions: assign({
  count: (context, event) => context.count + 1,
  data: (context, event) => event.data
})
```

**HSMJS:**
```javascript
import { assign } from '@datnguyen1215/hsmjs';

actions: [assign({
  count: ({ context, event }) => context.count + 1,
  data: ({ context, event }) => event.data
})]

// Note: Single parameter object with context and event
```

## Guards

**XState:**
```javascript
on: {
  SUBMIT: {
    target: 'success',
    cond: (context, event) => context.isValid
  }
}

// Or with named guards
cond: 'isValid'
```

**HSMJS:**
```javascript
on: {
  SUBMIT: {
    target: 'success',
    cond: ({ context, event }) => context.isValid
  }
}

// Named guards work the same
cond: 'isValid'
```

## Services and Async Operations

### Invoke Pattern

**XState:**
```javascript
states: {
  loading: {
    invoke: {
      src: 'fetchData',
      onDone: {
        target: 'success',
        actions: assign({ data: (context, event) => event.data })
      },
      onError: 'failure'
    }
  }
}
```

**HSMJS:**
```javascript
states: {
  loading: {
    entry: [async ({ context, event }) => {
      try {
        const data = await fetchData();
        machine.send('FETCH_SUCCESS', { data });
      } catch (error) {
        machine.send('FETCH_ERROR', { error });
      }
    }],
    on: {
      FETCH_SUCCESS: {
        target: 'success',
        actions: [assign({ data: ({ event }) => event.data })]
      },
      FETCH_ERROR: 'failure'
    }
  }
}
```

## Subscriptions

**XState:**
```javascript
const subscription = service.subscribe((state) => {
  console.log(state.value);
  console.log(state.context);
});

subscription.unsubscribe();
```

**HSMJS:**
```javascript
const unsubscribe = machine.subscribe((state, context) => {
  console.log(state);
  console.log(context);
});

unsubscribe();
```

## React Integration

**XState with @xstate/react:**
```javascript
import { useMachine } from '@xstate/react';

function Component() {
  const [state, send] = useMachine(machine);

  return (
    <div>
      {state.matches('active') && <p>Active</p>}
      <button onClick={() => send('TOGGLE')}>Toggle</button>
    </div>
  );
}
```

**HSMJS:**
```javascript
import { useEffect, useReducer } from 'react';

function useMachine(machine) {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsub = machine.subscribe(() => forceUpdate());
    return unsub;
  }, [machine]);

  return [machine, machine.send.bind(machine)];
}

function Component() {
  const [machine, send] = useMachine(myMachine);

  return (
    <div>
      {machine.matches('active') && <p>Active</p>}
      <button onClick={() => send('TOGGLE')}>Toggle</button>
    </div>
  );
}
```

## Features Not Supported in HSMJS

### Parallel States

**XState:**
```javascript
states: {
  upload: {
    type: 'parallel',
    states: {
      file: { /* ... */ },
      progress: { /* ... */ }
    }
  }
}
```

**HSMJS Alternative:**
Use context to track multiple states:
```javascript
context: {
  fileState: 'idle',
  progressState: 'idle'
}
```

### History States

**XState:**
```javascript
states: {
  editing: {
    type: 'history',
    history: 'shallow'
  }
}
```

**HSMJS Alternative:**
Use snapshots and restore:
```javascript
// Save state
const checkpoint = machine.snapshot;

// Restore later
await machine.restore(checkpoint);
```

### Activities

**XState:**
```javascript
activities: ['beeping']
```

**HSMJS Alternative:**
Use entry/exit actions:
```javascript
entry: [() => startBeeping()],
exit: [() => stopBeeping()]
```

## Migration Checklist

- [ ] Remove `interpret()` and `.start()` calls
- [ ] Change `service.send()` to `machine.send()`
- [ ] Update state access from `service.state.value` to `machine.state`
- [ ] Update context access from `service.state.context` to `machine.context`
- [ ] Convert `assign((context, event) => {})` to `assign(({ context, event }) => {})`
- [ ] Replace `invoke` with async actions
- [ ] Replace parallel states with context tracking
- [ ] Replace history states with snapshot/restore
- [ ] Update React hooks to custom useMachine
- [ ] Convert activities to entry/exit actions
- [ ] Remove actor references

## Complete Migration Example

### XState Version

```javascript
import { createMachine, interpret, assign } from 'xstate';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: { data: null },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      invoke: {
        src: async (context, event) => {
          const response = await fetch(event.url);
          return response.json();
        },
        onDone: {
          target: 'success',
          actions: assign({
            data: (context, event) => event.data
          })
        },
        onError: 'failure'
      }
    },
    success: {},
    failure: {}
  }
});

const service = interpret(fetchMachine).start();
service.send('FETCH', { url: '/api/data' });
```

### HSMJS Version

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: { data: null },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      entry: [async ({ context, event }) => {
        try {
          const response = await fetch(event.url);
          const data = await response.json();
          fetchMachine.send('SUCCESS', { data });
        } catch (error) {
          fetchMachine.send('ERROR', { error });
        }
      }],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({
            data: ({ context, event }) => event.data
          })]
        },
        ERROR: 'failure'
      }
    },
    success: {},
    failure: {}
  }
});

// No need to start - just send events
fetchMachine.send('FETCH', { url: '/api/data' });
```

## Benefits of HSMJS

1. **Simpler API** - No service layer, direct machine usage
2. **Built-in History** - Automatic state history tracking
3. **Easier Testing** - No need to mock services
4. **Smaller Bundle** - Fewer abstractions
5. **Direct State Access** - `machine.state` and `machine.context`
6. **Priority Events** - `sendPriority()` for emergency handling
7. **Queue Management** - `clearQueue()` for control

## Getting Help

If you encounter migration issues not covered here:

1. Check the [API Reference](api-reference.md)
2. Review [Examples](examples.md)
3. File an issue on GitHub