# Framework Integration

Learn how to integrate HSMJS with popular JavaScript frameworks.

## React Integration

### Basic Hook Implementation

```javascript
// hooks/useMachine.js
import { useReducer, useEffect } from 'react';

export const useMachine = (machine) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsubscribe = machine.subscribe(() => forceUpdate());
    return unsubscribe;
  }, [machine]);

  return [machine.state, machine.context, machine.send.bind(machine)];
};
```

### Simple Counter Component

```javascript
// components/Counter.jsx
import React from 'react';
import { createMachine, assign } from '@datnguyen1215/hsmjs';
import { useMachine } from '../hooks/useMachine';

const counterMachine = createMachine({
  id: 'counter',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: [assign({ count: ({ context }) => context.count + 1 })]
        },
        DECREMENT: {
          actions: [assign({ count: ({ context }) => context.count - 1 })]
        },
        RESET: {
          actions: [assign({ count: 0 })]
        }
      }
    }
  }
});

export const Counter = () => {
  const [state, context, send] = useMachine(counterMachine);

  return (
    <div>
      <h2>Count: {context.count}</h2>
      <button onClick={() => send('INCREMENT')}>+</button>
      <button onClick={() => send('DECREMENT')}>-</button>
      <button onClick={() => send('RESET')}>Reset</button>
      <p>State: {state}</p>
    </div>
  );
};
```

### Advanced Form Component

```javascript
// components/ContactForm.jsx
import React from 'react';
import { createMachine, assign } from '@datnguyen1215/hsmjs';
import { useMachine } from '../hooks/useMachine';

const formMachine = createMachine({
  id: 'contactForm',
  initial: 'editing',
  context: {
    values: { name: '', email: '', message: '' },
    errors: {},
    submitted: false
  },
  states: {
    editing: {
      on: {
        CHANGE: {
          actions: [assign({
            values: ({ context, event }) => ({
              ...context.values,
              [event.field]: event.value
            }),
            errors: ({ context, event }) => {
              const { [event.field]: removed, ...remaining } = context.errors;
              return remaining; // Clear field error on change
            }
          })]
        },
        SUBMIT: 'validating'
      }
    },
    validating: {
      entry: [({ context }) => {
        const errors = {};

        if (!context.values.name.trim()) {
          errors.name = 'Name is required';
        }

        if (!context.values.email.trim()) {
          errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(context.values.email)) {
          errors.email = 'Email is invalid';
        }

        if (!context.values.message.trim()) {
          errors.message = 'Message is required';
        }

        if (Object.keys(errors).length > 0) {
          machine.send('INVALID', { errors });
        } else {
          machine.send('VALID');
        }
      }],
      on: {
        VALID: 'submitting',
        INVALID: {
          target: 'editing',
          actions: [assign({ errors: ({ context, event }) => event.errors })]
        }
      }
    },
    submitting: {
      entry: [async ({ context }) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API
          machine.send('SUCCESS');
        } catch (error) {
          machine.send('ERROR', { error: error.message });
        }
      }],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({ submitted: true })]
        },
        ERROR: {
          target: 'editing',
          actions: [assign({
            errors: { _form: 'Submission failed. Please try again.' }
          })]
        }
      }
    },
    success: {
      on: {
        RESET: {
          target: 'editing',
          actions: [assign({
            values: { name: '', email: '', message: '' },
            errors: {},
            submitted: false
          })]
        }
      }
    }
  }
});

export const ContactForm = () => {
  const [state, context, send] = useMachine(formMachine);

  const handleChange = (field) => (e) => {
    send('CHANGE', { field, value: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send('SUBMIT');
  };

  if (state === 'success') {
    return (
      <div>
        <h2>Thank you!</h2>
        <p>Your message has been sent.</p>
        <button onClick={() => send('RESET')}>Send Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          type="text"
          value={context.values.name}
          onChange={handleChange('name')}
          disabled={state === 'validating' || state === 'submitting'}
        />
        {context.errors.name && <span>{context.errors.name}</span>}
      </div>

      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={context.values.email}
          onChange={handleChange('email')}
          disabled={state === 'validating' || state === 'submitting'}
        />
        {context.errors.email && <span>{context.errors.email}</span>}
      </div>

      <div>
        <label htmlFor="message">Message:</label>
        <textarea
          id="message"
          value={context.values.message}
          onChange={handleChange('message')}
          disabled={state === 'validating' || state === 'submitting'}
        />
        {context.errors.message && <span>{context.errors.message}</span>}
      </div>

      {context.errors._form && <div>{context.errors._form}</div>}

      <button
        type="submit"
        disabled={state === 'validating' || state === 'submitting'}
      >
        {state === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>

      <p>State: {state}</p>
    </form>
  );
};
```

### React Context Provider Pattern

```javascript
// contexts/MachineContext.jsx
import React, { createContext, useContext } from 'react';
import { createMachine, assign } from '@datnguyen1215/hsmjs';
import { useMachine } from '../hooks/useMachine';

const appMachine = createMachine({
  id: 'app',
  initial: 'loading',
  context: {
    user: null,
    theme: 'light',
    notifications: []
  },
  states: {
    loading: {
      entry: [async () => {
        // Simulate loading user data
        await new Promise(resolve => setTimeout(resolve, 1000));
        machine.send('LOADED');
      }],
      on: { LOADED: 'ready' }
    },
    ready: {
      on: {
        LOGIN: {
          actions: [assign({ user: ({ context, event }) => event.user })]
        },
        LOGOUT: {
          actions: [assign({ user: null })]
        },
        TOGGLE_THEME: {
          actions: [assign({
            theme: ({ context }) => context.theme === 'light' ? 'dark' : 'light'
          })]
        },
        ADD_NOTIFICATION: {
          actions: [assign({
            notifications: ({ context, event }) => [...context.notifications, event.notification]
          })]
        },
        REMOVE_NOTIFICATION: {
          actions: [assign({
            notifications: ({ context, event }) =>
              context.notifications.filter(n => n.id !== event.id)
          })]
        }
      }
    }
  }
});

const MachineContext = createContext();

export const MachineProvider = ({ children }) => {
  const [state, context, send] = useMachine(appMachine);

  return (
    <MachineContext.Provider value={{ state, context, send }}>
      {children}
    </MachineContext.Provider>
  );
};

export const useMachineContext = () => {
  const context = useContext(MachineContext);
  if (!context) {
    throw new Error('useMachineContext must be used within a MachineProvider');
  }
  return context;
};
```

## Svelte Integration

### Basic Store Implementation

```javascript
// stores/machine.js
import { writable } from 'svelte/store';

export const createMachineStore = (machine) => {
  const { subscribe, set } = writable({
    state: machine.state,
    context: machine.context
  });

  machine.subscribe((state, context) => {
    set({ state, context });
  });

  return {
    subscribe,
    send: machine.send.bind(machine)
  };
};
```

### Simple Counter Component

```svelte
<!-- components/Counter.svelte -->
<script>
  import { createMachine, assign } from '@datnguyen1215/hsmjs';
  import { createMachineStore } from '../stores/machine.js';

  const counterMachine = createMachine({
    id: 'counter',
    initial: 'idle',
    context: { count: 0 },
    states: {
      idle: {
        on: {
          INCREMENT: {
            actions: [assign({ count: ({ context }) => context.count + 1 })]
          },
          DECREMENT: {
            actions: [assign({ count: ({ context }) => context.count - 1 })]
          },
          RESET: {
            actions: [assign({ count: 0 })]
          }
        }
      }
    }
  });

  const machine = createMachineStore(counterMachine);

  $: ({ state, context } = $machine);
</script>

<div>
  <h2>Count: {context.count}</h2>
  <button on:click={() => machine.send('INCREMENT')}>+</button>
  <button on:click={() => machine.send('DECREMENT')}>-</button>
  <button on:click={() => machine.send('RESET')}>Reset</button>
  <p>State: {state}</p>
</div>
```

### Todo List Component

```svelte
<!-- components/TodoList.svelte -->
<script>
  import { createMachine, assign } from '@datnguyen1215/hsmjs';
  import { createMachineStore } from '../stores/machine.js';

  const todoMachine = createMachine({
    id: 'todos',
    initial: 'idle',
    context: {
      todos: [],
      filter: 'all', // all, active, completed
      newTodo: ''
    },
    states: {
      idle: {
        on: {
          ADD_TODO: {
            cond: ({ context }) => context.newTodo.trim().length > 0,
            actions: [assign({
              todos: ({ context }) => [
                ...context.todos,
                {
                  id: Date.now(),
                  text: context.newTodo.trim(),
                  completed: false
                }
              ],
              newTodo: ''
            })]
          },
          UPDATE_NEW_TODO: {
            actions: [assign({ newTodo: ({ context, event }) => event.value })]
          },
          TOGGLE_TODO: {
            actions: [assign({
              todos: ({ context, event }) => context.todos.map(todo =>
                todo.id === event.id
                  ? { ...todo, completed: !todo.completed }
                  : todo
              )
            })]
          },
          DELETE_TODO: {
            actions: [assign({
              todos: ({ context, event }) => context.todos.filter(todo => todo.id !== event.id)
            })]
          },
          SET_FILTER: {
            actions: [assign({ filter: ({ context, event }) => event.filter })]
          },
          CLEAR_COMPLETED: {
            actions: [assign({
              todos: ({ context }) => context.todos.filter(todo => !todo.completed)
            })]
          }
        }
      }
    }
  });

  const machine = createMachineStore(todoMachine);

  $: ({ state, context } = $machine);

  $: filteredTodos = context.todos.filter(todo => {
    if (context.filter === 'active') return !todo.completed;
    if (context.filter === 'completed') return todo.completed;
    return true;
  });

  $: activeCount = context.todos.filter(todo => !todo.completed).length;
  $: completedCount = context.todos.filter(todo => todo.completed).length;

  function handleSubmit(e) {
    e.preventDefault();
    machine.send('ADD_TODO');
  }
</script>

<div class="todo-app">
  <h1>Todo List</h1>

  <form on:submit={handleSubmit}>
    <input
      type="text"
      bind:value={context.newTodo}
      on:input={(e) => machine.send('UPDATE_NEW_TODO', { value: e.target.value })}
      placeholder="What needs to be done?"
    />
    <button type="submit">Add</button>
  </form>

  <div class="filters">
    <button
      class:active={context.filter === 'all'}
      on:click={() => machine.send('SET_FILTER', { filter: 'all' })}
    >
      All ({context.todos.length})
    </button>
    <button
      class:active={context.filter === 'active'}
      on:click={() => machine.send('SET_FILTER', { filter: 'active' })}
    >
      Active ({activeCount})
    </button>
    <button
      class:active={context.filter === 'completed'}
      on:click={() => machine.send('SET_FILTER', { filter: 'completed' })}
    >
      Completed ({completedCount})
    </button>
  </div>

  <ul>
    {#each filteredTodos as todo (todo.id)}
      <li class:completed={todo.completed}>
        <input
          type="checkbox"
          checked={todo.completed}
          on:change={() => machine.send('TOGGLE_TODO', { id: todo.id })}
        />
        <span>{todo.text}</span>
        <button on:click={() => machine.send('DELETE_TODO', { id: todo.id })}>
          Delete
        </button>
      </li>
    {/each}
  </ul>

  {#if completedCount > 0}
    <button on:click={() => machine.send('CLEAR_COMPLETED')}>
      Clear Completed
    </button>
  {/if}

  <p>State: {state}</p>
</div>

<style>
  .todo-app {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
  }

  .filters button {
    margin: 0 5px;
    padding: 5px 10px;
  }

  .filters button.active {
    background-color: #007cba;
    color: white;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
  }

  li.completed span {
    text-decoration: line-through;
    opacity: 0.6;
  }

  ul {
    list-style: none;
    padding: 0;
  }
</style>
```

### Svelte Context Pattern

```javascript
// stores/appStore.js
import { createMachine, assign } from '@datnguyen1215/hsmjs';
import { createMachineStore } from './machine.js';

const appMachine = createMachine({
  id: 'app',
  initial: 'initializing',
  context: {
    user: null,
    theme: 'light',
    sidebarOpen: false
  },
  states: {
    initializing: {
      entry: [async () => {
        // Load user session
        const user = localStorage.getItem('user');
        if (user) {
          machine.send('USER_LOADED', { user: JSON.parse(user) });
        } else {
          machine.send('NO_USER');
        }
      }],
      on: {
        USER_LOADED: {
          target: 'authenticated',
          actions: [assign({ user: ({ context, event }) => event.user })]
        },
        NO_USER: 'unauthenticated'
      }
    },
    authenticated: {
      on: {
        LOGOUT: {
          target: 'unauthenticated',
          actions: [
            assign({ user: null }),
            () => localStorage.removeItem('user')
          ]
        }
      }
    },
    unauthenticated: {
      on: {
        LOGIN: {
          target: 'authenticated',
          actions: [
            assign({ user: ({ context, event }) => event.user }),
            ({ context, event }) => localStorage.setItem('user', JSON.stringify(event.user))
          ]
        }
      }
    }
  }
});

// Add global actions that work in any state
appMachine.states.authenticated.on.TOGGLE_THEME = {
  actions: [assign({ theme: ({ context }) => context.theme === 'light' ? 'dark' : 'light' })]
};
appMachine.states.authenticated.on.TOGGLE_SIDEBAR = {
  actions: [assign({ sidebarOpen: ({ context }) => !context.sidebarOpen })]
};

export const appStore = createMachineStore(appMachine);
```

```svelte
<!-- App.svelte -->
<script>
  import { setContext } from 'svelte';
  import { appStore } from './stores/appStore.js';

  setContext('app', appStore);

  $: ({ state, context } = $appStore);
</script>

<main class="app" class:dark={context.theme === 'dark'}>
  {#if state === 'initializing'}
    <div>Loading...</div>
  {:else if state === 'authenticated'}
    <header>
      <h1>My App</h1>
      <div class="controls">
        <button on:click={() => appStore.send('TOGGLE_THEME')}>
          {context.theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button on:click={() => appStore.send('TOGGLE_SIDEBAR')}>
          Menu
        </button>
        <button on:click={() => appStore.send('LOGOUT')}>
          Logout
        </button>
      </div>
    </header>

    <div class="main-content">
      {#if context.sidebarOpen}
        <aside>Sidebar Content</aside>
      {/if}
      <main>
        <h2>Welcome, {context.user.name}!</h2>
        <!-- Your app content -->
      </main>
    </div>
  {:else}
    <div class="login">
      <h2>Please Log In</h2>
      <button on:click={() => appStore.send('LOGIN', { user: { name: 'John Doe' } })}>
        Login
      </button>
    </div>
  {/if}
</main>
```

## Vue Integration

### Basic Composable

```javascript
// composables/useMachine.js
import { ref, onUnmounted, readonly } from 'vue';

export function useMachine(machine) {
  const state = ref(machine.state);
  const context = ref(machine.context);

  const unsubscribe = machine.subscribe((newState, newContext) => {
    state.value = newState;
    context.value = newContext;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return {
    state: readonly(state),
    context: readonly(context),
    send: machine.send.bind(machine)
  };
}
```

### Vue 3 Component Example

```vue
<!-- components/Timer.vue -->
<template>
  <div class="timer">
    <h2>Timer: {{ formatTime(context.seconds) }}</h2>

    <div class="controls">
      <button
        v-if="state === 'idle'"
        @click="send('START')"
      >
        Start
      </button>

      <button
        v-if="state === 'running'"
        @click="send('PAUSE')"
      >
        Pause
      </button>

      <button
        v-if="state === 'paused'"
        @click="send('RESUME')"
      >
        Resume
      </button>

      <button
        v-if="state !== 'idle'"
        @click="send('RESET')"
      >
        Reset
      </button>
    </div>

    <div class="settings">
      <label>
        Duration (seconds):
        <input
          type="number"
          :value="context.duration"
          @input="send('SET_DURATION', { duration: Number($event.target.value) })"
          :disabled="state !== 'idle'"
        >
      </label>
    </div>

    <p>State: {{ state }}</p>
  </div>
</template>

<script setup>
import { createMachine, assign } from '@datnguyen1215/hsmjs';
import { useMachine } from '../composables/useMachine.js';

const timerMachine = createMachine({
  id: 'timer',
  initial: 'idle',
  context: {
    duration: 60,
    seconds: 60,
    interval: null
  },
  states: {
    idle: {
      entry: [assign({ seconds: ({ context }) => context.duration })],
      on: {
        START: 'running',
        SET_DURATION: {
          actions: [assign({
            duration: ({ context, event }) => event.duration,
            seconds: ({ context, event }) => event.duration
          })]
        }
      }
    },
    running: {
      entry: [
        assign({
          interval: () => setInterval(() => {
            machine.send('TICK');
          }, 1000)
        })
      ],
      exit: [({ context }) => {
        if (context.interval) {
          clearInterval(context.interval);
        }
      }],
      on: {
        TICK: [
          {
            target: 'finished',
            cond: ({ context }) => context.seconds <= 1
          },
          {
            actions: [assign({ seconds: ({ context }) => context.seconds - 1 })]
          }
        ],
        PAUSE: 'paused',
        RESET: 'idle'
      }
    },
    paused: {
      on: {
        RESUME: 'running',
        RESET: 'idle'
      }
    },
    finished: {
      entry: [() => alert('Timer finished!')],
      on: {
        RESET: 'idle'
      }
    }
  }
});

const { state, context, send } = useMachine(timerMachine);

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.timer {
  max-width: 300px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.controls {
  margin: 20px 0;
}

.controls button {
  margin: 0 5px;
  padding: 10px 20px;
}

.settings {
  margin: 20px 0;
}

.settings input {
  margin-left: 10px;
  padding: 5px;
}
</style>
```

## General Integration Tips

### Error Handling

```javascript
// Wrap machine operations for better error handling
const safeSend = (machine, event, payload) => {
  try {
    return machine.send(event, payload);
  } catch (error) {
    console.error('Machine error:', error);
    // Handle error appropriately for your framework
  }
};

// Or create an error boundary machine
const errorBoundaryMachine = createMachine({
  id: 'errorBoundary',
  initial: 'idle',
  context: { error: null },
  states: {
    idle: {
      on: {
        ERROR: {
          target: 'error',
          actions: [assign({ error: ({ context, event }) => event.error })]
        }
      }
    },
    error: {
      on: {
        RETRY: {
          target: 'idle',
          actions: [assign({ error: null })]
        }
      }
    }
  }
});
```

### Testing Framework Integration

```javascript
// test/integration.test.js
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Counter } from '../components/Counter';

test('counter increments and decrements', async () => {
  const { getByText, getByRole } = render(<Counter />);

  expect(getByText('Count: 0')).toBeInTheDocument();

  fireEvent.click(getByRole('button', { name: '+' }));
  await waitFor(() => {
    expect(getByText('Count: 1')).toBeInTheDocument();
  });

  fireEvent.click(getByRole('button', { name: '-' }));
  await waitFor(() => {
    expect(getByText('Count: 0')).toBeInTheDocument();
  });
});
```

### Performance Optimization

```javascript
// Memoize machine instances to prevent recreation
const machine = useMemo(() => createMachine(config), []);

// For React: Use React.memo for components that don't need frequent updates
const MemoizedComponent = React.memo(({ machine }) => {
  const [state, context] = useMachine(machine);
  return <div>{state}</div>;
});

// For Svelte: Use reactive statements efficiently
$: computedValue = expensiveCalculation(context.data); // Only runs when context.data changes
```

This covers the essential patterns for integrating HSMJS with popular frameworks. Each framework has its own idiomatic way of handling reactivity, but the core concepts remain the same: subscribe to machine changes and update your UI accordingly.