# Context Management

## Syntax Quick Reference

```javascript
// Static value assignment
assign({ loading: true })

// Function form - computed from context
assign({ count: ({ context }) => context.count + 1 })

// Access event data
assign({ user: ({ context, event, machine }) => event.userData })

// Multiple updates
assign({
  loading: false,
  data: ({ context, event, machine }) => event.data,
  timestamp: () => Date.now()
})

// Nested object updates
assign({
  user: ({ context, event, machine }) => ({
    ...context.user,
    name: event.name
  })
})
```

## Basic Usage

Context holds persistent data across state transitions:

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const counterMachine = createMachine({
  id: 'counter',
  initial: 'idle',
  context: {
    count: 0,
    lastAction: null
  },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: [assign({
            count: ({ context }) => context.count + 1,
            lastAction: () => 'increment'
          })]
        },
        DECREMENT: {
          actions: [assign({
            count: ({ context }) => context.count - 1,
            lastAction: () => 'decrement'
          })]
        },
        RESET: {
          actions: [assign({ count: 0, lastAction: () => 'reset' })]
        }
      }
    }
  }
});

// Usage
await counterMachine.send('INCREMENT');
console.log(counterMachine.context);  // { count: 1, lastAction: 'increment' }
```

## Configuration

### Initial Context

Set initial context values when creating the machine:

```javascript
const machine = createMachine({
  context: {
    // Primitive values
    count: 0,
    loading: false,

    // Objects and arrays
    user: null,
    items: [],
    settings: { theme: 'light' }
  }
});
```

### Context Update Patterns

```javascript
// Replace entire value
assign({ items: [] })

// Computed from current context
assign({ count: ({ context }) => context.count + 1 })

// Computed from event
assign({ searchQuery: ({ context, event, machine }) => event.query })

// Mixed static and computed
assign({
  loading: true,  // Static
  timestamp: () => Date.now(),  // Computed
  query: ({ context, event, machine }) => event.text  // From event
})
```

## Advanced Patterns

### Array Manipulation

```javascript
// Add item to array
assign({
  items: ({ context, event, machine }) => [...context.items, event.item]
})

// Remove item from array
assign({
  items: ({ context, event, machine }) =>
    context.items.filter(item => item.id !== event.itemId)
})

// Update item in array
assign({
  items: ({ context, event, machine }) =>
    context.items.map(item =>
      item.id === event.itemId
        ? { ...item, ...event.updates }
        : item
    )
})
```

### Nested Object Updates

```javascript
// Update nested property
assign({
  settings: ({ context, event, machine }) => ({
    ...context.settings,
    theme: event.theme
  })
})

// Deep nested update
assign({
  user: ({ context, event, machine }) => ({
    ...context.user,
    profile: {
      ...context.user.profile,
      email: event.email
    }
  })
})
```

### Conditional Updates

```javascript
// Update based on condition
assign({
  status: ({ context, event, machine }) =>
    event.success ? 'completed' : 'failed',
  error: ({ context, event, machine }) =>
    event.success ? null : event.error
})
```

## API Methods

### `assign(updater)`

Creates an action that updates machine context.

**Parameters:**
- `updater` (Object | Function): Context update specification

**Returns:** Action function

**Signatures:**
```javascript
// Object with static values
assign({ key: value })

// Object with functions for computed values
assign({
  key: ({ context, event, machine }) => computedValue
})

// Mixed static and computed
assign({
  staticKey: 'value',
  computedKey: ({ context }) => context.value + 1
})
```

### Accessing Context

```javascript
// Get current context
const currentContext = machine.context;

// Subscribe to context changes
machine.subscribe((state, context) => {
  console.log('Context updated:', context);
});

// Context in guards
cond: ({ context, event, machine }) => context.count < 10

// Context in actions
actions: [({ context, event, machine }) => {
  console.log('Current context:', context);
}]
```

## Common Pitfalls

### [ERROR] Mutating Context Directly

```javascript
// Wrong - mutates context
actions: [({ context }) => {
  context.count++;  // Don't do this!
}]

// Correct - use assign
actions: [assign({
  count: ({ context }) => context.count + 1
})]
```

### [ERROR] Forgetting to Return New Objects

```javascript
// Wrong - returns same array reference
assign({
  items: ({ context, event, machine }) => {
    context.items.push(event.item);  // Mutation!
    return context.items;
  }
})

// Correct - returns new array
assign({
  items: ({ context, event, machine }) => [...context.items, event.item]
})
```

### [ERROR] Overwriting Entire Context

```javascript
// Wrong - loses other context properties
assign(({ context }) => ({
  count: context.count + 1
}))

// Correct - only updates specified properties
assign({
  count: ({ context }) => context.count + 1
})
```

## Best Practices

1. **Keep context flat** when possible for easier updates
2. **Use functions** for computed values, not static values that could be stale
3. **Return new objects/arrays** to maintain immutability
4. **Update only what changed** to minimize re-renders in UI frameworks
5. **Initialize all properties** in initial context to avoid undefined errors