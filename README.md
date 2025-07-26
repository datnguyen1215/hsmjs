# @datnguyen1215/hsmjs

[![npm version](https://badge.fury.io/js/@datnguyen1215%2Fhsmjs.svg)](https://badge.fury.io/js/@datnguyen1215%2Fhsmjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, powerful hierarchical state machine library for JavaScript with async support and zero dependencies.

## Features

- 🎯 **Simple, Intuitive API** - Start building state machines in minutes
- 📦 **Hierarchical States** - Organize complex states with parent-child relationships
- ⚡ **Async First** - Built-in support for async actions and transitions
- 🔥 **Fire-and-Forget Actions** - Execute non-blocking side effects
- 🪶 **Lightweight** - Zero dependencies, ~10KB minified
- 🧪 **Battle Tested** - Comprehensive test suite

## Installation

```bash
npm install @datnguyen1215/hsmjs
```

## Quick Example

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

// Create a simple toggle machine
const machine = createMachine('toggle');

const off = machine.state('off');
const on = machine.state('on');

off.on('TOGGLE', on);
on.on('TOGGLE', off);

machine.initial(off);

// Start the machine
const instance = machine.start();
console.log(instance.current); // 'off'

instance.send('TOGGLE');
console.log(instance.current); // 'on'
```

## Documentation

For comprehensive documentation, examples, and API reference, visit the [docs folder](./docs/README.md).

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api.md)
- [Examples](./docs/examples/)
- [Concepts](./docs/concepts.md)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build
```

## Release Process

See [RELEASE.md](./RELEASE.md) for information about the release process.

## License

MIT