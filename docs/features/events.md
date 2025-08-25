# Events

## Syntax Quick Reference

```javascript
// Fire and forget
machine.send('EVENT');

// With payload
machine.send('EVENT', { data: 'value' });

// Await results
const result = await machine.send('EVENT');

// Priority event (clears queue)
await machine.sendPriority('EMERGENCY_STOP');

// Clear event queue
const cleared = machine.clearQueue();

// Wildcard event handler
on: {
  SPECIFIC: 'state',
  '*': { actions: ['handleUnknown'] }
}
```

## Basic Usage

Events trigger transitions between states:

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'toggle',
  initial: 'off',
  states: {
    off: {
      on: {
        TOGGLE: 'on',
        FORCE_ON: 'on'
      }
    },
    on: {
      on: {
        TOGGLE: 'off',
        FORCE_OFF: 'off'
      }
    }
  }
});

// Send events
machine.send('TOGGLE');  // off -> on
machine.send('TOGGLE');  // on -> off
machine.send('FORCE_ON'); // off -> on
```

## Sending Events

### Fire and Forget

Send event without waiting for completion:

```javascript
// Events are queued and processed in order
machine.send('START');
machine.send('NEXT');
machine.send('FINISH');

// Machine processes: START -> NEXT -> FINISH
```

### Awaiting Results

Wait for transition to complete and get results:

```javascript
const result = await machine.send('FETCH', { url: '/api/data' });

console.log(result.state);    // New state after transition
console.log(result.context);  // Updated context
console.log(result.results);  // Action return values

// Result structure:
{
  state: 'success',
  context: { data: [...], loading: false },
  results: [
    { value: 'action return value' },
    { name: 'namedAction', value: 'named action return' }
  ]
}
```

### Event Payloads

Send data with events:

```javascript
// Simple payload
machine.send('SET_USER', { name: 'John', id: 123 });

// Access in actions
actions: [({ context, event, machine }) => {
  console.log(event.type);  // 'SET_USER'
  console.log(event.name);  // 'John'
  console.log(event.id);    // 123
}]

// Access in guards
cond: ({ context, event, machine }) => event.id === 123
```

## Priority Events

### sendPriority()

Clear queue and process immediately:

```javascript
// Normal events queued
machine.send('PROCESS_1');
machine.send('PROCESS_2');
machine.send('PROCESS_3');

// Priority event clears queue and runs immediately
await machine.sendPriority('EMERGENCY_STOP');
// PROCESS_1, PROCESS_2, PROCESS_3 are cancelled
```

Use cases:
- Emergency stops
- User cancellations
- System errors
- Timeout handling

## Queue Management

### Event Queuing

Events automatically queue when machine is busy:

```javascript
const machine = createMachine({
  states: {
    idle: {
      on: {
        PROCESS: {
          target: 'processing',
          actions: [async () => {
            await delay(1000);  // Takes 1 second
          }]
        }
      }
    },
    processing: {
      on: {
        DONE: 'idle'
      }
    }
  }
});

// Rapid fire events
machine.send('PROCESS');  // Starts processing
machine.send('DONE');     // Queued
machine.send('PROCESS');  // Queued
// Events process in order after each completes
```

### clearQueue()

Manually clear all queued events:

```javascript
// Queue multiple events
machine.send('EVENT_1');
machine.send('EVENT_2');
machine.send('EVENT_3');

// Clear them all
const clearedCount = machine.clearQueue();
console.log(`Cleared ${clearedCount} events`);

// Pending promises reject with QueueClearedError
try {
  await machine.send('EVENT');
} catch (error) {
  if (error instanceof QueueClearedError) {
    console.log('Event was cleared from queue');
  }
}
```

## Wildcard Events

Handle any unmatched event with `*`:

```javascript
const machine = createMachine({
  states: {
    idle: {
      on: {
        START: 'active',
        STOP: 'idle',
        '*': {  // Catches any other event
          actions: [({ context, event, machine }) => {
            console.log(`Unknown event: ${event.type}`);
            // Log to analytics, show error, etc.
          }]
        }
      }
    }
  }
});

machine.send('START');    // Handled: idle -> active
machine.send('UNKNOWN');  // Caught by wildcard
machine.send('RANDOM');   // Caught by wildcard
```

### Wildcard Behavior

- Only triggers if no specific handler matches
- Specific events always take precedence
- Can have target, actions, and guards
- Not shown in visualizations (for clarity)

```javascript
on: {
  KNOWN_EVENT: 'nextState',
  '*': {
    target: 'errorState',
    cond: ({ context, event, machine }) => !context.allowUnknown,
    actions: ['logUnknownEvent']
  }
}
```

## Event Patterns

### Event Delegation

Send events from within actions:

```javascript
entry: [
  async ({ context, event, machine }) => {
    try {
      const data = await fetchData();
      machine.send('FETCH_SUCCESS', { data });
    } catch (error) {
      machine.send('FETCH_ERROR', { error });
    }
  }
]
```

### Event Chaining

Trigger sequences of events:

```javascript
states: {
  step1: {
    entry: [() => {
      // Automatically proceed after delay
      setTimeout(() => machine.send('NEXT'), 1000);
    }],
    on: { NEXT: 'step2' }
  },
  step2: {
    entry: [() => {
      setTimeout(() => machine.send('NEXT'), 1000);
    }],
    on: { NEXT: 'step3' }
  }
}
```

### Conditional Event Sending

```javascript
actions: [
  ({ context, event, machine }) => {
    if (context.retries < 3) {
      machine.send('RETRY');
    } else {
      machine.send('FAIL');
    }
  }
]
```

## Event Object Structure

Events internally have this structure:

```javascript
{
  type: 'EVENT_NAME',  // Required
  ...payload           // Any additional properties
}

// When you send:
machine.send('UPDATE', { value: 42, user: 'John' });

// Event object is:
{
  type: 'UPDATE',
  value: 42,
  user: 'John'
}
```

## Common Pitfalls

### [ERROR] Assuming Immediate Processing

```javascript
// Wrong - assuming synchronous
machine.send('EVENT');
console.log(machine.state);  // Might not be updated yet

// Correct - await if you need the result
await machine.send('EVENT');
console.log(machine.state);  // Now it's updated
```

### [ERROR] Not Handling Queue Cleared Errors

```javascript
// Wrong - not handling rejection
machine.send('EVENT').then(result => {
  console.log(result);
});

// Correct - handle potential queue clearing
machine.send('EVENT')
  .then(result => console.log(result))
  .catch(error => {
    if (error instanceof QueueClearedError) {
      console.log('Event was cancelled');
    }
  });
```

### [ERROR] Overusing Priority Events

```javascript
// Wrong - using priority for normal flow
await machine.sendPriority('NEXT_STEP');

// Correct - use priority only for urgent cases
await machine.sendPriority('EMERGENCY_STOP');

// Normal flow should use regular send
await machine.send('NEXT_STEP');
```

## Best Practices

1. **Use descriptive event names** - `USER_CLICKED_SUBMIT` not `CLICK`
2. **Include relevant data** in event payloads
3. **Await when you need results** or confirmation
4. **Fire and forget** for UI events that don't need confirmation
5. **Use priority events sparingly** - only for true interruptions
6. **Handle QueueClearedError** when using async sends
7. **Use wildcards for logging** unknown events, not core logic