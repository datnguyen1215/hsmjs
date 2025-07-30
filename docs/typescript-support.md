# TypeScript Support for hsmjs

The **hsmjs** library provides comprehensive TypeScript support with full type safety, IntelliSense, and generic type parameters. This document outlines the TypeScript features and how to use them effectively.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Type Definitions](#type-definitions)
- [Generic Support](#generic-support)
- [Event Type Safety](#event-type-safety)
- [IntelliSense Features](#intellisense-features)
- [Advanced Patterns](#advanced-patterns)
- [Build Integration](#build-integration)
- [API Reference](#api-reference)

## Installation

The TypeScript definitions are included automatically when you install hsmjs:

```bash
npm install @datnguyen1215/hsmjs
```

The package includes comprehensive `.d.ts` files that provide full type support for all library features.

## Basic Usage

```typescript
import { createMachine, action } from '@datnguyen1215/hsmjs';

// Define your context interface
interface MyContext {
  count: number;
  user: { id: string; name: string } | null;
}

// Create a typed machine
const machine = createMachine<MyContext>('my-machine');

const idle = machine.state('idle');
const active = machine.state('active');

// Type-safe transitions and actions
idle
  .on('START', active)
  .do((ctx: MyContext) => {
    ctx.count = 0; // TypeScript knows ctx.count exists
  });

machine.initial(idle);

// Create instance with typed context
const instance = machine.start({
  count: 0,
  user: null
});
```

## Type Definitions

### Core Interfaces

The library exports several key interfaces:

```typescript
export interface BaseContext {
  [key: string]: any;
}

export interface BaseEvent {
  type: string;
  [key: string]: any;
}

export interface StateChangeEvent {
  from: string | null;
  to: string;
  event: string;
  rollback?: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  fromState: string | null;
  toState: string;
  context: any;
  trigger: string | null;
  metadata: { size: number; [key: string]: any };
}
```

### Type Utilities

```typescript
// Extract event payload from discriminated union
export type EventPayload<TEvents extends BaseEvent, TType extends TEvents['type']> =
  Extract<TEvents, { type: TType }>;

// Extract context type from machine/instance
export type MachineContext<T> = T extends Machine<infer TContext> ? TContext : never;
export type InstanceContext<T> = T extends Instance<infer TContext> ? TContext : never;
```

## Generic Support

All core classes support generic type parameters for context and events:

```typescript
// Machine with typed context
const machine = createMachine<MyContext>('typed-machine');

// State with inherited context type
const state: State<MyContext> = machine.state('example');

// Instance with typed context
const instance: Instance<MyContext> = machine.start(initialContext);

// Transition with typed context and events
const transition: Transition<MyContext, MyEvent> = state.on('EVENT', target);
```

## Event Type Safety

Use discriminated unions for complete event type safety:

```typescript
type AppEvents = 
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; name: string; avatar?: string }
  | { type: 'ERROR'; message: string };

// Type-safe event handling
state
  .on('LOGIN', target)
  .if((ctx, event: EventPayload<AppEvents, 'LOGIN'>) => {
    // TypeScript knows event has email and password properties
    return event.email.includes('@') && event.password.length > 0;
  })
  .doAsync(async (ctx, event: EventPayload<AppEvents, 'LOGIN'>) => {
    // Full type safety in async actions
    const response = await api.login(event.email, event.password);
    return response.data;
  });

// Type-safe event sending
await instance.send('LOGIN', { 
  email: 'user@example.com', 
  password: 'secret' 
});
```

## IntelliSense Features

The TypeScript definitions provide comprehensive IntelliSense support:

### Method Chaining

```typescript
state
  .enter((ctx) => { /* IntelliSense for ctx properties */ })
  .exit((ctx) => { /* Full context type info */ })
  .on('EVENT', target)
    .if((ctx, event) => { /* Guard with typed parameters */ true })
    .do((ctx, event) => { /* Sync action with types */ })
    .doAsync(async (ctx, event) => { /* Async action with types */ })
    .fire((ctx, event) => { /* Fire action with types */ });
```

### Context Access

```typescript
// IntelliSense knows the exact structure of your context
instance.context.count; // number
instance.context.user?.name; // string | undefined
instance.context.user?.id; // string | undefined
```

### History Operations

```typescript
const history = instance.history();

// IntelliSense for all history methods
const entries: HistoryEntry[] = history.entries;
const recent = history.getRange(0, 10);
const specific = history.find(entry => entry.trigger === 'LOGIN');

// Type-safe rollback
if (history.canRollback(targetEntry)) {
  const result = await instance.rollback(targetEntry);
  if (result.success) {
    console.log(`Rolled back ${result.stepsBack} steps`);
  }
}
```

## Advanced Patterns

### Complex Context Types

```typescript
interface UserProfile {
  id: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

interface AppContext {
  user: UserProfile | null;
  auth: {
    token: string | null;
    isLoading: boolean;
    error: string | null;
  };
  data: {
    items: Array<{ id: string; title: string; status: 'pending' | 'complete' }>;
    filters: { category?: string; status?: string };
  };
}
```

### Dynamic Target Resolution

```typescript
const transition = state.on('NAVIGATE', (ctx, event) => {
  // TypeScript infers return type as string | State<AppContext>
  return ctx.user ? 'dashboard' : 'login';
});
```

### Nested State Hierarchies

```typescript
const app = machine.state('app');
const dashboard = app.state('dashboard');
const profile = dashboard.state('profile');
const settings = profile.state('settings');

// TypeScript tracks the full hierarchy
settings.isChildOf(app); // boolean
settings.getAncestors(); // State<AppContext>[]
```

## Build Integration

### Package Configuration

The package.json includes proper TypeScript configuration:

```json
{
  "types": "dist/types/index.d.ts",
  "files": ["dist/", "types/"],
  "scripts": {
    "build:types": "mkdir -p dist/types && cp types/index.d.ts dist/types/index.d.ts",
    "build:types:validate": "npx tsc --noEmit types/index.d.ts"
  }
}
```

### Module Formats

TypeScript definitions work with all build formats:

```typescript
// ES Modules
import { createMachine } from '@datnguyen1215/hsmjs';

// CommonJS
const { createMachine } = require('@datnguyen1215/hsmjs');

// UMD (browser)
// Types available when using TypeScript in browser projects
```

### TSConfig Setup

Recommended `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## API Reference

### Core Classes

#### `Machine<TContext>`
- `state(id: string): State<TContext>`
- `initial(state: State<TContext> | string): this`
- `on<TEvent>(event: string, target: string | State<TContext> | TargetResolver<TContext, TEvent>): Transition<TContext, TEvent>`
- `start(context?: TContext, options?: InstanceOptions): Instance<TContext>`

#### `State<TContext>`
- `state(id: string): State<TContext>`
- `initial(state: State<TContext> | string): this`
- `enter(action: Action<TContext>): this`
- `exit(action: Action<TContext>): this`
- `on<TEvent>(event: string, target: string | State<TContext> | TargetResolver<TContext, TEvent>): Transition<TContext, TEvent>`

#### `Instance<TContext>`
- `send<TEvent>(eventName: string, payload?: Omit<TEvent, 'type'>): Promise<any>`
- `subscribe(listener: StateChangeListener): () => void`
- `history(): History`
- `rollback(targetEntry: HistoryEntry): Promise<RollbackResult>`

#### `Transition<TContext, TEvent>`
- `if(guard: Guard<TContext, TEvent>): this`
- `do(action: Action<TContext, TEvent>): this`
- `doAsync(action: AsyncAction<TContext, TEvent>): this`
- `fire(action: Action<TContext, TEvent> | AsyncAction<TContext, TEvent>): this`

### Factory Functions

```typescript
function createMachine<TContext = BaseContext>(name: string): Machine<TContext>
function action<TContext = BaseContext, TEvent = BaseEvent>(
  name: string, 
  fn: Action<TContext, TEvent> | AsyncAction<TContext, TEvent>
): Action<TContext, TEvent> | AsyncAction<TContext, TEvent>
```

## Examples

See the following files for comprehensive examples:

- `tests/typescript/type-validation.test.ts` - Complete API validation
- `tests/typescript/usage-examples.test.ts` - Practical usage patterns  
- `tests/typescript/intellisense-demo.ts` - Advanced IntelliSense demonstration
- `docs/examples/typescript-usage.md` - Getting started guide

## Testing TypeScript Integration

Run the TypeScript integration tests:

```bash
npm run build:types:validate  # Validate type definitions
npm test -- typescript-integration.test.js  # Run integration tests
```

The library includes comprehensive tests that validate:

- Type definition accuracy
- IntelliSense functionality
- Generic type support
- Event type safety
- History type safety
- Method chaining types
- Build format compatibility

## Troubleshooting

### Common Issues

1. **Missing types**: Ensure `@datnguyen1215/hsmjs` is installed and `dist/types/index.d.ts` exists
2. **Generic inference**: Explicitly specify types when TypeScript cannot infer them
3. **Event typing**: Use discriminated unions for complex event structures
4. **Context mutations**: TypeScript allows context mutations by design (imperative pattern)

### Type Errors

```typescript
// ❌ Error: Type mismatch
await instance.send('LOGIN', { email: 'test' }); // Missing password

// ✅ Correct: Complete event payload  
await instance.send('LOGIN', { email: 'test@example.com', password: 'secret' });

// ❌ Error: Property doesn't exist
ctx.unknownProperty = 'value';

// ✅ Correct: Define in context interface
interface MyContext extends BaseContext {
  unknownProperty?: string;
}
```

The TypeScript support in hsmjs provides a robust, type-safe development experience while maintaining the library's imperative, performant design.