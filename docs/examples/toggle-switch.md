# Toggle Switch Example

The simplest possible state machine - a toggle switch with two states.

## State Diagram

```
┌─────┐  TOGGLE  ┌────┐
│ off │ --------> │ on │
└─────┘ <-------- └────┘
         TOGGLE
```

## Code

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

// Create the machine
const machine = createMachine('toggle');

// Define states
machine.state('off');
machine.state('on');

// Define transitions with string references
machine.state('off').on('TOGGLE', 'on');
machine.state('on').on('TOGGLE', 'off');

// Set initial state
machine.initial('off');

// Create instance and use it
const toggle = machine.start();

console.log(toggle.current); // 'off'

await toggle.send('TOGGLE');
console.log(toggle.current); // 'on'

await toggle.send('TOGGLE');
console.log(toggle.current); // 'off'
```

## With Actions

Add side effects when entering/exiting states:

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine('toggle');

// Define states with entry/exit actions
machine.state('off')
  .enter(() => console.log('Switch is OFF'))
  .exit(() => console.log('Leaving OFF state'));

machine.state('on')
  .enter(() => console.log('Switch is ON'))
  .exit(() => console.log('Leaving ON state'));

// Define transitions
machine.state('off').on('TOGGLE', 'on');
machine.state('on').on('TOGGLE', 'off');

machine.initial('off');

const toggle = machine.start();
// Output: "Switch is OFF"

await toggle.send('TOGGLE');
// Output: "Leaving OFF state"
// Output: "Switch is ON"
```

## With Context

Track additional data like toggle count:

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine('toggle');

// Define states
machine.state('off');
machine.state('on');

// Define transitions with actions
machine.state('off')
  .on('TOGGLE', 'on')
  .do((ctx) => {
    ctx.toggleCount++;
    ctx.lastToggled = Date.now();
  });

machine.state('on')
  .on('TOGGLE', 'off')
  .do((ctx) => {
    ctx.toggleCount++;
    ctx.lastToggled = Date.now();
  });

machine.initial('off');

// Start with initial context
const toggle = machine.start({
  toggleCount: 0,
  lastToggled: null
});

await toggle.send('TOGGLE');
console.log(toggle.context.toggleCount); // 1

await toggle.send('TOGGLE');
console.log(toggle.context.toggleCount); // 2
```

## With Subscriptions

React to state changes:

```javascript
const toggle = machine.start();

// Subscribe to changes
const unsubscribe = toggle.subscribe(({ from, to, event }) => {
  console.log(`${event}: ${from} -> ${to}`);

  // Update UI
  document.getElementById('status').textContent = to;
  document.getElementById('button').textContent =
    to === 'on' ? 'Turn Off' : 'Turn On';
});

// In your UI
document.getElementById('button').onclick = () => {
  toggle.send('TOGGLE');
};

// Cleanup when done
unsubscribe();
```

## Key Concepts Demonstrated

- Basic state definition
- Simple transitions
- Entry/exit actions
- Context management
- Event subscriptions
- UI integration patterns