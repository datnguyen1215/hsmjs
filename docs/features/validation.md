# Validation

## Syntax Quick Reference

```javascript
// Validate machine configuration
const result = machine.validate();

// Check result
if (!result.valid) {
  console.error('Errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}

// Result structure
{
  valid: boolean,
  errors: Array,
  warnings: Array
}
```

## Basic Usage

Validate machine configuration for errors:

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine({
  id: 'example',
  initial: 'idle',
  states: {
    idle: {
      on: {
        START: 'active',
        ERROR: 'nonexistent'  // Error: target doesn't exist
      }
    },
    active: {
      on: {
        STOP: 'idle'
      }
    },
    unreachable: {}  // Warning: no incoming transitions
  }
});

const validation = machine.validate();
console.log(validation);
// {
//   valid: false,
//   errors: [{
//     type: 'INVALID_TARGET',
//     state: 'idle',
//     event: 'ERROR',
//     target: 'nonexistent'
//   }],
//   warnings: [{
//     type: 'UNREACHABLE_STATE',
//     state: 'unreachable'
//   }]
// }
```

## Error Types

### INVALID_TARGET

Transition targets non-existent state:

```javascript
states: {
  idle: {
    on: {
      START: 'missing'  // Error: 'missing' state doesn't exist
    }
  }
}

// Error object:
{
  type: 'INVALID_TARGET',
  state: 'idle',
  event: 'START',
  target: 'missing'
}
```

### MISSING_GUARD

String guard reference not found:

```javascript
const machine = createMachine({
  states: {
    idle: {
      on: {
        SUBMIT: {
          target: 'active',
          cond: 'isValid'  // Error: 'isValid' not in guards
        }
      }
    }
  }
});
// No guards defined

// Error object:
{
  type: 'MISSING_GUARD',
  state: 'idle',
  event: 'SUBMIT',
  guard: 'isValid'
}
```

### MISSING_ACTION

String action reference not found:

```javascript
const machine = createMachine({
  states: {
    idle: {
      entry: ['initialize'],  // Error: 'initialize' not in actions
      on: {
        START: {
          target: 'active',
          actions: ['logStart']  // Error: 'logStart' not in actions
        }
      }
    }
  }
});
// No actions defined

// Error object:
{
  type: 'MISSING_ACTION',
  state: 'idle',
  action: 'initialize'
}
```

### INVALID_INITIAL

Nested initial state doesn't exist:

```javascript
states: {
  parent: {
    initial: 'missing',  // Error: no child named 'missing'
    states: {
      child1: {},
      child2: {}
    }
  }
}

// Error object:
{
  type: 'INVALID_INITIAL',
  state: 'parent',
  initial: 'missing'
}
```

## Warning Types

### UNREACHABLE_STATE

State has no incoming transitions:

```javascript
states: {
  idle: {
    on: { START: 'active' }
  },
  active: {
    on: { STOP: 'idle' }
  },
  orphaned: {}  // Warning: can't reach this state
}

// Warning object:
{
  type: 'UNREACHABLE_STATE',
  state: 'orphaned'
}
```

Note: Initial states are not considered unreachable.

### EMPTY_STATE

State has no behavior:

```javascript
states: {
  idle: {},  // Warning: no transitions, actions, or children
  active: {
    on: { STOP: 'idle' }
  }
}

// Warning object:
{
  type: 'EMPTY_STATE',
  state: 'idle'
}
```

## Validation Patterns

### Validate During Development

```javascript
// In development/test environment
if (process.env.NODE_ENV !== 'production') {
  const validation = machine.validate();

  if (!validation.valid) {
    console.error('Machine configuration errors:');
    validation.errors.forEach(error => {
      console.error(`  - ${error.type}: ${JSON.stringify(error)}`);
    });
    throw new Error('Invalid machine configuration');
  }

  if (validation.warnings.length > 0) {
    console.warn('Machine configuration warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`  - ${warning.type}: ${JSON.stringify(warning)}`);
    });
  }
}
```

### Validation in Tests

```javascript
describe('Machine Configuration', () => {
  test('machine configuration is valid', () => {
    const machine = createMachine(config);
    const validation = machine.validate();

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('machine has no warnings', () => {
    const machine = createMachine(config);
    const validation = machine.validate();

    expect(validation.warnings).toHaveLength(0);
  });
});
```

### CI/CD Validation

```javascript
// validation-check.js
const { createMachine } = require('@datnguyen1215/hsmjs');
const configs = require('./all-machine-configs');

let hasErrors = false;

configs.forEach(config => {
  const machine = createMachine(config.definition, config.options);
  const validation = machine.validate();

  if (!validation.valid) {
    console.error(`❌ ${config.name} has errors:`);
    validation.errors.forEach(e => console.error(`   ${e.type}`));
    hasErrors = true;
  }

  if (validation.warnings.length > 0) {
    console.warn(`⚠️  ${config.name} has warnings:`);
    validation.warnings.forEach(w => console.warn(`   ${w.type}`));
  }
});

if (hasErrors) {
  process.exit(1);
}
```

## Complex Validation Scenarios

### Nested States Validation

```javascript
const nestedMachine = createMachine({
  id: 'app',
  initial: 'auth',
  states: {
    auth: {
      initial: 'login',
      states: {
        login: {
          on: {
            SUCCESS: '#app.main.dashboard',  // Validates ID reference
            FORGOT: 'reset'  // Validates sibling exists
          }
        },
        reset: {
          on: {
            COMPLETE: 'login'
          }
        }
      }
    },
    main: {
      id: 'main',
      initial: 'dashboard',
      states: {
        dashboard: {},
        profile: {}
      }
    }
  }
});

const validation = nestedMachine.validate();
// Checks all nested references and paths
```

### Guard and Action Validation

```javascript
const machine = createMachine({
  states: {
    idle: {
      entry: ['logEntry', checkStatus],  // Mixed string and function
      on: {
        SUBMIT: [
          {
            target: 'processing',
            cond: 'isValid',  // String guard
            actions: ['validate', processData]  // Mixed actions
          }
        ]
      }
    }
  }
}, {
  guards: {
    isValid: ({ context }) => context.isValid
    // Missing other guards would cause error
  },
  actions: {
    logEntry: () => console.log('Entry'),
    validate: () => console.log('Validating')
    // checkStatus is a function, not string - OK
    // processData is a function, not string - OK
  }
});

const validation = machine.validate();
// Validates all string references exist
```

## Common Validation Issues

### Issue: Typos in State Names

```javascript
// Common mistake - typo in target
states: {
  idle: {
    on: {
      START: 'acitve'  // Should be 'active'
    }
  },
  active: {}
}

// Validation catches this
```

### Issue: Missing Child States

```javascript
// Forgot to define initial child
states: {
  parent: {
    initial: 'child1',
    states: {
      // Oops, no children defined!
    }
  }
}

// Validation error: INVALID_INITIAL
```

### Issue: Circular Dependencies

```javascript
// State A requires B, B requires A
states: {
  stateA: {
    on: {
      GO: 'stateB'  // Valid
    }
  },
  stateB: {
    on: {
      GO: 'stateA'  // Valid - circular is OK
    }
  }
}

// Validation passes - circular references are allowed
```

## Best Practices

### 1. Validate Early

```javascript
// Validate immediately after creation
const machine = createMachine(config);

if (process.env.NODE_ENV !== 'production') {
  const validation = machine.validate();
  if (!validation.valid) {
    throw new Error(`Invalid machine: ${JSON.stringify(validation.errors)}`);
  }
}
```

### 2. Validate in Tests

```javascript
beforeAll(() => {
  const validation = machine.validate();
  if (!validation.valid) {
    console.error(validation.errors);
    throw new Error('Machine configuration is invalid');
  }
});
```

### 3. Document Warnings

```javascript
// Some warnings might be intentional
states: {
  error: {}  // Intentionally unreachable - set via restore()
}

// Document why warnings are acceptable
```

### 4. Automate Validation

```json
// package.json
{
  "scripts": {
    "validate-machines": "node scripts/validate-all-machines.js",
    "pretest": "npm run validate-machines"
  }
}
```

## Common Pitfalls

### ❌ Ignoring Warnings

```javascript
// Warnings often indicate bugs
{
  warnings: [{
    type: 'UNREACHABLE_STATE',
    state: 'success'  // Why can't we reach success?
  }]
}

// Investigate warnings - they usually matter
```

### ❌ Validating in Production

```javascript
// Don't validate in production - wastes resources
if (process.env.NODE_ENV === 'production') {
  machine.validate();  // Unnecessary overhead
}

// Validate during development/testing only
```

### ❌ Not Checking Validation Result

```javascript
// Wrong - calling validate but ignoring result
machine.validate();

// Correct - check the result
const validation = machine.validate();
if (!validation.valid) {
  // Handle errors
}
```

## Best Practices Summary

1. **Always validate during development**
2. **Treat errors as failures** - don't ignore them
3. **Investigate warnings** - they often reveal issues
4. **Automate validation** in CI/CD pipeline
5. **Validate after configuration changes**
6. **Don't validate in production** - it's a development tool
7. **Test that machines are valid** in your test suite