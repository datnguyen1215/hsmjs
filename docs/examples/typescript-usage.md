# TypeScript Usage

HSM works great with TypeScript. Here's the recommended approach for type safety.

## Type Definitions

```typescript
import { createMachine } from 'hsm';

// Define your types
interface Context {
  count: number;
  user: User | null;
}

interface User {
  id: string;
  name: string;
}

type States = 'idle' | 'loading' | 'active' | 'error';

type Events = 
  | { type: 'START' }
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'INCREMENT' }
  | { type: 'SET_USER'; user: User }
  | { type: 'ERROR'; message: string };
```

## Usage Example

```typescript
// Create typed machine
const machine = createMachine<Context>('app');

// Define states with proper types
const idle = machine.state('idle');
const loading = machine.state('loading');
const active = machine.state('active');
const error = machine.state('error');

// Type-safe transitions
idle
  .on('START', loading)
  .do((ctx: Context) => {
    ctx.count = 0;
  });

loading
  .on('LOGIN', active)
  .doAsync(async (ctx: Context, event: Extract<Events, { type: 'LOGIN' }>) => {
    const response = await api.login(event.email, event.password);
    ctx.user = response.user;
    return { userId: response.user.id };
  })
  .on('ERROR', error)
  .do((ctx: Context, event: Extract<Events, { type: 'ERROR' }>) => {
    console.error(event.message);
  });

active
  .on('INCREMENT', active)
  .do((ctx: Context) => {
    ctx.count++;
  });

machine.initial(idle);

// Use with proper types
const instance = machine.start({ count: 0, user: null });

// Type-safe event sending
await instance.send('START');
await instance.send('LOGIN', { email: 'user@example.com', password: 'secret' });

// Access typed context
const user: User | null = instance.context.user;
const count: number = instance.context.count;
```

## Type Helpers

```typescript
// Helper type for extracting event payloads
type EventPayload<T extends Events, K extends T['type']> = 
  Extract<T, { type: K }>;

// Usage in actions
const handleLogin = (
  ctx: Context, 
  event: EventPayload<Events, 'LOGIN'>
) => {
  console.log(event.email); // TypeScript knows this exists
};
```

## Key Points

- Define interfaces for Context and Events upfront
- Use union types for event discrimination
- Extract utility type helps with event payload typing
- TypeScript catches state and event mismatches at compile time