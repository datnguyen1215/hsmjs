# HSMJS

A lightweight hierarchical state machine library for JavaScript with XState-like syntax. Perfect for managing complex application state, UI flows, and business logic.

[![NPM Version](https://img.shields.io/npm/v/hsmjs.svg)](https://www.npmjs.com/package/hsmjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/your-username/hsmjs/workflows/Tests/badge.svg)](https://github.com/your-username/hsmjs/actions)

## Quick Start (30 seconds)

```bash
npm install hsmjs
```

```javascript
import { createMachine, assign } from 'hsmjs';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  context: { count: 0 },
  states: {
    inactive: {
      on: { TOGGLE: { target: 'active', actions: [assign({ count: ctx => ctx.count + 1 })] } }
    },
    active: {
      entry: [() => console.log('Activated!')],
      on: { TOGGLE: 'inactive' }
    }
  }
});

// Use it - no .start() needed!
const result = await toggleMachine.send('TOGGLE');
console.log(result.state); // 'active'
console.log(result.context.count); // 1
```

## Features

- ✅ **No .start() needed** - Use machine directly
- ✅ **Hierarchical States** - Nested states for complex logic
- ✅ **XState-like Syntax** - Familiar configuration format
- ✅ **Guards & Conditions** - Smart state transitions
- ✅ **Context Management** - Built-in state with `assign()`
- ✅ **Entry/Exit Actions** - Lifecycle hooks for states
- ✅ **Async Action Support** - Promise-based actions
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Zero Dependencies** - Lightweight bundle
- ✅ **Event Queuing** - Handles rapid event sequences

## Installation Options

### NPM/Yarn
```bash
npm install hsmjs
# or
yarn add hsmjs
```

### CDN (Browser)
```html
<script src="https://unpkg.com/hsmjs@latest/dist/index.umd.min.js"></script>
<script>
  const { createMachine, assign } = HSMJS;
  // Your code here
</script>
```

## Basic Usage Patterns

### Fire and Forget
```javascript
// Send events without waiting
machine.send('START');
machine.send('NEXT');
```

### Get Results
```javascript
// Wait for completion and get state + context
const result = await machine.send('FETCH', { url: '/api/data' });
console.log(result.state);    // New state
console.log(result.context);  // Updated context
console.log(result.results);  // Action return values
```

### Context Updates
```javascript
const counterMachine = createMachine({
  id: 'counter',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: [assign({ count: ctx => ctx.count + 1 })]
        }
      }
    }
  }
});

await counterMachine.send('INCREMENT');
console.log(counterMachine.context.count); // 1
```

### Conditional Transitions (Guards)
```javascript
const machine = createMachine({
  id: 'validation',
  initial: 'input',
  context: { value: '', attempts: 0 },
  states: {
    input: {
      on: {
        SUBMIT: [
          { target: 'success', cond: ctx => ctx.value.length > 0 },
          { target: 'error', actions: [assign({ attempts: ctx => ctx.attempts + 1 })] }
        ]
      }
    },
    success: {},
    error: { on: { TRY_AGAIN: 'input' } }
  }
});
```

## Framework Integration

### React Hook Example
```javascript
import { useReducer, useEffect } from 'react';
import { createMachine, assign } from 'hsmjs';

const useMachine = (machine) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsubscribe = machine.subscribe(() => forceUpdate());
    return unsubscribe;
  }, [machine]);

  return [machine.state, machine.context, machine.send.bind(machine)];
};

// In component
const [state, context, send] = useMachine(toggleMachine);
```

### Svelte Store Example
```javascript
import { writable } from 'svelte/store';
import { createMachine } from 'hsmjs';

const createMachineStore = (machine) => {
  const { subscribe, set } = writable({ state: machine.state, context: machine.context });

  machine.subscribe(() => {
    set({ state: machine.state, context: machine.context });
  });

  return {
    subscribe,
    send: machine.send.bind(machine)
  };
};
```

## Documentation

| Topic | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, basic concepts, first machine |
| [API Reference](docs/api-reference.md) | Complete API documentation |
| [Advanced Features](docs/advanced-features.md) | Guards, nested states, async actions |
| [Framework Integration](docs/framework-integration.md) | React, Svelte, Vue examples |
| [Examples & Patterns](docs/examples.md) | Real-world use cases |

## Browser Support

- Chrome 63+ | Firefox 67+ | Safari 13+ | Edge 79+ | Node.js 14+

## License

MIT © Dat Nguyen