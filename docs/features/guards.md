# Guards

## Syntax Quick Reference

```javascript
// Inline guard
cond: ({ context, event, machine }) => context.count < 10

// Named guard
cond: 'isValidUser'

// Multiple conditions with fallback
on: {
  SUBMIT: [
    { target: 'success', cond: ({ context }) => context.isValid },
    { target: 'error', cond: ({ context }) => context.hasErrors },
    { target: 'pending' }  // Fallback with no condition
  ]
}
```

## Basic Usage

Guards control when transitions can occur:

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const counterMachine = createMachine({
  id: 'counter',
  initial: 'active',
  context: { count: 0, max: 10 },
  states: {
    active: {
      on: {
        INCREMENT: [
          {
            target: 'active',
            cond: ({ context }) => context.count < context.max,
            actions: [assign({ count: ({ context }) => context.count + 1 })]
          },
          {
            target: 'maxed',
            cond: ({ context }) => context.count >= context.max
          }
        ]
      }
    },
    maxed: {
      entry: [() => console.log('Counter reached maximum!')],
      on: {
        RESET: {
          target: 'active',
          actions: [assign({ count: 0 })]
        }
      }
    }
  }
});
```

## Configuration

### Guard Function Signature

```javascript
// Guard function receives context, event, and machine
const guardFunction = ({ context, event, machine }) => {
  // Return boolean
  return true; // or false
};

// Usage in transition
{
  target: 'nextState',
  cond: guardFunction
}
```

### Named Guards

Define reusable guards in machine options:

```javascript
const guards = {
  isValidUser: ({ context, event, machine }) =>
    event.user && event.user.verified,

  hasPermission: ({ context, event, machine }) =>
    context.permissions.includes(event.action),

  withinLimit: ({ context }) =>
    context.count < context.limit
};

const machine = createMachine({
  states: {
    idle: {
      on: {
        ACCESS: {
          target: 'granted',
          cond: 'isValidUser'  // Reference by name
        }
      }
    }
  }
}, { guards });  // Pass guards in options
```

## Advanced Patterns

### Multiple Conditions

Transitions are evaluated in order, first matching condition wins:

```javascript
on: {
  PROCESS: [
    {
      target: 'premium',
      cond: ({ context }) => context.tier === 'premium'
    },
    {
      target: 'standard',
      cond: ({ context }) => context.tier === 'standard'
    },
    {
      target: 'free',
      cond: ({ context }) => context.credits > 0
    },
    {
      target: 'denied'  // No condition = always matches (fallback)
    }
  ]
}
```

### Event-Based Guards

Guards can check event data:

```javascript
states: {
  input: {
    on: {
      SUBMIT: [
        {
          target: 'success',
          cond: ({ context, event, machine }) =>
            event.isValid && context.attempts < 3
        },
        {
          target: 'error',
          cond: ({ context, event, machine }) =>
            !event.isValid && context.attempts < 2
        },
        {
          target: 'locked',
          cond: ({ context }) => context.attempts >= 2
        }
      ]
    }
  }
}
```

### Combining Multiple Conditions

```javascript
// AND conditions
cond: ({ context, event, machine }) =>
  context.isAuthenticated &&
  context.hasPermission &&
  event.isValid

// OR conditions
cond: ({ context, event, machine }) =>
  context.isAdmin ||
  context.userId === event.resourceOwnerId

// Complex logic
cond: ({ context, event, machine }) => {
  const hasAccess = context.isAuthenticated && context.hasPermission;
  const isOwner = context.userId === event.resourceOwnerId;
  const isPublic = event.resourceType === 'public';

  return hasAccess || isOwner || isPublic;
}
```

### Guards with Actions

Guards determine if transition occurs, actions execute if it does:

```javascript
{
  target: 'processing',
  cond: ({ context }) => context.balance >= 100,
  actions: [
    assign({ balance: ({ context }) => context.balance - 100 }),
    () => console.log('Payment processed')
  ]
}
// Actions only run if guard passes
```

## Guard Execution Order

1. Guards are evaluated **before** any actions
2. Guards are evaluated **in array order** for multiple transitions
3. First matching guard wins
4. If no guards match, no transition occurs
5. Guards do not modify state or context

```javascript
on: {
  EVENT: [
    { target: 'a', cond: () => false },  // Evaluated first
    { target: 'b', cond: () => true },   // Evaluated second, matches
    { target: 'c', cond: () => true }    // Never evaluated
  ]
}
// Result: transitions to state 'b'
```

## Testing Guards

### Testing in Isolation

```javascript
// Define guard separately for testing
const isValidUser = ({ context, event, machine }) =>
  event.user && event.user.verified;

// Test the guard
test('validates user correctly', () => {
  const validUser = { user: { verified: true } };
  const invalidUser = { user: { verified: false } };

  expect(isValidUser({ context: {}, event: validUser })).toBe(true);
  expect(isValidUser({ context: {}, event: invalidUser })).toBe(false);
});
```

### Testing with Machine

```javascript
test('guard prevents invalid transition', async () => {
  const machine = createMachine({
    initial: 'idle',
    context: { count: 0 },
    states: {
      idle: {
        on: {
          INCREMENT: {
            target: 'active',
            cond: ({ context }) => context.count < 5
          }
        }
      },
      active: {}
    }
  });

  // Guard allows transition
  await machine.send('INCREMENT');
  expect(machine.state).toBe('active');

  // After context change, guard blocks transition
  machine.context.count = 5;
  await machine.send('INCREMENT');
  expect(machine.state).toBe('active'); // Still in active, transition blocked
});
```

## Common Pitfalls

### ❌ Side Effects in Guards

```javascript
// Wrong - guard has side effect
cond: ({ context }) => {
  console.log('Checking...');  // Side effect!
  context.checked = true;       // Mutation!
  return context.isValid;
}

// Correct - pure function
cond: ({ context }) => context.isValid
```

### ❌ Async Guards

```javascript
// Wrong - guards must be synchronous
cond: async ({ context }) => {
  const result = await checkAPI();
  return result.isValid;
}

// Correct - use async action to check, then transition
entry: [async () => {
  const result = await checkAPI();
  machine.send(result.isValid ? 'VALID' : 'INVALID');
}]
```

### ❌ Forgetting Fallback

```javascript
// Risky - no fallback if conditions don't match
on: {
  SUBMIT: [
    { target: 'success', cond: ({ context }) => context.score > 80 },
    { target: 'failure', cond: ({ context }) => context.score < 50 }
  ]
}
// What happens if score is 65?

// Better - always have fallback
on: {
  SUBMIT: [
    { target: 'success', cond: ({ context }) => context.score > 80 },
    { target: 'failure', cond: ({ context }) => context.score < 50 },
    { target: 'pending' }  // Fallback for scores 50-80
  ]
}
```

## Best Practices

1. **Keep guards pure** - no side effects or mutations
2. **Guards must be synchronous** - use async actions for async checks
3. **Order matters** - place most specific conditions first
4. **Always include fallback** - handle all possible cases
5. **Test guards independently** - easier to verify logic
6. **Use named guards** for reusability and clarity