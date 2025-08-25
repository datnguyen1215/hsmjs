# HSMJS

[![NPM Version](https://img.shields.io/npm/v/@datnguyen1215/hsmjs.svg)](https://www.npmjs.com/package/@datnguyen1215/hsmjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/datnguyen1215/hsmjs.svg)](https://github.com/datnguyen1215/hsmjs)
[![GitHub Issues](https://img.shields.io/github/issues/datnguyen1215/hsmjs.svg)](https://github.com/datnguyen1215/hsmjs/issues)

Lightweight hierarchical state machine for JavaScript with XState-like syntax.

<div style="text-align:center;"><img src="images/logo.svg" /></div>

## Features

<p style="line-height: 1.8; padding-left: 40px;">
✅ Zero Dependencies <br />
✅ XState-like Syntax <br />
✅ Nested States <br />
✅ Async Actions <br />
✅ TypeScript/JSDoc <br />
✅ History & Undo <br />
✅ State Visualization
</p>

## Installation

```bash
npm install @datnguyen1215/hsmjs
```

## Quick Start

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  context: { count: 0 },
  states: {
    inactive: {
      on: {
        TOGGLE: {
          target: 'active',
          actions: [assign({ count: ({ context }) => context.count + 1 })]
        }
      }
    },
    active: {
      entry: [() => console.log('Activated!')],
      on: { TOGGLE: 'inactive' }
    }
  }
});

// Use the machine
await toggleMachine.send('TOGGLE');  // inactive -> active, count: 1
console.log(toggleMachine.state);     // 'active'
console.log(toggleMachine.context);   // { count: 1 }
```


## Documentation

### Quick Links
- [**Quick Start**](https://datnguyen1215.github.io/hsmjs/#/README) - Get started in 5 minutes
- [**Syntax Cheatsheet**](https://datnguyen1215.github.io/hsmjs/#/syntax-cheatsheet) - All syntax on one page
- [**API Quick Reference**](https://datnguyen1215.github.io/hsmjs/#/api-quick-reference) - Most used methods
- [**Migration from XState**](https://datnguyen1215.github.io/hsmjs/#/migration-xstate) - Switching from XState

### Feature Guides
- [Context & assign()](https://datnguyen1215.github.io/hsmjs/#/features/context-management)
- [Actions](https://datnguyen1215.github.io/hsmjs/#/features/actions)
- [Guards](https://datnguyen1215.github.io/hsmjs/#/features/guards)
- [Events](https://datnguyen1215.github.io/hsmjs/#/features/events)
- [Nested States](https://datnguyen1215.github.io/hsmjs/#/features/nested-states)
- [Async Patterns](https://datnguyen1215.github.io/hsmjs/#/features/async-patterns)
- [History & Undo](https://datnguyen1215.github.io/hsmjs/#/features/history-undo)
- [Visualization](https://datnguyen1215.github.io/hsmjs/#/features/visualization)
- [Validation](https://datnguyen1215.github.io/hsmjs/#/features/validation)
- [Subscriptions](https://datnguyen1215.github.io/hsmjs/#/features/subscriptions)

### More Resources
- [Framework Integration](https://datnguyen1215.github.io/hsmjs/#/framework-integration) - React, Svelte, Vue
- [Examples](https://datnguyen1215.github.io/hsmjs/#/examples) - Real-world patterns
- [Full API Reference](https://datnguyen1215.github.io/hsmjs/#/api-reference) - Complete documentation

## License

MIT

