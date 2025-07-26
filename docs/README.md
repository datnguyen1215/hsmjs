# Hierarchical State Machine (HSM)

A lightweight, powerful JavaScript state machine library with hierarchical states, async actions, and a clean API. Perfect for managing complex application state with minimal boilerplate.

## Features

- 🎯 **Simple, Intuitive API** - Start building state machines in minutes
- 📦 **Hierarchical States** - Organize complex states with parent-child relationships
- ⚡ **Async First** - Built-in support for async actions and transitions
- 🔥 **Fire-and-Forget Actions** - Execute non-blocking side effects
- 🛡️ **Type Safe** - Full TypeScript support (coming soon)
- 🪶 **Lightweight** - Zero dependencies, ~10KB minified
- 🧪 **Battle Tested** - Comprehensive test suite with 100% coverage

## Installation

```bash
npm install hsm
# or
yarn add hsm
# or
pnpm add hsm
```

## Quick Start

Here's a simple toggle switch:

```javascript
import { createMachine } from 'hsm';

// Define your machine
const machine = createMachine('toggle');

const off = machine.state('off');
const on = machine.state('on');

off.on('TOGGLE', on);
on.on('TOGGLE', off);

machine.initial(off);

// Create an instance and use it
const toggle = machine.start();
console.log(toggle.current); // 'off'

await toggle.send('TOGGLE');
console.log(toggle.current); // 'on'
```

## Core Concepts

### 1. State Machines
State machines help you model your application's behavior as a set of states and transitions between them. This makes complex logic predictable and easier to reason about.

### 2. States
States represent the different modes or conditions your application can be in. Only one state can be active at a time.

### 3. Transitions
Transitions define how your machine moves from one state to another in response to events.

### 4. Actions
Actions are functions that run during transitions. They can update context, make API calls, or trigger side effects.

### 5. Context
Context is the data associated with your machine instance. It persists across state transitions.

## Real-World Example: Form Submission

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('form');

// Define states
const idle = machine.state('idle');
const validating = machine.state('validating');
const submitting = machine.state('submitting');
const success = machine.state('success');
const error = machine.state('error');

// Define transitions with actions
idle
  .on('SUBMIT', validating)
  .do((ctx, event) => {
    // Validate form data
    ctx.errors = validateForm(event.data);
  });

validating
  .on('VALID', submitting)
    .if(ctx => ctx.errors.length === 0)
  .on('INVALID', idle)
    .if(ctx => ctx.errors.length > 0);

submitting
  .on('SUCCESS', success)
    .doAsync(async (ctx, event) => {
      // Submit to API
      const result = await api.submitForm(event.data);
      ctx.result = result;
      return { id: result.id };
    })
    .fire((ctx) => {
      // Fire analytics event (non-blocking)
      analytics.track('form_submitted', { formId: ctx.result.id });
    })
  .on('FAILURE', error);

// Set initial state
machine.initial(idle);

// Use the machine
const form = machine.start({ errors: [] });

// Submit form
try {
  const result = await form.send('SUBMIT', { 
    data: { email: 'user@example.com', name: 'John' } 
  });
  
  if (form.current === 'success') {
    console.log('Form submitted!', result.id);
  }
} catch (err) {
  console.error('Submission failed:', err);
}
```

## Why HSM?

### Problem: Complex State Management
Traditional approaches to state management often lead to:
- Scattered conditional logic
- Unpredictable state transitions
- Difficult-to-trace bugs
- Hard-to-test code

### Solution: Hierarchical State Machines
HSM provides:
- **Centralized state logic** - All transitions defined in one place
- **Predictable behavior** - State changes only happen through defined transitions
- **Better organization** - Hierarchical states for complex scenarios
- **Easy testing** - Test each state and transition independently
- **Visual clarity** - Your code structure mirrors your state diagram

## Next Steps

- 📖 Read the [Getting Started Guide](./getting-started.md) for a detailed tutorial
- 🔧 Check the [API Reference](./api.md) for complete documentation
- 💡 Browse [Examples](./examples/) for common patterns and use cases
- 🧠 Learn [State Machine Concepts](./concepts.md) for deeper understanding

## Quick Reference

```javascript
// Create machine
const machine = createMachine('name');

// Define states
const state = machine.state('stateName');
const child = state.state('childName'); // Nested state

// Set initial state
machine.initial(state);

// Define transitions
state.on('EVENT', targetState)
  .if((ctx, event) => condition)      // Guard
  .do((ctx, event) => {})             // Sync action
  .doAsync(async (ctx, event) => {})  // Async action
  .fire((ctx, event) => {});          // Non-blocking action

// Lifecycle hooks
state
  .enter((ctx, event) => {})          // On state entry
  .exit((ctx, event) => {});          // On state exit

// Create instance
const instance = machine.start(initialContext);

// Send events
await instance.send('EVENT', payload);

// Subscribe to changes
const unsubscribe = instance.subscribe(({ from, to, event }) => {
  console.log(`${from} -> ${to} via ${event}`);
});

// Access state and context
console.log(instance.current);  // Current state ID
console.log(instance.context);  // Current context
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.