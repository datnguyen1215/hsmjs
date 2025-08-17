import { createMachine, assign } from '../src/index.js';

// Example: Command processor with wildcard fallback
const commandMachine = createMachine({
  id: 'commandProcessor',
  initial: 'idle',
  context: {
    lastCommand: null,
    unknownCommands: [],
    helpShown: false
  },
  states: {
    idle: {
      on: {
        START: 'running',
        HELP: {
          target: 'idle',
          actions: [
            assign({ helpShown: true }),
            () => console.log('Available commands: START, STOP, RESTART, STATUS')
          ]
        },
        STATUS: {
          actions: [() => console.log('Status: Idle')]
        },
        // Wildcard catches all unknown commands
        '*': {
          actions: [
            (ctx, event) => console.log(`Unknown command: ${event.type}`),
            assign((ctx, event) => ({
              lastCommand: event.type,
              unknownCommands: [...ctx.unknownCommands, event.type]
            }))
          ]
        }
      }
    },
    running: {
      on: {
        STOP: 'idle',
        RESTART: {
          target: 'running',
          actions: [() => console.log('Restarting...')]
        },
        STATUS: {
          actions: [() => console.log('Status: Running')]
        },
        // Different wildcard behavior in running state
        '*': {
          actions: [
            (ctx, event) => console.log(`Command '${event.type}' not available while running`)
          ]
        }
      }
    }
  }
});

// Example: Error recovery with wildcard
const resilientMachine = createMachine({
  id: 'resilient',
  initial: 'operational',
  context: {
    errorCount: 0,
    lastError: null
  },
  states: {
    operational: {
      on: {
        PROCESS: {
          target: 'processing'
        },
        // Wildcard for unexpected events - log and continue
        '*': {
          actions: [
            (ctx, event) => console.log(`[WARNING] Unexpected event in operational: ${event.type}`)
          ]
        }
      }
    },
    processing: {
      on: {
        SUCCESS: 'operational',
        ERROR: 'error',
        // Wildcard during processing - could be critical
        '*': {
          target: 'error',
          actions: [
            assign((ctx, event) => ({
              errorCount: ctx.errorCount + 1,
              lastError: `Unexpected event during processing: ${event.type}`
            }))
          ]
        }
      }
    },
    error: {
      on: {
        RETRY: 'operational',
        RESET: {
          target: 'operational',
          actions: [assign({ errorCount: 0, lastError: null })]
        },
        // Wildcard in error state - ignore most events
        '*': {
          actions: [
            () => console.log('System in error state. Use RETRY or RESET.')
          ]
        }
      }
    }
  }
});

// Example: Wildcard with guards
const guardedWildcardMachine = createMachine({
  id: 'guardedWildcard',
  initial: 'locked',
  context: {
    attempts: 0,
    maxAttempts: 3
  },
  states: {
    locked: {
      on: {
        UNLOCK: {
          target: 'unlocked',
          cond: (ctx, event) => event.code === '1234'
        },
        // Wildcard with guard - only track failed unlock attempts
        '*': [
          {
            actions: [
              assign(ctx => ({ attempts: ctx.attempts + 1 })),
              () => console.log('Invalid unlock attempt')
            ],
            cond: (ctx) => ctx.attempts < ctx.maxAttempts
          },
          {
            target: 'blocked',
            actions: [() => console.log('Too many attempts - system blocked')]
          }
        ]
      }
    },
    unlocked: {
      on: {
        LOCK: 'locked',
        '*': {
          actions: [() => console.log('System is unlocked - any action allowed')]
        }
      }
    },
    blocked: {
      on: {
        ADMIN_RESET: {
          target: 'locked',
          actions: [assign({ attempts: 0 })]
        },
        '*': {
          actions: [() => console.log('System blocked - admin reset required')]
        }
      }
    }
  }
});

// Demo the machines
console.log('\n=== Command Processor Demo ===');
commandMachine.send('STATUS');
commandMachine.send('START');
commandMachine.send('INVALID_COMMAND'); // Caught by wildcard
commandMachine.send('STATUS');
commandMachine.send('STOP');
commandMachine.send('UNKNOWN'); // Caught by wildcard

console.log('\n=== Resilient Machine Demo ===');
resilientMachine.send('PROCESS');
resilientMachine.send('UNEXPECTED_EVENT'); // Triggers error via wildcard
console.log('Error count:', resilientMachine.context.errorCount);
resilientMachine.send('INVALID_RECOVERY'); // Caught by error state wildcard
resilientMachine.send('RESET');

console.log('\n=== Guarded Wildcard Demo ===');
guardedWildcardMachine.send('WRONG_CODE'); // Caught by wildcard
guardedWildcardMachine.send('ANOTHER_WRONG'); // Caught by wildcard
guardedWildcardMachine.send('THIRD_WRONG'); // Caught by wildcard
guardedWildcardMachine.send('FOURTH_ATTEMPT'); // Triggers block via wildcard guard
guardedWildcardMachine.send('ANYTHING'); // Blocked state wildcard
guardedWildcardMachine.send('ADMIN_RESET');
guardedWildcardMachine.send('UNLOCK', { code: '1234' });
guardedWildcardMachine.send('RANDOM_ACTION'); // Unlocked state wildcard

// Validate the machines
console.log('\n=== Validation Results ===');
const commandValidation = commandMachine.validate();
console.log('Command Machine Valid:', commandValidation.valid);

const resilientValidation = resilientMachine.validate();
console.log('Resilient Machine Valid:', resilientValidation.valid);

const guardedValidation = guardedWildcardMachine.validate();
console.log('Guarded Machine Valid:', guardedValidation.valid);