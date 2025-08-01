# API Reference

> **New in v1.2.0:** Built-in state machine visualization with Mermaid diagram generation and browser preview capabilities.

## Importing

```javascript
// ES6 Modules
import { createMachine, action } from '@datnguyen1215/hsmjs';

// CommonJS  
const { createMachine, action } = require('@datnguyen1215/hsmjs');
```

## Table of Contents

- [Machine Creation](#machine-creation)
- [State Definition](#state-definition)
- [Hierarchical States](#hierarchical-states)
- [State Lifecycle](#state-lifecycle)
- [Transitions](#transitions)
- [Transition Modifiers](#transition-modifiers)
- [Actions](#actions)
- [Machine Instance](#machine-instance)
- [Global Handlers](#global-handlers)
- [Context Management](#context-management)
- [Event Subscriptions](#event-subscriptions)
- [**Visualization (New!)**](#visualization) ⭐

## Machine Creation

### `createMachine(name: string): Machine`

Creates a new state machine definition.

**Parameters:**
- `name` - A descriptive name for the machine (used for debugging)

**Returns:** A `Machine` instance

**Example:**
```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine('app');
```

## State Definition

### `machine.state(id: string): State`

Creates a new state in the machine. States must have unique IDs within their parent scope.

**Parameters:**
- `id` - Unique identifier for the state

**Returns:** A `State` instance

**Throws:** Error if state ID already exists

**Example:**
```javascript
const idle = machine.state('idle');
const loading = machine.state('loading');
const error = machine.state('error');
```

### `machine.initial(stateOrId: State | string): Machine`

Sets the initial state of the machine. Must be called before starting the machine.

**Parameters:**
- `stateOrId` - Either a State instance or a state ID string

**Returns:** The Machine instance (for chaining)

**Throws:** Error if state not found or no initial state set

**Example:**
```javascript
// Using state reference
machine.initial(idle);

// Using state ID
machine.initial('idle');
```

## Hierarchical States

### `state.state(id: string): State`

Creates a nested child state. Child states inherit behavior from their parents.

**Parameters:**
- `id` - Unique identifier for the child state (within parent scope)

**Returns:** A `State` instance

**Example:**
```javascript
const auth = machine.state('auth');
const login = auth.state('login');      // Creates 'auth.login'
const register = auth.state('register'); // Creates 'auth.register'
const verify = auth.state('verify');     // Creates 'auth.verify'
```

### `state.initial(stateOrId: State | string): State`

Sets the default child state. When entering a parent state, the machine automatically enters its initial child state.

**Parameters:**
- `stateOrId` - Either a State instance or a state ID string

**Returns:** The State instance (for chaining)

**Example:**
```javascript
auth.initial('login'); // When entering 'auth', also enter 'auth.login'
```

### Parent State References

Use `^` notation to reference parent states in transitions:

```javascript
// Go to parent state
loginForm.on('CANCEL', '^');

// Go to grandparent state  
deepChild.on('HOME', '^^');

// Go to sibling via parent
login.on('REGISTER', '^.register');
```

## State Lifecycle

### `state.enter(action: Function): State`

Adds an action to execute when entering the state. Multiple entry actions can be added and will execute in order.

**Parameters:**
- `action` - Function with signature `(context, event) => void`

**Returns:** The State instance (for chaining)

**Example:**
```javascript
loading
  .enter((ctx) => {
    ctx.startTime = Date.now();
  })
  .enter((ctx, event) => {
    console.log(`Loading ${event.resource}`);
  });
```

### `state.exit(action: Function): State`

Adds an action to execute when exiting the state. Multiple exit actions can be added and will execute in order.

**Parameters:**
- `action` - Function with signature `(context, event) => void`

**Returns:** The State instance (for chaining)

**Example:**
```javascript
loading
  .exit((ctx) => {
    ctx.loadTime = Date.now() - ctx.startTime;
  })
  .exit((ctx) => {
    console.log(`Loading took ${ctx.loadTime}ms`);
  });
```

## Transitions

### `state.on(event: string, target: State | string | Function): Transition`

Defines a transition from this state to another when an event occurs.

**Parameters:**
- `event` - Event name that triggers the transition
- `target` - Target state (can be State instance, state ID, or function)

**Returns:** A `Transition` instance for chaining modifiers

**Target Types:**
- **State instance:** `on('EVENT', targetState)`
- **State ID:** `on('EVENT', 'targetId')`
- **Dynamic target:** `on('EVENT', (ctx, event) => ctx.premium ? 'premium' : 'basic')`
- **Parent reference:** `on('EVENT', '^')` or `on('EVENT', '^^')`

**Example:**
```javascript
// Direct state reference
idle.on('START', loading);

// State ID
idle.on('START', 'loading');

// Dynamic target based on context
idle.on('START', (ctx) => ctx.hasCache ? 'ready' : 'loading');

// Parent state
form.on('CANCEL', '^');
```

## Transition Modifiers

Transitions can be modified with conditions and actions. All modifiers return the Transition instance for chaining.

### `.if(guard: (ctx, event) => boolean): Transition`

Adds a guard condition. The transition only occurs if the guard returns true.

**Parameters:**
- `guard` - Predicate function that receives context and event

**Example:**
```javascript
form
  .on('SUBMIT', 'processing')
  .if((ctx) => ctx.form.isValid)
  .if((ctx) => ctx.user.isAuthenticated); // Multiple guards (AND)
```

### `.do(action: (ctx, event) => any): Transition`

Adds a synchronous action that blocks the transition until complete. Multiple actions execute in order.

**Parameters:**
- `action` - Function that receives context and event

**Returns:** Action results are collected and returned from `send()`

**Example:**
```javascript
idle
  .on('SUBMIT', 'processing')
  .do((ctx, event) => {
    ctx.timestamp = Date.now();
    ctx.data = event.payload;
  })
  .do((ctx) => {
    localStorage.setItem('draft', JSON.stringify(ctx.data));
    return { saved: true };
  });
```

### `.doAsync(action: async (ctx, event) => any): Transition`

Adds an asynchronous action that blocks the transition until the promise resolves.

**Parameters:**
- `action` - Async function that receives context and event

**Returns:** Action results are collected and returned from `send()`

**Example:**
```javascript
form
  .on('SUBMIT', 'success')
  .doAsync(async (ctx, event) => {
    const response = await api.submit(event.data);
    ctx.submissionId = response.id;
    return { id: response.id, status: response.status };
  })
  .doAsync(async (ctx) => {
    await api.notifyWebhook(ctx.submissionId);
  });
```

### `.fire(action: Function): Transition`

Adds a fire-and-forget action that runs without blocking the transition. Errors are caught and logged but don't affect the transition.

**Parameters:**
- `action` - Function (can be async) that receives context and event

**Example:**
```javascript
purchase
  .on('COMPLETE', 'thankyou')
  .do((ctx, event) => {
    ctx.orderId = event.orderId;
  })
  .fire(async (ctx) => {
    // Analytics (don't block transition)
    await analytics.track('purchase_complete', {
      orderId: ctx.orderId,
      amount: ctx.total
    });
  })
  .fire(async (ctx) => {
    // Send email (don't block transition)
    await email.sendReceipt(ctx.user.email, ctx.orderId);
  });
```

## Actions

### `action(name: string, fn: Function): NamedAction`

Creates a named action for better debugging and reusability.

**Parameters:**
- `name` - Descriptive name for the action
- `fn` - Action function

**Returns:** A named action function with `actionName` property

**Example:**
```javascript
import { action } from '@datnguyen1215/hsmjs';

// Define reusable actions
const validateForm = action('validateForm', (ctx, event) => {
  const errors = [];
  if (!event.email) errors.push('Email required');
  if (!event.password) errors.push('Password required');
  ctx.errors = errors;
  return { valid: errors.length === 0 };
});

const saveToAPI = action('saveToAPI', async (ctx, event) => {
  const response = await api.save(event.data);
  ctx.savedId = response.id;
  return { id: response.id };
});

// Use in transitions
form
  .on('SUBMIT', 'saving')
  .do(validateForm)
  .doAsync(saveToAPI);
```

## Machine Instance

### `machine.start(initialContext?: object): Instance`

Creates a running instance of the machine with optional initial context.

**Parameters:**
- `initialContext` - Initial context object (default: `{}`)

**Returns:** An `Instance` object

**Example:**
```javascript
const instance = machine.start({
  user: null,
  cart: [],
  preferences: {
    theme: 'dark',
    notifications: true
  }
});
```

### `instance.send(event: string, payload?: any): Promise<object>`

Sends an event to the machine, potentially triggering a transition.

**Parameters:**
- `event` - Event name
- `payload` - Optional event data (merged into event object)

**Returns:** Promise resolving to collected action results

**Behavior:**
- Always returns a promise (even for sync-only transitions)
- Waits for all `.do()` and `.doAsync()` actions
- Does not wait for `.fire()` actions
- Collects and merges return values from actions
- Throws if any blocking action throws

**Example:**
```javascript
// Simple event
await instance.send('CLICK');

// Event with payload
await instance.send('LOGIN', { 
  email: 'user@example.com',
  password: 'secret' 
});

// Capture action results
const results = await instance.send('SAVE');
console.log(results);
// { 
//   validateForm: { valid: true },
//   saveToAPI: { id: 123, status: 'saved' }
// }

// Error handling
try {
  await instance.send('SUBMIT');
} catch (error) {
  console.error(`Action '${error.action}' failed:`, error.message);
}
```

### `instance.current: string`

Gets the current state ID (dot-notation for nested states).

**Example:**
```javascript
console.log(instance.current); // 'idle'

await instance.send('LOGIN');
console.log(instance.current); // 'auth.login'
```

### `instance.context: object`

Gets the current context object. This is the same object passed to actions, so mutations are reflected immediately.

**Example:**
```javascript
console.log(instance.context.user); // null

await instance.send('LOGIN', { userId: 123 });
console.log(instance.context.user); // { id: 123, name: 'John' }
```

### `instance.subscribe(listener: Function): Function`

Subscribes to state change notifications.

**Parameters:**
- `listener` - Function called with transition details

**Returns:** Unsubscribe function

**Listener receives:**
```typescript
{
  from: string,  // Previous state ID
  to: string,    // New state ID  
  event: string  // Event that triggered transition
}
```

**Example:**
```javascript
const unsubscribe = instance.subscribe(({ from, to, event }) => {
  console.log(`[${event}] ${from} -> ${to}`);
  updateUI(to);
});

// Later: stop listening
unsubscribe();
```

## Global Handlers

### `machine.on(event: string, target): Transition`

Defines a global transition that works from any state. Useful for logout, error handling, or emergency stops.

**Parameters:**
- `event` - Event name
- `target` - Target state (same options as state.on())

**Returns:** Transition instance for chaining

**Example:**
```javascript
// Global logout
machine
  .on('LOGOUT', 'auth.login')
  .do((ctx) => {
    ctx.user = null;
    ctx.token = null;
    localStorage.clear();
  })
  .fire(() => {
    analytics.track('user_logout');
  });

// Global error handler
machine
  .on('FATAL_ERROR', 'error')
  .do((ctx, event) => {
    ctx.error = event.error;
    ctx.errorTime = Date.now();
  });

// Emergency stop from any state
machine.on('EMERGENCY_STOP', 'stopped');
```

## Context Management

Context is the data associated with a machine instance. It's passed to all guards, actions, and listeners.

### Initial Context

```javascript
const instance = machine.start({
  user: null,
  items: [],
  settings: { theme: 'light' }
});
```

### Updating Context

Context is typically updated in actions:

```javascript
state
  .on('UPDATE', 'next')
  .do((ctx, event) => {
    // Direct mutation
    ctx.user = event.user;
    
    // Adding properties
    ctx.lastUpdate = Date.now();
    
    // Updating nested objects
    ctx.settings.theme = event.theme;
  });
```

### Context Isolation

Each machine instance has its own isolated context:

```javascript
const instance1 = machine.start({ count: 0 });
const instance2 = machine.start({ count: 0 });

await instance1.send('INCREMENT'); // instance1.context.count = 1
// instance2.context.count still 0
```

## Event Subscriptions

### Subscription Patterns

```javascript
// Log all transitions
instance.subscribe(({ from, to, event }) => {
  console.log(`[${new Date().toISOString()}] ${event}: ${from} -> ${to}`);
});

// Update UI based on state
instance.subscribe(({ to }) => {
  document.body.className = `state-${to.replace(/\./g, '-')}`;
});

// Track analytics
instance.subscribe(({ from, to, event }) => {
  analytics.track('state_change', { from, to, event });
});

// Sync with external store
instance.subscribe(({ to }) => {
  store.dispatch({ type: 'HSM_STATE_CHANGE', state: to });
});
```

### Multiple Subscribers

```javascript
const unsubscribe1 = instance.subscribe(updateUI);
const unsubscribe2 = instance.subscribe(logTransition);
const unsubscribe3 = instance.subscribe(syncStore);

// Remove specific subscriber
unsubscribe2();

// Remove all (cleanup)
[unsubscribe1, unsubscribe3].forEach(fn => fn());
```

## Error Handling

### Action Errors

Errors in blocking actions (`.do()`, `.doAsync()`) prevent the transition:

```javascript
state
  .on('SAVE', 'saved')
  .doAsync(async (ctx) => {
    throw new Error('Network error');
  });

try {
  await instance.send('SAVE');
} catch (error) {
  console.log(instance.current); // Still in original state
  console.error(error.message); // 'Network error'
}
```

### Fire Action Errors

Errors in fire actions don't affect transitions but are logged:

```javascript
state
  .on('COMPLETE', 'done')
  .fire(async () => {
    throw new Error('Analytics failed');
  });

await instance.send('COMPLETE'); // Succeeds
// Error logged to console: "Fire action error: Analytics failed"
```

### Guard Errors

Errors in guards are treated as `false`:

```javascript
state
  .on('SUBMIT', 'next')
  .if((ctx) => {
    throw new Error('Guard error');
  });

await instance.send('SUBMIT'); // No transition occurs
```

### Lifecycle Errors

Errors in enter/exit actions are logged but don't prevent transitions:

```javascript
state
  .enter(() => {
    throw new Error('Entry error');
  });

await instance.send('GO_TO_STATE'); // Transition succeeds
```

## Visualization

> **New Feature:** Generate Mermaid diagrams of your state machines for documentation and debugging.

### Machine Visualization

#### `machine.visualize(): string`

Generates a Mermaid diagram string representing the complete state machine structure.

**Returns:** `string` - Mermaid diagram syntax

**Features:**
- Hierarchical states shown as subgraphs
- Initial state highlighted with special styling
- All transitions with event labels
- Sanitized state IDs for Mermaid compatibility

**Example:**
```javascript
const machine = createMachine('toggle')

const off = machine.state('off')
const on = machine.state('on')

off.on('TOGGLE', on)
on.on('TOGGLE', off)
machine.initial(off)

const diagram = machine.visualize()
console.log(diagram)
```

**Output:**
```mermaid
graph TD
  off(("off"))
  on("on")
  off -->|TOGGLE| on
  on -->|TOGGLE| off
  class off initial
  classDef initial fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

#### `machine.visualizer(): VisualizerInterface`

Returns a visualizer object with preview and save capabilities.

**Returns:** Object with methods:
- `preview(): Promise<void>` - Opens diagram in browser
- `save(filename: string): Promise<string>` - Saves diagram to file

**Example:**
```javascript
const viz = machine.visualizer()

// Preview in browser
await viz.preview()

// Save as HTML file
await viz.save('my-state-machine.html')

// Save as Mermaid text file  
await viz.save('my-state-machine.mmd')
```

### Instance Visualization

#### `instance.visualize(): string`

Generates a Mermaid diagram with current state highlighting for running instances.

**Returns:** `string` - Mermaid diagram with current state styling

**Features:**
- All machine structure visualization features
- Current state highlighted in blue
- Combines initial state and current state styling

**Example:**
```javascript
const instance = machine.start()
await instance.send('TOGGLE')

const diagram = instance.visualize()
// Shows 'on' state with blue highlighting
```

**Current State Styling:**
```css
class on current
classDef current fill:#e1f5fe,stroke:#01579b,stroke-width:3px
```

#### `instance.visualizer(): VisualizerInterface`

Returns a visualizer object for the instance with current state context.

**Returns:** Object with same methods as machine visualizer but includes current state highlighting

**Example:**
```javascript
const instance = machine.start()
await instance.send('PLAY')

// Preview shows current state highlighted
await instance.visualizer().preview()

// Save current state snapshot
await instance.visualizer().save('current-state.html')
```

### Hierarchical State Visualization

Complex nested states are automatically organized using Mermaid subgraphs:

**Example:**
```javascript
const machine = createMachine('media-player')

const stopped = machine.state('stopped')
const playing = machine.state('playing')

// Nested states
const normal = playing.state('normal')
const fastForward = playing.state('fast-forward')

stopped.on('PLAY', normal)
normal.on('FF', fastForward)
fastForward.on('NORMAL', normal)
playing.on('STOP', stopped)

machine.initial(stopped)

const diagram = machine.visualize()
```

**Generated Structure:**
```mermaid
graph TD
  stopped(("stopped"))
  subgraph playing["playing"]
    playing_normal("normal")
    playing_fast_forward("fast-forward")
  end
  stopped -->|PLAY| playing_normal
  playing_normal -->|FF| playing_fast_forward
  playing_fast_forward -->|NORMAL| playing_normal
  playing -->|STOP| stopped
  class stopped initial
  classDef initial fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

### File Export Formats

#### HTML Export

Files with `.html` extension generate complete HTML pages with embedded Mermaid:

```javascript
await machine.visualizer().save('state-machine.html')
```

**Generated HTML includes:**
- Mermaid.js library from CDN
- Responsive styling
- Diagram title and metadata
- Interactive navigation (zoom, pan)

#### Mermaid Text Export

Files with `.mmd`, `.md`, or other extensions save raw Mermaid syntax:

```javascript
await machine.visualizer().save('state-machine.mmd')
```

**Use cases:**
- Include in documentation
- Import into other Mermaid tools
- Version control friendly format
- Custom processing workflows

### Browser Preview

The `preview()` method generates a temporary HTML file and opens it in your default browser:

**Features:**
- Automatic cleanup of temporary files
- Cross-platform browser detection
- Real-time diagram rendering
- Interactive zoom and pan
- Mobile-friendly responsive design

**System Requirements:**
- Node.js environment
- Default browser configured
- Internet connection (for Mermaid.js CDN)

**Example:**
```javascript
// Preview machine structure
await machine.visualizer().preview()

// Preview with current state highlighting
const instance = machine.start()
await instance.send('ACTIVATE')
await instance.visualizer().preview()
```

### Advanced Visualization Features

#### State ID Sanitization

Complex state names are automatically sanitized for Mermaid compatibility:

```javascript
const state1 = machine.state('state-with-dashes')
const state2 = machine.state('state.with.dots')  
const state3 = machine.state('state with spaces')

// Generated IDs: state_with_dashes, state_with_dots, state_with_spaces
// Display labels preserve original names
```

#### Multi-level Nesting

Unlimited nesting depth is supported:

```javascript
const auth = machine.state('authenticated')
const profile = auth.state('profile')
const settings = profile.state('settings')
const privacy = settings.state('privacy')

// Creates properly nested subgraphs:
// authenticated -> profile -> settings -> privacy
```

#### Global Transitions

Global machine transitions are visualized with special styling:

```javascript
machine.on('ERROR', errorState)

// Shows as: START((" ")) -->|ERROR| error
```

For complete visualization examples and troubleshooting, see the [State Machine Visualization Guide](./visualization.md).
// Error logged: "Entry action error: Entry error"
```