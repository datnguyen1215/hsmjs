# History & Undo

## Syntax Quick Reference

```javascript
// Access history
machine.history           // Array of all snapshots
machine.historySize       // Number of stored states

// Get current snapshot
const snapshot = machine.snapshot;  // { state, context }

// Restore previous state
await machine.restore(snapshot);

// Configure history size
createMachine(config, { historySize: 100 });

// Implement undo
const previous = machine.history[machine.history.length - 2];
await machine.restore(previous);
```

## Basic Usage

HSMJS automatically tracks state history:

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const editorMachine = createMachine({
  id: 'editor',
  initial: 'editing',
  context: {
    text: '',
    saved: true
  },
  states: {
    editing: {
      on: {
        TYPE: {
          actions: [assign({
            text: ({ context, event, machine }) => context.text + event.char,
            saved: false
          })]
        },
        SAVE: {
          actions: [assign({ saved: true })]
        },
        UNDO: {
          actions: [async () => {
            if (editorMachine.historySize > 1) {
              const previous = editorMachine.history[editorMachine.historySize - 2];
              await editorMachine.restore(previous);
            }
          }]
        }
      }
    }
  }
});

// Type some text
await editorMachine.send('TYPE', { char: 'H' });
await editorMachine.send('TYPE', { char: 'i' });

// Check history
console.log(editorMachine.historySize);  // 3 (initial + 2 changes)

// Undo last change
await editorMachine.send('UNDO');
console.log(editorMachine.context.text);  // 'H'
```

## History Management

### Automatic History Tracking

Every state transition is automatically recorded:

```javascript
const machine = createMachine({
  id: 'tracked',
  initial: 'state1',
  context: { value: 0 },
  states: {
    state1: {
      on: {
        NEXT: {
          target: 'state2',
          actions: [assign({ value: 1 })]
        }
      }
    },
    state2: {
      on: {
        NEXT: {
          target: 'state3',
          actions: [assign({ value: 2 })]
        }
      }
    },
    state3: {}
  }
});

// Each transition adds to history
await machine.send('NEXT');  // state1 -> state2
await machine.send('NEXT');  // state2 -> state3

console.log(machine.history);
// [
//   { state: 'state1', context: { value: 0 } },
//   { state: 'state2', context: { value: 1 } },
//   { state: 'state3', context: { value: 2 } }
// ]
```

### History Size Configuration

Control how many states are kept in memory:

```javascript
// Default: 50 states
const defaultMachine = createMachine(config);

// Custom: Keep 100 states
const largeMachine = createMachine(config, { historySize: 100 });

// Minimal: Keep only 10 states
const smallMachine = createMachine(config, { historySize: 10 });

// When limit is reached, oldest states are removed
```

## Snapshots

### Current Snapshot

Get current state and context as a snapshot:

```javascript
const snapshot = machine.snapshot;

console.log(snapshot);
// {
//   state: 'currentState',
//   context: { ...currentContext }
// }

// Snapshots are immutable and serializable
const json = JSON.stringify(snapshot);
const parsed = JSON.parse(json);
```

### Snapshot Structure

```javascript
{
  state: string,    // Current state path (e.g., 'parent.child')
  context: Object   // Complete context at that point
}
```

## State Restoration

### Basic Restore

Restore machine to any previous snapshot:

```javascript
// Save checkpoint
const checkpoint = machine.snapshot;

// Make changes
await machine.send('CHANGE_1');
await machine.send('CHANGE_2');

// Restore to checkpoint
await machine.restore(checkpoint);

// Machine is back to checkpoint state
console.log(machine.state === checkpoint.state);  // true
console.log(machine.context);  // Same as checkpoint.context
```

### Restore Behavior

Important characteristics of restore:

```javascript
const machine = createMachine({
  states: {
    state1: {
      entry: [() => console.log('Entering state1')],
      exit: [() => console.log('Exiting state1')],
      on: { NEXT: 'state2' }
    },
    state2: {
      entry: [() => console.log('Entering state2')],
      exit: [() => console.log('Exiting state2')]
    }
  }
});

await machine.send('NEXT');
// Logs: "Exiting state1", "Entering state2"

const state1Snapshot = machine.history[0];
await machine.restore(state1Snapshot);
// No logs! Entry/exit actions are NOT executed during restore
```

Key points:
- **No entry/exit actions** are executed
- **Context is restored exactly**
- **Event queue is cleared**
- **Subscribers are notified**
- **Restored state is added to history**

## Undo Patterns

### Simple Undo

Basic undo implementation:

```javascript
const undoMachine = createMachine({
  id: 'undo',
  initial: 'active',
  context: { value: '' },
  states: {
    active: {
      on: {
        CHANGE: {
          actions: [assign({
            value: ({ context, event, machine }) => event.value
          })]
        },
        UNDO: {
          actions: [async () => {
            const history = undoMachine.history;
            if (history.length > 1) {
              // Go to previous state
              const previous = history[history.length - 2];
              await undoMachine.restore(previous);
            }
          }]
        }
      }
    }
  }
});
```

### Undo with Redo

Track undo/redo stacks:

```javascript
const undoRedoMachine = createMachine({
  id: 'undoRedo',
  initial: 'active',
  context: {
    value: '',
    undoStack: [],
    redoStack: []
  },
  states: {
    active: {
      on: {
        CHANGE: {
          actions: [
            // Save current state to undo stack
            assign({
              undoStack: ({ context }) => [
                ...context.undoStack,
                { value: context.value }
              ],
              value: ({ event }) => event.value,
              redoStack: []  // Clear redo on new change
            })
          ]
        },
        UNDO: {
          cond: ({ context }) => context.undoStack.length > 0,
          actions: [assign({
            redoStack: ({ context }) => [
              ...context.redoStack,
              { value: context.value }
            ],
            value: ({ context }) => {
              const last = context.undoStack[context.undoStack.length - 1];
              return last.value;
            },
            undoStack: ({ context }) => context.undoStack.slice(0, -1)
          })]
        },
        REDO: {
          cond: ({ context }) => context.redoStack.length > 0,
          actions: [assign({
            undoStack: ({ context }) => [
              ...context.undoStack,
              { value: context.value }
            ],
            value: ({ context }) => {
              const last = context.redoStack[context.redoStack.length - 1];
              return last.value;
            },
            redoStack: ({ context }) => context.redoStack.slice(0, -1)
          })]
        }
      }
    }
  }
});
```

## State Persistence

### Save to Local Storage

Persist state across sessions:

```javascript
const persistentMachine = createMachine({
  id: 'persistent',
  initial: 'idle',
  context: {
    user: null,
    preferences: {}
  },
  states: {
    idle: {
      entry: [
        // Restore on startup
        async () => {
          const saved = localStorage.getItem('appState');
          if (saved) {
            try {
              const snapshot = JSON.parse(saved);
              await persistentMachine.restore(snapshot);
              console.log('State restored from storage');
            } catch (error) {
              console.error('Failed to restore state:', error);
            }
          }
        }
      ],
      on: {
        UPDATE: {
          actions: [
            assign({
              preferences: ({ event }) => event.preferences
            }),
            // Save after each update
            ({ context }) => {
              const snapshot = persistentMachine.snapshot;
              localStorage.setItem('appState', JSON.stringify(snapshot));
            }
          ]
        }
      }
    }
  }
});
```

### Session Recovery

Recover from unexpected shutdowns:

```javascript
// Auto-save periodically
setInterval(() => {
  const snapshot = machine.snapshot;
  localStorage.setItem('autoSave', JSON.stringify({
    snapshot,
    timestamp: Date.now()
  }));
}, 5000);  // Every 5 seconds

// On startup
const autoSave = localStorage.getItem('autoSave');
if (autoSave) {
  const { snapshot, timestamp } = JSON.parse(autoSave);
  const age = Date.now() - timestamp;

  if (age < 60000) {  // Less than 1 minute old
    await machine.restore(snapshot);
    console.log('Recovered from auto-save');
  }
}
```

## Advanced Patterns

### History Navigation

Browse through history like a timeline:

```javascript
const timelineMachine = createMachine({
  id: 'timeline',
  initial: 'present',
  context: {
    historyIndex: -1,  // -1 means current
    data: null
  },
  states: {
    present: {
      on: {
        GO_TO_HISTORY: {
          target: 'browsing',
          actions: [assign({
            historyIndex: ({ event }) => event.index
          })]
        }
      }
    },
    browsing: {
      entry: [async ({ context }) => {
        const snapshot = timelineMachine.history[context.historyIndex];
        if (snapshot) {
          await timelineMachine.restore(snapshot);
        }
      }],
      on: {
        PREVIOUS: {
          cond: ({ context }) => context.historyIndex > 0,
          actions: [assign({
            historyIndex: ({ context }) => context.historyIndex - 1
          })]
        },
        NEXT: {
          cond: ({ context }) =>
            context.historyIndex < timelineMachine.historySize - 1,
          actions: [assign({
            historyIndex: ({ context }) => context.historyIndex + 1
          })]
        },
        RETURN_TO_PRESENT: {
          target: 'present',
          actions: [async () => {
            const latest = timelineMachine.history[
              timelineMachine.historySize - 1
            ];
            await timelineMachine.restore(latest);
          }]
        }
      }
    }
  }
});
```

### Checkpoints

Save specific checkpoints for later:

```javascript
const checkpointMachine = createMachine({
  id: 'checkpoint',
  initial: 'working',
  context: {
    checkpoints: {},
    data: null
  },
  states: {
    working: {
      on: {
        SAVE_CHECKPOINT: {
          actions: [assign({
            checkpoints: ({ context, event, machine }) => ({
              ...context.checkpoints,
              [event.name]: checkpointMachine.snapshot
            })
          })]
        },
        RESTORE_CHECKPOINT: {
          actions: [async ({ context, event, machine }) => {
            const checkpoint = context.checkpoints[event.name];
            if (checkpoint) {
              await checkpointMachine.restore(checkpoint);
            }
          }]
        }
      }
    }
  }
});

// Save named checkpoints
await machine.send('SAVE_CHECKPOINT', { name: 'beforeExperiment' });
// Make changes...
await machine.send('RESTORE_CHECKPOINT', { name: 'beforeExperiment' });
```

## Common Pitfalls

### [ERROR] Modifying History Array

```javascript
// Wrong - modifying history directly
machine.history.push(customSnapshot);  // Don't do this!

// History is read-only, use restore() to change state
await machine.restore(customSnapshot);
```

### [ERROR] Expecting Actions on Restore

```javascript
// Wrong - expecting entry actions
states: {
  state1: {
    entry: [() => console.log('This will NOT run on restore')]
  }
}

// Actions only run on normal transitions, not restore
```

### [ERROR] Storing Non-Serializable Data

```javascript
// Wrong - functions can't be serialized
context: {
  callback: () => console.log('Hello')  // Won't survive JSON serialization
}

// Use serializable data only for persistence
context: {
  callbackName: 'sayHello'  // Reference by name instead
}
```

## Best Practices

1. **Configure appropriate history size** based on memory constraints
2. **Use snapshots for checkpoints** before risky operations
3. **Persist critical states** to storage regularly
4. **Clear sensitive data** from context before persisting
5. **Validate restored states** to handle corrupted data
6. **Consider compression** for large context objects
7. **Test restore behavior** in your state machine logic