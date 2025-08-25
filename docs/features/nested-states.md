# Nested States

## Syntax Quick Reference

```javascript
// Basic nesting
states: {
  parent: {
    initial: 'child1',  // Required for parent states
    states: {
      child1: { on: { NEXT: 'child2' } },
      child2: { on: { BACK: 'child1' } }
    }
  }
}

// State IDs for external references
states: {
  parent: {
    id: 'parentId',
    states: {
      child: {
        on: { JUMP: '#otherId' }  // Jump to state with id
      }
    }
  }
}

// Check nested state
machine.matches('parent.child')
```

## Basic Usage

Hierarchical states organize complex logic into manageable structures:

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const authMachine = createMachine({
  id: 'auth',
  initial: 'loggedOut',
  states: {
    loggedOut: {
      on: { LOGIN: 'loggedIn' }
    },
    loggedIn: {
      initial: 'dashboard',    // Default child state
      states: {
        dashboard: {
          on: {
            VIEW_PROFILE: 'profile',
            VIEW_SETTINGS: 'settings'
          }
        },
        profile: {
          on: {
            BACK: 'dashboard',
            EDIT: 'editProfile'
          }
        },
        editProfile: {
          on: {
            SAVE: 'profile',
            CANCEL: 'profile'
          }
        },
        settings: {
          on: { BACK: 'dashboard' }
        }
      },
      on: {
        LOGOUT: 'loggedOut'  // Parent-level transition
      }
    }
  }
});

// Usage
await authMachine.send('LOGIN');
console.log(authMachine.state); // 'loggedIn.dashboard'

await authMachine.send('VIEW_PROFILE');
console.log(authMachine.state); // 'loggedIn.profile'

await authMachine.send('LOGOUT');
console.log(authMachine.state); // 'loggedOut'
```

## Parent and Child States

### Parent State Configuration

Parent states must have `initial` property:

```javascript
states: {
  parentState: {
    initial: 'firstChild',  // Required
    states: {
      firstChild: {},
      secondChild: {}
    },
    // Parent can have its own transitions
    on: {
      RESET: 'otherState',
      EXIT: 'done'
    }
  }
}
```

### Child State Behavior

- Child states inherit parent's context
- Parent transitions override child transitions
- Exiting parent exits all children

```javascript
states: {
  app: {
    initial: 'loading',
    on: {
      ERROR: 'errorPage'  // Available from any child
    },
    states: {
      loading: {
        on: {
          SUCCESS: 'ready',
          ERROR: 'failed'  // Overrides parent's ERROR
        }
      },
      ready: {
        // Inherits parent's ERROR handler
      },
      failed: {
        on: { RETRY: 'loading' }
      }
    }
  }
}
```

## State IDs and References

### Defining State IDs

Assign IDs to reference states from anywhere:

```javascript
states: {
  auth: {
    id: 'authentication',
    initial: 'login',
    states: {
      login: {
        id: 'loginForm',
        on: {
          SUCCESS: '#mainApp.dashboard'  // Jump to external state
        }
      },
      register: {
        on: {
          SUCCESS: '#mainApp.onboarding'
        }
      }
    }
  },
  main: {
    id: 'mainApp',
    initial: 'dashboard',
    states: {
      dashboard: {
        on: {
          LOGOUT: '#authentication.login'  // Jump back to auth
        }
      },
      onboarding: {
        on: {
          COMPLETE: 'dashboard',
          SKIP: 'dashboard'
        }
      }
    }
  }
}
```

### ID Reference Syntax

```javascript
// Internal reference (same parent)
on: { EVENT: 'sibling' }

// External reference by ID
on: { EVENT: '#stateId' }

// Child of ID reference
on: { EVENT: '#parentId.childName' }

// Current state's child
on: { EVENT: '.childName' }
```

## State Matching

### Check Current State

```javascript
// Exact match
if (machine.matches('loggedIn.profile')) {
  console.log('User is viewing profile');
}

// Parent match (matches any child)
if (machine.matches('loggedIn')) {
  console.log('User is logged in');
}

// Check multiple states
const isInApp = machine.matches('app.ready') ||
                machine.matches('app.loading');
```

### State Path

Current state includes full path:

```javascript
console.log(machine.state);
// 'parent.child.grandchild'

// Split into array
const statePath = machine.state.split('.');
// ['parent', 'child', 'grandchild']
```

## Transitions

### Within Same Parent

Children can transition to siblings directly:

```javascript
states: {
  wizard: {
    initial: 'step1',
    states: {
      step1: {
        on: { NEXT: 'step2' }  // Direct sibling reference
      },
      step2: {
        on: {
          NEXT: 'step3',
          BACK: 'step1'
        }
      },
      step3: {
        on: {
          SUBMIT: '#done',  // Exit to external state
          BACK: 'step2'
        }
      }
    }
  }
}
```

### Cross-Hierarchy Transitions

Jump between different parts of the hierarchy:

```javascript
states: {
  section1: {
    id: 'section1',
    initial: 'page1',
    states: {
      page1: {
        on: {
          JUMP: '#section2.page2'  // Direct jump to nested state
        }
      }
    }
  },
  section2: {
    id: 'section2',
    initial: 'page1',
    states: {
      page1: {},
      page2: {
        on: {
          BACK: '#section1.page1'  // Jump back
        }
      }
    }
  }
}
```

## Entry and Exit Actions

### Parent State Actions

Parent entry/exit actions run when entering/leaving the parent:

```javascript
states: {
  modal: {
    entry: [() => console.log('Modal opened')],
    exit: [() => console.log('Modal closed')],
    initial: 'form',
    states: {
      form: {
        entry: [() => console.log('Form shown')],
        on: { SUBMIT: 'success' }
      },
      success: {
        entry: [() => console.log('Success shown')]
      }
    }
  }
}

// LOGIN → modal.form
// Logs: "Modal opened", "Form shown"

// Inside modal: form → success
// Logs: "Success shown" (no parent entry/exit)

// CLOSE from modal.success → otherState
// Logs: "Modal closed"
```

## Deep Nesting

States can be nested multiple levels:

```javascript
states: {
  app: {
    initial: 'auth',
    states: {
      auth: {
        initial: 'login',
        states: {
          login: {
            initial: 'form',
            states: {
              form: {
                on: { SUBMIT: 'validating' }
              },
              validating: {
                on: {
                  SUCCESS: '#app.main.dashboard',
                  ERROR: 'form'
                }
              }
            }
          }
        }
      },
      main: {
        initial: 'dashboard',
        states: {
          dashboard: {},
          settings: {}
        }
      }
    }
  }
}

// Full state path: 'app.auth.login.form'
```

## Common Patterns

### Wizard/Multi-Step Forms

```javascript
const wizardMachine = createMachine({
  id: 'wizard',
  initial: 'personalInfo',
  context: { data: {} },
  states: {
    personalInfo: {
      on: {
        NEXT: {
          target: 'addressInfo',
          actions: [assign({ data: ({ context, event, machine }) =>
            ({ ...context.data, ...event.formData })
          })]
        }
      }
    },
    addressInfo: {
      on: {
        NEXT: {
          target: 'payment',
          actions: [assign({ data: ({ context, event, machine }) =>
            ({ ...context.data, ...event.formData })
          })]
        },
        BACK: 'personalInfo'
      }
    },
    payment: {
      on: {
        SUBMIT: 'processing',
        BACK: 'addressInfo'
      }
    },
    processing: {
      entry: [async ({ context }) => {
        const result = await submitForm(context.data);
        machine.send(result.success ? 'SUCCESS' : 'ERROR');
      }],
      on: {
        SUCCESS: 'complete',
        ERROR: 'payment'
      }
    },
    complete: {}
  }
});
```

### Application Sections

```javascript
const appMachine = createMachine({
  id: 'app',
  initial: 'loading',
  states: {
    loading: {
      on: { LOADED: 'main' }
    },
    main: {
      initial: 'dashboard',
      states: {
        dashboard: {
          on: {
            VIEW_USERS: 'users',
            VIEW_SETTINGS: 'settings'
          }
        },
        users: {
          initial: 'list',
          states: {
            list: {
              on: { SELECT_USER: 'detail' }
            },
            detail: {
              on: { BACK: 'list' }
            }
          },
          on: { BACK: 'dashboard' }
        },
        settings: {
          on: { BACK: 'dashboard' }
        }
      },
      on: { LOGOUT: 'loading' }
    }
  }
});
```

## Common Pitfalls

### ❌ Forgetting Initial State

```javascript
// Wrong - parent needs initial
states: {
  parent: {
    states: {
      child1: {},
      child2: {}
    }
  }
}

// Correct
states: {
  parent: {
    initial: 'child1',  // Required
    states: {
      child1: {},
      child2: {}
    }
  }
}
```

### ❌ Invalid State References

```javascript
// Wrong - missing # for ID reference
on: { EVENT: 'otherId' }  // Looks for sibling named 'otherId'

// Correct - use # for ID reference
on: { EVENT: '#otherId' }
```

### ❌ Circular References

```javascript
// Avoid circular parent-child references
states: {
  parent: {
    id: 'parent',
    initial: 'child',
    states: {
      child: {
        on: { LOOP: '#parent' }  // Goes to parent, but which child?
      }
    }
  }
}

// Better - be explicit
on: { LOOP: '#parent.child' }
```

## Best Practices

1. **Use IDs for cross-hierarchy jumps** - clearer than relative paths
2. **Keep nesting shallow** - max 3-4 levels for maintainability
3. **Group related states** - authentication, settings, etc.
4. **Name states clearly** - 'editingProfile' not 'state3'
5. **Use parent for shared handlers** - logout, error handling
6. **Document state hierarchy** - use visualization tools