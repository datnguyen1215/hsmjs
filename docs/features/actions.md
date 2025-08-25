# Actions

## Syntax Quick Reference

```javascript
// Inline function action
actions: [() => console.log('Hello')]

// Named action reference
actions: ['logMessage']

// Context update with assign
actions: [assign({ loading: true })]

// Multiple actions
actions: [
  assign({ loading: true }),
  () => console.log('Loading...'),
  'fetchData'
]

// Entry/exit actions
entry: [() => console.log('Entering state')]
exit: [() => console.log('Leaving state')]
```

## Basic Usage

Actions are functions that execute during transitions:

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'example',
  initial: 'idle',
  context: { data: null },
  states: {
    idle: {
      entry: [() => console.log('Idle state entered')],
      exit: [() => console.log('Leaving idle state')],
      on: {
        FETCH: {
          target: 'loading',
          actions: [
            () => console.log('Starting fetch...'),
            assign({ loading: true })
          ]
        }
      }
    },
    loading: {
      entry: [
        async ({ context, event, machine }) => {
          const data = await fetch(event.url);
          machine.send('SUCCESS', { data });
        }
      ],
      on: {
        SUCCESS: {
          target: 'idle',
          actions: [assign({ data: ({ context, event, machine }) => event.data })]
        }
      }
    }
  }
});
```

## Action Types

### Inline Functions

Direct function definitions in the machine config:

```javascript
actions: [
  () => console.log('Simple action'),
  ({ context, event, machine }) => {
    console.log('Context:', context);
    console.log('Event:', event);
    console.log('Machine state:', machine.state);
  }
]
```

### Named Actions

Define reusable actions in machine options:

```javascript
const actions = {
  logEntry: () => console.log('Entering state'),
  incrementCounter: assign({ count: ({ context }) => context.count + 1 }),
  fetchData: async ({ context, event, machine }) => {
    const response = await fetch(event.url);
    return response.json();
  }
};

const machine = createMachine({
  states: {
    idle: {
      entry: ['logEntry'],  // Reference by name
      on: {
        FETCH: {
          actions: ['fetchData', 'incrementCounter']
        }
      }
    }
  }
}, { actions });  // Pass actions in options
```

### Context Updates (assign)

Special action for updating context:

```javascript
actions: [
  // Static value
  assign({ loading: true }),

  // Computed from context
  assign({ count: ({ context }) => context.count + 1 }),

  // Computed from event
  assign({ user: ({ context, event, machine }) => event.userData }),

  // Multiple updates
  assign({
    loading: false,
    data: ({ context, event, machine }) => event.data,
    timestamp: () => Date.now()
  })
]
```

### Async Actions

Actions can be asynchronous:

```javascript
entry: [
  async ({ context, event, machine }) => {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      machine.send('FETCH_SUCCESS', { data });
      return data;  // Available in result.results
    } catch (error) {
      machine.send('FETCH_ERROR', { error });
    }
  }
]
```

## Entry and Exit Actions

### Entry Actions

Execute when entering a state:

```javascript
states: {
  loading: {
    entry: [
      () => console.log('Started loading'),
      assign({ loading: true }),
      async () => {
        const data = await fetchData();
        machine.send('LOADED', { data });
      }
    ]
  }
}
```

### Exit Actions

Execute when leaving a state:

```javascript
states: {
  modal: {
    exit: [
      () => document.body.style.overflow = 'auto',
      () => console.log('Modal closed'),
      assign({ modalOpen: false })
    ]
  }
}
```

## Action Parameters

### Context, Event, and Machine Access

All actions receive context, event, and machine parameters:

```javascript
actions: [
  ({ context, event, machine }) => {
    // Access current context
    console.log('Current count:', context.count);

    // Access event data
    console.log('Event type:', event.type);
    console.log('Event payload:', event.data);

    // Access machine instance
    console.log('Current state:', machine.state);
    console.log('Machine ID:', machine.id);

    // Use all three
    const result = context.baseValue + event.increment;
    console.log('Result:', result);
  }
]
```

### Machine Parameter

All actions receive the machine instance as a third parameter:

```javascript
actions: [
  ({ context, event, machine }) => {
    // Send events to the same machine
    machine.send('ANOTHER_EVENT');

    // Access machine properties
    console.log('Current state:', machine.state);
    console.log('Machine ID:', machine.id);
  }
]
```

This enables actions to:
- Send events without external machine reference
- Access current state and context
- Read machine configuration

## Action Results

Actions can return values accessible in transition results:

```javascript
const machine = createMachine({
  states: {
    idle: {
      on: {
        CALCULATE: {
          actions: [
            () => 2 + 2,  // Returns 4
            async () => {
              const result = await complexCalculation();
              return result;  // Returns async result
            },
            'namedAction'  // Can also return value
          ]
        }
      }
    }
  }
});

// Get action results
const result = await machine.send('CALCULATE');
console.log(result.results);
// [
//   { value: 4 },
//   { value: <async result> },
//   { name: 'namedAction', value: <returned value> }
// ]
```

## Execution Order

Actions execute in specific order:

1. **Exit actions** of current state
2. **Transition actions**
3. **Entry actions** of target state

```javascript
const machine = createMachine({
  states: {
    stateA: {
      exit: [() => console.log('1. Exit A')],
      on: {
        GO: {
          target: 'stateB',
          actions: [() => console.log('2. Transition action')]
        }
      }
    },
    stateB: {
      entry: [() => console.log('3. Enter B')]
    }
  }
});

await machine.send('GO');
// Logs:
// 1. Exit A
// 2. Transition action
// 3. Enter B
```

## Side Effects

Actions are ideal for side effects:

```javascript
actions: [
  // DOM manipulation
  () => document.getElementById('modal').style.display = 'block',

  // Local storage
  ({ context }) => localStorage.setItem('state', JSON.stringify(context)),

  // Analytics
  ({ context, event, machine }) => analytics.track(event.type, { context }),

  // API calls
  async ({ context, event, machine }) => {
    await api.log({ action: event.type, timestamp: Date.now() });
  },

  // Sending other events
  () => machine.send('ANOTHER_EVENT')
]
```

## Common Pitfalls

### ❌ Expecting Synchronous Results from Async Actions

```javascript
// Wrong - can't access result immediately
entry: [async () => {
  const data = await fetchData();
  return data;
}]
// context.data is not automatically set

// Correct - send event with data
entry: [async () => {
  const data = await fetchData();
  machine.send('DATA_LOADED', { data });
}]
```

### ❌ Mutating Context in Actions

```javascript
// Wrong - directly mutates context
actions: [({ context }) => {
  context.count++;  // Mutation!
}]

// Correct - use assign
actions: [assign({
  count: ({ context }) => context.count + 1
})]
```

### ❌ Actions Depending on Order

```javascript
// Risky - assumes previousAction sets something
actions: [
  () => someValue = 5,
  () => console.log(someValue)  // Depends on previous action
]

// Better - pass data explicitly
actions: [
  assign({ value: 5 }),
  ({ context }) => console.log(context.value)
]
```

## Best Practices

1. **Use assign() for context updates** - never mutate directly
2. **Keep actions focused** - one action, one responsibility
3. **Use named actions** for reusability and testing
4. **Handle errors** in async actions
5. **Send events** for async results rather than returning
6. **Avoid dependencies** between actions in the same array
7. **Test actions independently** when possible