# Subscriptions

## Syntax Quick Reference

```javascript
// Subscribe to state changes
const unsubscribe = machine.subscribe((state, context) => {
  console.log('State:', state);
  console.log('Context:', context);
});

// Unsubscribe when done
unsubscribe();

// Multiple subscribers
const unsub1 = machine.subscribe(listener1);
const unsub2 = machine.subscribe(listener2);
```

## Basic Usage

Subscribe to state and context changes:

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'counter',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: [assign({ count: ({ context }) => context.count + 1 })]
        },
        DECREMENT: {
          actions: [assign({ count: ({ context }) => context.count - 1 })]
        }
      }
    }
  }
});

// Subscribe to changes
const unsubscribe = machine.subscribe((state, context) => {
  console.log(`State: ${state}, Count: ${context.count}`);
});

// Trigger changes
await machine.send('INCREMENT');  // Logs: "State: idle, Count: 1"
await machine.send('INCREMENT');  // Logs: "State: idle, Count: 2"
await machine.send('DECREMENT');  // Logs: "State: idle, Count: 1"

// Clean up
unsubscribe();
```

## Subscription Callback

### Callback Parameters

The subscription callback receives two parameters:

```javascript
machine.subscribe((state, context) => {
  // state: string - Current state name (e.g., 'idle', 'parent.child')
  // context: object - Current context object
});
```

### When Callbacks Fire

Subscribers are notified:
- After state transitions
- After context updates
- After restore operations
- Even if state name doesn't change (context-only updates)

```javascript
const machine = createMachine({
  initial: 'idle',
  context: { value: 0 },
  states: {
    idle: {
      on: {
        UPDATE: {
          // No state change, only context
          actions: [assign({ value: ({ event }) => event.value })]
        },
        CHANGE: 'active'
      }
    },
    active: {}
  }
});

machine.subscribe((state, context) => {
  console.log(`Notified: ${state}, value: ${context.value}`);
});

await machine.send('UPDATE', { value: 5 });  // Fires: state still 'idle'
await machine.send('CHANGE');                // Fires: state now 'active'
```

## Multiple Subscribers

### Managing Multiple Listeners

```javascript
const subscribers = [];

// Add multiple subscribers
subscribers.push(
  machine.subscribe((state, context) => {
    console.log('Logger:', state);
  })
);

subscribers.push(
  machine.subscribe((state, context) => {
    updateUI(state, context);
  })
);

subscribers.push(
  machine.subscribe((state, context) => {
    saveToStorage(state, context);
  })
);

// All subscribers notified on changes
await machine.send('EVENT');  // All three fire

// Clean up all
subscribers.forEach(unsub => unsub());
```

### Execution Order

Subscribers execute in registration order:

```javascript
machine.subscribe(() => console.log('First'));
machine.subscribe(() => console.log('Second'));
machine.subscribe(() => console.log('Third'));

await machine.send('EVENT');
// Logs:
// "First"
// "Second"
// "Third"
```

## Framework Integration

### React Hook

```javascript
import { useEffect, useReducer } from 'react';

function useMachine(machine) {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsubscribe = machine.subscribe(() => {
      forceUpdate();
    });

    return unsubscribe;  // Cleanup on unmount
  }, [machine]);

  return {
    state: machine.state,
    context: machine.context,
    send: machine.send.bind(machine)
  };
}

// Usage in component
function Counter() {
  const { state, context, send } = useMachine(counterMachine);

  return (
    <div>
      <p>Count: {context.count}</p>
      <button onClick={() => send('INCREMENT')}>+</button>
      <button onClick={() => send('DECREMENT')}>-</button>
    </div>
  );
}
```

### Svelte Store

```javascript
import { writable } from 'svelte/store';

function createMachineStore(machine) {
  const { subscribe, set } = writable({
    state: machine.state,
    context: machine.context
  });

  // Update store when machine changes
  machine.subscribe((state, context) => {
    set({ state, context });
  });

  return {
    subscribe,
    send: machine.send.bind(machine)
  };
}

// Usage in component
const store = createMachineStore(machine);
```

### Vue Composition API

```javascript
import { ref, onUnmounted } from 'vue';

function useMachine(machine) {
  const state = ref(machine.state);
  const context = ref(machine.context);

  const unsubscribe = machine.subscribe((newState, newContext) => {
    state.value = newState;
    context.value = newContext;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return {
    state,
    context,
    send: machine.send.bind(machine)
  };
}
```

## Advanced Patterns

### Selective Updates

Only react to specific changes:

```javascript
let previousState = machine.state;

machine.subscribe((state, context) => {
  // Only react to state changes, not context changes
  if (state !== previousState) {
    console.log('State changed to:', state);
    previousState = state;
  }
});
```

### Debounced Updates

Prevent too many updates:

```javascript
let debounceTimer;

machine.subscribe((state, context) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updateExpensiveUI(state, context);
  }, 100);
});
```

### Conditional Subscriptions

Subscribe based on conditions:

```javascript
function conditionalSubscribe(machine, condition, callback) {
  return machine.subscribe((state, context) => {
    if (condition(state, context)) {
      callback(state, context);
    }
  });
}

// Only notify when count > 10
const unsubscribe = conditionalSubscribe(
  machine,
  (state, context) => context.count > 10,
  (state, context) => console.log('Count exceeded 10!')
);
```

### Logging Subscriber

Debug state changes:

```javascript
if (process.env.NODE_ENV === 'development') {
  machine.subscribe((state, context) => {
    console.group(`🎯 State: ${state}`);
    console.log('Context:', context);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  });
}
```

## State Persistence

### Auto-save with Subscriptions

```javascript
// Save to localStorage on every change
machine.subscribe((state, context) => {
  const snapshot = machine.snapshot;
  localStorage.setItem('machineState', JSON.stringify(snapshot));
});

// Restore on startup
const saved = localStorage.getItem('machineState');
if (saved) {
  const snapshot = JSON.parse(saved);
  machine.restore(snapshot);
}
```

### Sync Across Tabs

```javascript
// Broadcast changes to other tabs
machine.subscribe((state, context) => {
  const channel = new BroadcastChannel('machine-sync');
  channel.postMessage({ state, context });
});

// Listen for changes from other tabs
const channel = new BroadcastChannel('machine-sync');
channel.onmessage = (event) => {
  const { state, context } = event.data;
  // Update local UI
};
```

## Analytics Integration

```javascript
machine.subscribe((state, context) => {
  // Track state changes
  analytics.track('state_change', {
    from: previousState,
    to: state,
    context: context
  });

  // Track specific states
  if (state === 'checkout.complete') {
    analytics.track('purchase_complete', {
      amount: context.total
    });
  }

  previousState = state;
});
```

## Memory Management

### Preventing Memory Leaks

Always unsubscribe when done:

```javascript
class Component {
  constructor() {
    this.unsubscribe = machine.subscribe(this.handleChange);
  }

  handleChange = (state, context) => {
    // Handle changes
  }

  destroy() {
    // Critical: Clean up subscription
    this.unsubscribe();
  }
}
```

### Weak References Pattern

For automatic cleanup:

```javascript
const subscribers = new WeakMap();

function autoSubscribe(component, machine, callback) {
  const unsubscribe = machine.subscribe(callback);
  subscribers.set(component, unsubscribe);
  return unsubscribe;
}

function autoUnsubscribe(component) {
  const unsubscribe = subscribers.get(component);
  if (unsubscribe) {
    unsubscribe();
    subscribers.delete(component);
  }
}
```

## Common Pitfalls

### [ERROR] Forgetting to Unsubscribe

```javascript
// Wrong - memory leak
function setupListener() {
  machine.subscribe((state) => {
    console.log(state);
  });
  // No cleanup!
}

// Correct - store and clean up
function setupListener() {
  const unsubscribe = machine.subscribe((state) => {
    console.log(state);
  });

  // Clean up when done
  window.addEventListener('beforeunload', unsubscribe);
  return unsubscribe;
}
```

### [ERROR] Modifying State in Subscriber

```javascript
// Wrong - causes infinite loop
machine.subscribe((state, context) => {
  if (context.count > 10) {
    machine.send('RESET');  // Triggers another notification!
  }
});

// Better - use setTimeout to break cycle
machine.subscribe((state, context) => {
  if (context.count > 10) {
    setTimeout(() => machine.send('RESET'), 0);
  }
});
```

### [ERROR] Heavy Operations in Subscribers

```javascript
// Wrong - blocks state machine
machine.subscribe((state, context) => {
  performExpensiveCalculation();  // Blocks
  updateComplexUI();              // Blocks
});

// Better - defer heavy work
machine.subscribe((state, context) => {
  requestAnimationFrame(() => {
    performExpensiveCalculation();
    updateComplexUI();
  });
});
```

## Best Practices

1. **Always unsubscribe** when component unmounts
2. **Keep subscribers lightweight** - defer heavy work
3. **Avoid state mutations** inside subscribers
4. **Use single subscription** per component when possible
5. **Handle errors** in subscription callbacks
6. **Test cleanup** to prevent memory leaks
7. **Consider debouncing** for frequent updates