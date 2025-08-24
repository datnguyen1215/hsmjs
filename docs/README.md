# HSMJS Documentation

> A lightweight hierarchical state machine library for JavaScript with XState-like syntax

## Quick Start

Install HSMJS in your project:

```bash
npm install @datnguyen1215/hsmjs
```

Create your first state machine:

```javascript
import { createMachine } from '@datnguyen1215/hsmjs'

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'off',
  states: {
    off: {
      on: { TOGGLE: 'on' }
    },
    on: {
      on: { TOGGLE: 'off' }
    }
  }
})

// Use the machine
console.log(toggleMachine.state) // 'off'
await toggleMachine.send('TOGGLE')
console.log(toggleMachine.state) // 'on'
```

## Key Features

- ✅ **Hierarchical States** - Build complex state logic with nested states
- ✅ **XState-like Syntax** - Familiar configuration format for easy migration
- ✅ **Guards & Conditions** - Control transitions with conditional logic
- ✅ **Context Management** - Built-in state management with `assign()`
- ✅ **Async Actions** - Handle promises and async operations seamlessly
- ✅ **History Tracking** - Built-in undo/redo with configurable history
- ✅ **State Visualization** - Generate Mermaid & PlantUML diagrams automatically
- ✅ **Zero Dependencies** - Lightweight and performant

## Documentation Sections

### [Getting Started](getting-started.md)
Learn the fundamentals of HSMJS, core concepts, and build your first state machine.

### [API Reference](api-reference.md)
Complete API documentation for all methods, configuration options, and utilities.

### [Examples](examples.md)
Real-world examples and patterns including UI components, data fetching, and game logic.

### [Framework Integration](framework-integration.md)
Integration guides for React, Vue, Svelte, and vanilla JavaScript applications.

### [Advanced Features](advanced-features.md)
Deep dive into hierarchical states, guards, async actions, and performance optimization.

## Popular Use Cases

- **UI State Management** - Modals, dropdowns, navigation flows
- **Form Validation** - Multi-step forms, field dependencies
- **Data Fetching** - Loading states, retry logic, caching
- **Authentication Flows** - Login, logout, session management
- **Game Logic** - Turn-based games, player states
- **Background Processes** - File uploads, synchronization

## Why HSMJS?

HSMJS combines the power of hierarchical state machines with a simple, intuitive API. Unlike other solutions, it provides:

- **No build step required** - Works directly in the browser
- **Familiar syntax** - If you know XState, you know HSMJS
- **Lightweight** - Under 10KB minified
- **Full TypeScript support** - Complete type definitions included
- **Battle-tested** - Used in production applications

## Getting Help

- [GitHub Issues](https://github.com/datnguyen1215/hsmjs/issues) - Report bugs or request features
- [Discussions](https://github.com/datnguyen1215/hsmjs/discussions) - Ask questions and share ideas
- [NPM Package](https://www.npmjs.com/package/@datnguyen1215/hsmjs) - View package details

## License

MIT © Dat Nguyen