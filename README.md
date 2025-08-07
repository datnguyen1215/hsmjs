# HSMJS

A lightweight hierarchical state machine library for JavaScript with XState-like syntax. Perfect for managing complex application state, UI flows, and business logic.

[![NPM Version](https://img.shields.io/npm/v/hsmjs.svg)](https://www.npmjs.com/package/hsmjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/your-username/hsmjs/workflows/Tests/badge.svg)](https://github.com/your-username/hsmjs/actions)

## Installation

### NPM
```bash
npm install hsmjs
```

### Yarn
```bash
yarn add hsmjs
```

### CDN (Browser)
```html
<script src="https://unpkg.com/hsmjs@latest/dist/index.umd.min.js"></script>
```

## Usage Examples

### ES6 Modules (Recommended)
```javascript
import { createMachine, assign } from 'hsmjs';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  context: {
    count: 0
  },
  states: {
    inactive: {
      on: {
        TOGGLE: {
          target: 'active',
          actions: [
            assign({ count: (context) => context.count + 1 })
          ]
        }
      }
    },
    active: {
      entry: [() => console.log('Activated!')],
      exit: [() => console.log('Deactivated!')],
      on: {
        TOGGLE: 'inactive'
      }
    }
  }
});

const service = toggleMachine.start();
const result = service.send('TOGGLE');
console.log('Current state:', result.state.value); // 'active'
console.log('Count:', result.state.context.count); // 1
```

### CommonJS
```javascript
const { createMachine, assign } = require('hsmjs');

const machine = createMachine({
  id: 'counter',
  initial: 'idle',
  context: { value: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: [assign({ value: (ctx) => ctx.value + 1 })]
        }
      }
    }
  }
});

const service = machine.start();
service.send('INCREMENT');
```

### Browser (UMD)
```html
<script src="https://unpkg.com/hsmjs@latest/dist/index.umd.min.js"></script>
<script>
  const { createMachine, assign } = HSMJS;

  const machine = createMachine({
    id: 'browser-machine',
    initial: 'loading',
    states: {
      loading: {
        on: { LOADED: 'ready' }
      },
      ready: {
        on: { RESET: 'loading' }
      }
    }
  });

  const service = machine.start();
  service.send('LOADED');
</script>
```

## Features

- ✅ **Hierarchical State Machines** - Nested states for complex logic
- ✅ **XState-like Syntax** - Familiar configuration format
- ✅ **Guards & Conditional Transitions** - Smart state transitions
- ✅ **Context Management** - Built-in state with `assign()`
- ✅ **Entry/Exit Actions** - Lifecycle hooks for states
- ✅ **Action References** - String-based action mapping
- ✅ **Async Action Support** - Promise-based actions
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Multiple Module Formats** - ESM, CommonJS, and UMD builds
- ✅ **Lightweight** - Small bundle size, zero dependencies
- ✅ **Event Queuing** - Handles rapid event sequences
- ✅ **Results API** - Capture action return values

## Advanced Examples

### Hierarchical States
```javascript
import { createMachine } from 'hsmjs';

const authMachine = createMachine({
  id: 'auth',
  initial: 'loggedOut',
  states: {
    loggedOut: {
      on: { LOGIN: 'authenticating' }
    },
    authenticating: {
      on: {
        SUCCESS: 'loggedIn',
        FAILURE: 'loggedOut'
      }
    },
    loggedIn: {
      initial: 'dashboard',
      states: {
        dashboard: {
          on: { GO_TO_PROFILE: 'profile' }
        },
        profile: {
          on: { GO_TO_DASHBOARD: 'dashboard' }
        }
      },
      on: { LOGOUT: 'loggedOut' }
    }
  }
});
```

### Guards and Conditional Logic
```javascript
import { createMachine, assign } from 'hsmjs';

const counterMachine = createMachine({
  id: 'counter',
  initial: 'active',
  context: { count: 0 },
  states: {
    active: {
      on: {
        INCREMENT: {
          target: 'active',
          actions: [assign({ count: (ctx) => ctx.count + 1 })],
          cond: (context) => context.count < 10
        },
        INCREMENT: {
          target: 'maxed',
          cond: (context) => context.count >= 10
        }
      }
    },
    maxed: {
      on: {
        RESET: {
          target: 'active',
          actions: [assign({ count: 0 })]
        }
      }
    }
  }
});
```

### Async Actions
```javascript
import { createMachine, assign } from 'hsmjs';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: { data: null, error: null },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      entry: [
        async (context, event) => {
          const response = await fetch(event.url);
          const data = await response.json();
          return { data };
        }
      ],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({ data: (ctx, event) => event.data })]
        },
        ERROR: {
          target: 'error',
          actions: [assign({ error: (ctx, event) => event.error })]
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

## API Reference

### `createMachine(config)`
Creates a new state machine from the configuration object.

### `machine.start()`
Starts the machine and returns a service that can receive events.

### `service.send(event, payload?)`
Sends an event to the machine. Returns the new state.

### `assign(updater)`
Creates an action that updates the machine's context.

## TypeScript Support

HSMJS includes full TypeScript definitions:

```typescript
import { createMachine, assign, MachineConfig } from 'hsmjs';

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
          actions: [assign({ count: (ctx) => ctx.count + 1 })]
        }
      }
    }
  }
};
```

## Module Formats

HSMJS is distributed in multiple formats:

- **ES Modules**: `dist/index.mjs` (recommended)
- **CommonJS**: `dist/index.cjs`
- **UMD**: `dist/index.umd.js` (browser)
- **UMD Minified**: `dist/index.umd.min.js` (production)

## Browser Support

- Chrome 63+
- Firefox 67+
- Safari 13+
- Edge 79+
- Node.js 14+

## Documentation

For complete API documentation, see [docs/api.md](docs/api.md).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT © Dat Nguyen

---

Made with ❤️ for the JavaScript community