# Getting Started with HSMJS

This guide will get you up and running with HSMJS in minutes.

## Installation

Choose your preferred method:

```bash
# NPM
npm install @datnguyen1215/hsmjs

# Yarn
yarn add @datnguyen1215/hsmjs

# PNPM
pnpm add @datnguyen1215/hsmjs
```

### CDN (Browser)
```html
<script src="https://unpkg.com/@datnguyen1215/hsmjs@latest/dist/index.umd.min.js"></script>
<script>
  const { createMachine, assign } = HSMJS;
  // Ready to use!
</script>
```

## Core Concepts

HSMJS helps you manage complex state logic using **state machines**. Think of it as a more predictable alternative to complex if/else chains or manual state management.

### What is a State Machine?

A state machine has:
- **States**: The different modes your application can be in
- **Events**: Things that can happen (user clicks, API responses, etc.)
- **Transitions**: How events move you from one state to another
- **Context**: Data that persists across states
- **Actions**: Side effects that happen during transitions
- **History**: Automatic state tracking and persistence for undo/restore functionality
- **Visualization**: Generate diagrams to understand your state machine

## Your First Machine

Let's build a simple toggle switch:

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const toggleMachine = createMachine({
  id: 'toggle',           // Unique identifier
  initial: 'off',         // Starting state
  context: {              // Persistent data
    clickCount: 0
  },
  states: {
    off: {
      on: {
        TOGGLE: {
          target: 'on',   // Go to 'on' state
          actions: [assign({ clickCount: ({ context }) => context.clickCount + 1 })]
        }
      }
    },
    on: {
      entry: [() => console.log('Light is on!')],  // Run when entering state
      exit: [() => console.log('Light is off!')],  // Run when leaving state
      on: {
        TOGGLE: 'off'     // Simple transition (no actions)
      }
    }
  }
});

// Use the machine
await toggleMachine.send('TOGGLE');         // off → on
console.log(toggleMachine.state);           // 'on'
console.log(toggleMachine.context);         // { clickCount: 1 }

await toggleMachine.send('TOGGLE');         // on → off
console.log(toggleMachine.context);         // { clickCount: 1 }
```

## Visualizing Your Machine

HSMJS can generate Mermaid diagrams to help you understand and document your state machines:

```javascript
const diagram = toggleMachine.visualize();
console.log(diagram);
// Copy output to any Mermaid-compatible tool
```

You can render the output at:
- [Mermaid Live Editor](https://mermaid.live) - Interactive online editor
- GitHub/GitLab Markdown files - Automatic rendering in READMEs
- VS Code with Mermaid extensions - Preview in your editor
- Any documentation tool supporting Mermaid syntax

## Key Differences from XState

HSMJS simplifies the XState API:

### No .start() Method
```javascript
// XState
const service = machine.start();
service.send('EVENT');

// HSMJS - use machine directly
machine.send('EVENT');
```

### Direct State Access
```javascript
// XState
service.state.value
service.state.context

// HSMJS
machine.state
machine.context
```

### Simpler Results
```javascript
// HSMJS returns promise with state info
const result = await machine.send('EVENT');
console.log(result.state);    // Current state
console.log(result.context);  // Current context
console.log(result.results);  // Action return values
```

## Working with Context

Context holds data that survives state transitions:

```javascript
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

// Use it
await counterMachine.send('INCREMENT');
console.log(counterMachine.context);  // { count: 1, lastAction: 'increment' }

await counterMachine.send('INCREMENT');
console.log(counterMachine.context);  // { count: 2, lastAction: 'increment' }

await counterMachine.send('RESET');
console.log(counterMachine.context);  // { count: 0, lastAction: 'reset' }
```

## Actions Deep Dive

Actions are functions that run during transitions. They can:

### Update Context
```javascript
actions: [assign({ loading: true })]
```

### Perform Side Effects
```javascript
actions: [
  () => console.log('Logging something'),
  async () => {
    const data = await fetch('/api/data');
    return data; // Available in result.results
  }
]
```

### Access Context and Event Data
```javascript
actions: [
  assign({
    message: ({ context, event }) => `Hello ${event.name}!`
  })
]
```

## Fire and Forget vs Awaiting

You have two ways to send events:

### Fire and Forget (Non-blocking)
```javascript
// Send event and continue immediately
machine.send('START');
machine.send('NEXT');
machine.send('FINISH');
// All events are queued and processed in order
```

### Await Results (Blocking)
```javascript
// Wait for each transition to complete
const result1 = await machine.send('START');
const result2 = await machine.send('NEXT');
const result3 = await machine.send('FINISH');

// Each result contains:
console.log(result1.state);    // New state after START
console.log(result1.context);  // Updated context
console.log(result1.results);  // Return values from actions
```

## Event Queuing

HSMJS automatically queues events when the machine is busy:

```javascript
// Send multiple events rapidly
machine.send('EVENT1');  // Processes immediately
machine.send('EVENT2');  // Queued
machine.send('EVENT3');  // Queued

// Events process in order: EVENT1 → EVENT2 → EVENT3
```

## Common Patterns

### Loading States
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
      entry: [async ({ context, event }) => {
        try {
          const response = await fetch(event.url);
          const data = await response.json();
          machine.send('SUCCESS', { data });
        } catch (error) {
          machine.send('ERROR', { error });
        }
      }],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({ data: ({ context, event }) => event.data })]
        },
        ERROR: {
          target: 'error',
          actions: [assign({ error: ({ context, event }) => event.error })]
        }
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

### Form Validation
```javascript
const formMachine = createMachine({
  id: 'form',
  initial: 'editing',
  context: {
    values: {},
    errors: {}
  },
  states: {
    editing: {
      on: {
        CHANGE: {
          actions: [assign({
            values: ({ context, event }) => ({
              ...context.values,
              [event.field]: event.value
            })
          })]
        },
        SUBMIT: 'validating'
      }
    },
    validating: {
      entry: [({ context }) => {
        const errors = validateForm(context.values);
        if (Object.keys(errors).length > 0) {
          machine.send('INVALID', { errors });
        } else {
          machine.send('VALID');
        }
      }],
      on: {
        VALID: 'submitting',
        INVALID: {
          target: 'editing',
          actions: [assign({ errors: ({ context, event }) => event.errors })]
        }
      }
    },
    submitting: {
      entry: [async ({ context }) => {
        try {
          await submitForm(context.values);
          machine.send('SUCCESS');
        } catch (error) {
          machine.send('FAILURE', { error });
        }
      }],
      on: {
        SUCCESS: 'success',
        FAILURE: 'editing'
      }
    },
    success: {}
  }
});
```

## Next Steps

Now that you understand the basics:

- [API Reference](api-reference.md) - Complete method documentation
- [Advanced Features](advanced-features.md) - Guards, nested states, async patterns
- [Framework Integration](framework-integration.md) - React, Svelte, Vue examples
- [Examples & Patterns](examples.md) - Real-world use cases

## Quick Reference

```javascript
// Create machine
const machine = createMachine(config);

// Send events
machine.send('EVENT');                    // Fire and forget
const result = await machine.send('EVENT'); // Get results

// Access state
machine.state          // Current state name
machine.context        // Current context data
machine.matches('state') // Check if in specific state

// Context updates
assign({ key: value })                    // Set static value
assign({ key: ({ context, event }) => newValue }) // Computed value

// Subscribe to changes
const unsubscribe = machine.subscribe((state, context) => {
  console.log('State changed to:', state);
});
```