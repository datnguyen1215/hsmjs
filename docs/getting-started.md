# Getting Started

Welcome to HSM! This guide will help you get up and running quickly.

## Installation

```bash
npm install hsm
```

## Basic Concepts

Before diving in, familiarize yourself with these core concepts:

- **States** - The different modes your application can be in
- **Transitions** - How you move between states
- **Events** - What triggers transitions
- **Actions** - Code that runs during transitions
- **Context** - Data that persists across states

## Your First State Machine

Let's build a simple toggle switch:

```javascript
import { createMachine } from 'hsm';

// 1. Create a machine
const machine = createMachine('toggle');

// 2. Define states
const off = machine.state('off');
const on = machine.state('on');

// 3. Define transitions
off.on('TOGGLE', on);
on.on('TOGGLE', off);

// 4. Set initial state
machine.initial(off);

// 5. Start using it
const toggle = machine.start();
console.log(toggle.current); // 'off'

await toggle.send('TOGGLE');
console.log(toggle.current); // 'on'
```

## Next Steps

- [Core Concepts](./concepts.md) - Understand states, transitions, and actions
- [API Reference](./api.md) - Complete API documentation
- [Examples](./examples/) - See real-world examples