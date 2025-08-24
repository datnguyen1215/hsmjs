# API Quick Reference

## Core Functions

### `createMachine(config, options?)`

Creates a new state machine instance.

```javascript
const machine = createMachine({
  id: 'myMachine',
  initial: 'idle',
  context: {},
  states: {}
}, {
  actions: {},
  guards: {},
  historySize: 50
});
```

**Returns:** Machine instance

### `assign(updater)`

Creates an action that updates context.

```javascript
// Static values
assign({ key: 'value' })

// Computed values
assign({
  count: ({ context }) => context.count + 1,
  data: ({ event }) => event.payload
})
```

**Returns:** Action function

## Machine Methods

### `machine.send(event, payload?)`

Sends an event to the machine.

```javascript
machine.send('EVENT');
machine.send('EVENT', { data: 'value' });

// Await results
const result = await machine.send('EVENT');
// result = { state, context, results }
```

**Returns:** Promise<{ state, context, results }>

### `machine.sendPriority(event, payload?)`

Sends priority event (clears queue first).

```javascript
await machine.sendPriority('EMERGENCY_STOP');
```

**Returns:** Promise<{ state, context, results }>

### `machine.clearQueue()`

Clears all queued events.

```javascript
const clearedCount = machine.clearQueue();
```

**Returns:** Number of cleared events

### `machine.matches(stateValue)`

Checks if machine is in a specific state.

```javascript
if (machine.matches('loading')) { }
if (machine.matches('auth.loggedIn')) { }
```

**Returns:** Boolean

### `machine.subscribe(callback)`

Subscribes to state changes.

```javascript
const unsubscribe = machine.subscribe((state, context) => {
  console.log('State:', state);
  console.log('Context:', context);
});

// Clean up
unsubscribe();
```

**Returns:** Unsubscribe function

### `machine.restore(snapshot)`

Restores machine to a snapshot state.

```javascript
const snapshot = { state: 'idle', context: { count: 5 } };
await machine.restore(snapshot);
```

**Returns:** Promise<{ state, context }>

**Note:** Does NOT execute entry/exit actions

### `machine.validate()`

Validates machine configuration.

```javascript
const result = machine.validate();
if (!result.valid) {
  console.error('Errors:', result.errors);
}
```

**Returns:** { valid, errors, warnings }

### `machine.visualize(options?)`

Generates state diagram.

```javascript
// Mermaid (default)
const diagram = machine.visualize();
const diagram = machine.visualize({ direction: 'LR' });

// PlantUML
const plantUml = machine.visualize({ type: 'plantuml' });
```

**Options:**
- `type`: 'mermaid' | 'plantuml' (default: 'mermaid')
- `direction`: 'TB' | 'LR' | 'BT' | 'RL' (default: 'TB')

**Returns:** String (diagram syntax)

## Machine Properties

### `machine.state`

Current state name.

```javascript
console.log(machine.state);  // 'idle' or 'parent.child'
```

**Type:** String

### `machine.context`

Current context object.

```javascript
console.log(machine.context);  // { count: 5, user: null }
```

**Type:** Object

### `machine.history`

Array of state snapshots.

```javascript
console.log(machine.history);
// [{ state: 'idle', context: {} }, ...]
```

**Type:** Array<{ state, context }>

### `machine.historySize`

Number of states in history.

```javascript
console.log(machine.historySize);  // 10
```

**Type:** Number

### `machine.snapshot`

Current state and context snapshot.

```javascript
const snapshot = machine.snapshot;
// { state: 'idle', context: { count: 5 } }
```

**Type:** { state, context }

## Configuration Options

### Machine Config

```javascript
{
  id: string,              // Required: Unique identifier
  initial: string,         // Required: Initial state
  context: object,         // Optional: Initial context
  states: object           // Required: State definitions
}
```

### State Config

```javascript
{
  entry: [actions],        // Actions on entry
  exit: [actions],         // Actions on exit
  on: {                    // Event handlers
    EVENT: 'target' | {
      target: string,
      cond: function,
      actions: [actions]
    }
  },
  initial: string,         // For parent states
  states: object           // Nested states
}
```

### Machine Options

```javascript
{
  actions: {               // Named action implementations
    actionName: function
  },
  guards: {                // Named guard implementations
    guardName: function
  },
  historySize: number      // Max history size (default: 50)
}
```

## Event Object

Events have this structure internally:

```javascript
{
  type: 'EVENT_NAME',      // Event name
  ...payload               // Additional properties
}

// When you send:
machine.send('UPDATE', { value: 42 });

// Event object is:
{
  type: 'UPDATE',
  value: 42
}
```

## Action/Guard Parameters

Actions and guards receive:

```javascript
({ context, event }) => {
  // context: Current context object
  // event: Event object with type and payload
}
```

## Error Types

### QueueClearedError

Thrown when event is cleared from queue:

```javascript
import { QueueClearedError } from '@datnguyen1215/hsmjs';

try {
  await machine.send('EVENT');
} catch (error) {
  if (error instanceof QueueClearedError) {
    console.log('Event was cancelled');
  }
}
```

## Quick Examples

### Basic Machine

```javascript
const toggle = createMachine({
  id: 'toggle',
  initial: 'off',
  states: {
    off: { on: { TOGGLE: 'on' } },
    on: { on: { TOGGLE: 'off' } }
  }
});

toggle.send('TOGGLE');
```

### With Context

```javascript
const counter = createMachine({
  id: 'counter',
  initial: 'active',
  context: { count: 0 },
  states: {
    active: {
      on: {
        INC: {
          actions: [assign({
            count: ({ context }) => context.count + 1
          })]
        }
      }
    }
  }
});
```

### With Guards

```javascript
const machine = createMachine({
  initial: 'idle',
  context: { tries: 0 },
  states: {
    idle: {
      on: {
        SUBMIT: [
          {
            target: 'success',
            cond: ({ context }) => context.tries < 3
          },
          { target: 'blocked' }
        ]
      }
    }
  }
});
```

### Nested States

```javascript
const auth = createMachine({
  initial: 'loggedOut',
  states: {
    loggedOut: {
      on: { LOGIN: 'loggedIn' }
    },
    loggedIn: {
      initial: 'idle',
      states: {
        idle: { on: { WORK: 'working' } },
        working: { on: { DONE: 'idle' } }
      },
      on: { LOGOUT: 'loggedOut' }
    }
  }
});
```