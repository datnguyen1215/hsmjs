# Getting Started with HSMJS

A simplified state machine library for JavaScript applications.

## Installation

```bash
npm install @datnguyen1215/hsmjs
```

## Quick Start

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'off',
  context: { count: 0 },
  states: {
    off: {
      on: {
        TOGGLE: {
          target: 'on',
          actions: [assign({ count: ({ context }) => context.count + 1 })]
        }
      }
    },
    on: {
      on: { TOGGLE: 'off' }
    }
  }
});

// Usage
await toggleMachine.send('TOGGLE');  // off -> on
console.log(toggleMachine.state);    // 'on'
console.log(toggleMachine.context);  // { count: 1 }
```

## Core Concepts

### States & Transitions
```javascript
states: {
  idle: {
    on: { START: 'loading' }  // Event START transitions to loading state
  }
}
```

### Context (Persistent Data)
```javascript
context: { count: 0 },
actions: [assign({ count: ({ context }) => context.count + 1 })]
```

### Actions (Side Effects)
```javascript
entry: [() => console.log('Entering')],   // On state entry
exit: [() => console.log('Leaving')],     // On state exit
actions: [async () => await fetchData()]  // During transition
```




## Event Handling

```javascript
// Fire and forget
machine.send('EVENT');

// Await results
const result = await machine.send('EVENT');
console.log(result.state);    // New state
console.log(result.context);  // Updated context
console.log(result.results);  // Action return values
```


## Visualization

```javascript
const diagram = machine.visualize();
// Outputs Mermaid diagram - render at mermaid.live
```

## API Quick Reference

```javascript
// Create machine
const machine = createMachine(config);

// Send events
machine.send('EVENT');                      // Fire and forget
const result = await machine.send('EVENT'); // Get results

// Access state
machine.state                               // Current state
machine.context                             // Current context
machine.matches('state')                    // Check state

// Update context
assign({ key: value })                      // Static value
assign({ key: ({ context }) => newValue })  // Computed value

// Subscribe to changes
const unsubscribe = machine.subscribe((state, context) => {
  console.log('State:', state, 'Context:', context);
});
```

## Documentation

- [API Reference](api-reference.md) - Complete method documentation
- [Examples & Patterns](examples.md) - Common use cases
- [Feature Guides](features/guards.md) - Advanced features
- [Framework Integration](framework-integration.md) - React, Vue, Svelte
