/**
 * Svelte Integration Example for HSMJS
 *
 * This example demonstrates how to integrate HSMJS with Svelte using
 * the store pattern. It shows practical examples with reactive updates.
 */

import { writable } from 'svelte/store';
import { createMachine, assign } from '../src/index.js';

// Create a Svelte store from an HSMJS machine
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

// Todo Machine - More complex example with CRUD operations
const todoMachine = createMachine({
  id: 'todos',
  initial: 'idle',
  context: {
    todos: [
      { id: 1, text: 'Learn HSMJS', completed: false },
      { id: 2, text: 'Build Svelte app', completed: false },
      { id: 3, text: 'Deploy to production', completed: false }
    ],
    filter: 'all', // all, active, completed
    newTodoText: '',
    editingId: null,
    editingText: ''
  },
  states: {
    idle: {
      on: {
        // Adding todos
        UPDATE_NEW_TODO: {
          actions: [assign({ newTodoText: (ctx, event) => event.text })]
        },
        ADD_TODO: [
          {
            cond: (ctx) => ctx.newTodoText.trim().length > 0,
            actions: [assign({
              todos: (ctx) => [
                ...ctx.todos,
                {
                  id: Date.now(),
                  text: ctx.newTodoText.trim(),
                  completed: false
                }
              ],
              newTodoText: ''
            })]
          }
        ],

        // Toggle completion
        TOGGLE_TODO: {
          actions: [assign({
            todos: (ctx, event) => ctx.todos.map(todo =>
              todo.id === event.id
                ? { ...todo, completed: !todo.completed }
                : todo
            )
          })]
        },

        // Delete todos
        DELETE_TODO: {
          actions: [assign({
            todos: (ctx, event) => ctx.todos.filter(todo => todo.id !== event.id)
          })]
        },

        // Filtering
        SET_FILTER: {
          actions: [assign({ filter: (ctx, event) => event.filter })]
        },

        // Clear completed
        CLEAR_COMPLETED: {
          actions: [assign({
            todos: (ctx) => ctx.todos.filter(todo => !todo.completed)
          })]
        },

        // Editing
        START_EDIT: {
          target: 'editing',
          actions: [assign({
            editingId: (ctx, event) => event.id,
            editingText: (ctx, event) => {
              const todo = ctx.todos.find(t => t.id === event.id);
              return todo ? todo.text : '';
            }
          })]
        }
      }
    },

    editing: {
      on: {
        UPDATE_EDIT: {
          actions: [assign({ editingText: (ctx, event) => event.text })]
        },
        SAVE_EDIT: [
          {
            target: 'idle',
            cond: (ctx) => ctx.editingText.trim().length > 0,
            actions: [assign({
              todos: (ctx) => ctx.todos.map(todo =>
                todo.id === ctx.editingId
                  ? { ...todo, text: ctx.editingText.trim() }
                  : todo
              ),
              editingId: null,
              editingText: ''
            })]
          }
        ],
        CANCEL_EDIT: {
          target: 'idle',
          actions: [assign({ editingId: null, editingText: '' })]
        }
      }
    }
  }
});

// Traffic Light Machine - Simple state sequence example
const trafficLightMachine = createMachine({
  id: 'trafficLight',
  initial: 'red',
  context: {
    duration: {
      red: 3000,
      yellow: 1000,
      green: 2000
    },
    timeLeft: 3,
    timer: null
  },
  states: {
    red: {
      entry: [
        assign({ timeLeft: 3 }),
        (ctx) => {
          if (ctx.timer) clearInterval(ctx.timer);
          ctx.timer = setInterval(() => {
            machine.send('TICK');
          }, 1000);
        }
      ],
      exit: [(ctx) => {
        if (ctx.timer) clearInterval(ctx.timer);
      }],
      on: {
        TICK: [
          {
            target: 'green',
            cond: (ctx) => ctx.timeLeft <= 1,
            actions: [assign({ timeLeft: 2 })]
          },
          {
            actions: [assign({ timeLeft: ctx => ctx.timeLeft - 1 })]
          }
        ],
        MANUAL_OVERRIDE: 'yellow'
      }
    },
    green: {
      entry: [
        assign({ timeLeft: 2 }),
        (ctx) => {
          ctx.timer = setInterval(() => {
            machine.send('TICK');
          }, 1000);
        }
      ],
      exit: [(ctx) => {
        if (ctx.timer) clearInterval(ctx.timer);
      }],
      on: {
        TICK: [
          {
            target: 'yellow',
            cond: (ctx) => ctx.timeLeft <= 1,
            actions: [assign({ timeLeft: 1 })]
          },
          {
            actions: [assign({ timeLeft: ctx => ctx.timeLeft - 1 })]
          }
        ],
        MANUAL_OVERRIDE: 'yellow'
      }
    },
    yellow: {
      entry: [
        assign({ timeLeft: 1 }),
        (ctx) => {
          ctx.timer = setInterval(() => {
            machine.send('TICK');
          }, 1000);
        }
      ],
      exit: [(ctx) => {
        if (ctx.timer) clearInterval(ctx.timer);
      }],
      on: {
        TICK: [
          {
            target: 'red',
            cond: (ctx) => ctx.timeLeft <= 1,
            actions: [assign({ timeLeft: 3 })]
          },
          {
            actions: [assign({ timeLeft: ctx => ctx.timeLeft - 1 })]
          }
        ],
        MANUAL_OVERRIDE: 'red'
      }
    }
  }
});

// Form validation machine - Practical form handling
const formMachine = createMachine({
  id: 'form',
  initial: 'editing',
  context: {
    values: { name: '', email: '', message: '' },
    errors: {},
    touched: {},
    isSubmitting: false
  },
  states: {
    editing: {
      on: {
        CHANGE: {
          actions: [assign({
            values: (ctx, event) => ({
              ...ctx.values,
              [event.field]: event.value
            }),
            touched: (ctx, event) => ({
              ...ctx.touched,
              [event.field]: true
            }),
            // Clear errors for this field
            errors: (ctx, event) => {
              const { [event.field]: removed, ...remaining } = ctx.errors;
              return remaining;
            }
          })]
        },
        BLUR: {
          actions: [(ctx, event) => {
            // Validate field on blur
            const errors = validateField(event.field, ctx.values[event.field]);
            if (errors) {
              machine.send('SET_ERROR', { field: event.field, error: errors });
            }
          }]
        },
        SET_ERROR: {
          actions: [assign({
            errors: (ctx, event) => ({
              ...ctx.errors,
              [event.field]: event.error
            })
          })]
        },
        SUBMIT: [
          {
            target: 'validating',
            cond: (ctx) => Object.keys(validateForm(ctx.values)).length === 0
          },
          {
            actions: [assign({
              errors: (ctx) => validateForm(ctx.values),
              touched: () => ({ name: true, email: true, message: true })
            })]
          }
        ]
      }
    },
    validating: {
      entry: [assign({ isSubmitting: true })],
      on: {
        VALIDATION_COMPLETE: 'submitting'
      }
    },
    submitting: {
      entry: [async (ctx) => {
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Simulate occasional failures
          if (Math.random() > 0.7) {
            throw new Error('Server error occurred');
          }

          machine.send('SUBMIT_SUCCESS');
        } catch (error) {
          machine.send('SUBMIT_ERROR', { error: error.message });
        }
      }],
      on: {
        SUBMIT_SUCCESS: 'success',
        SUBMIT_ERROR: {
          target: 'editing',
          actions: [assign({
            errors: (ctx, event) => ({
              ...ctx.errors,
              _form: event.error
            }),
            isSubmitting: false
          })]
        }
      }
    },
    success: {
      entry: [assign({
        values: () => ({ name: '', email: '', message: '' }),
        errors: () => ({}),
        touched: () => ({}),
        isSubmitting: false
      })],
      on: {
        RESET: 'editing'
      }
    }
  }
});

// Validation helpers
const validateField = (field, value) => {
  switch (field) {
    case 'name':
      return !value.trim() ? 'Name is required' : null;
    case 'email':
      return !value.trim()
        ? 'Email is required'
        : !/\S+@\S+\.\S+/.test(value)
          ? 'Invalid email format'
          : null;
    case 'message':
      return !value.trim()
        ? 'Message is required'
        : value.length < 10
          ? 'Message must be at least 10 characters'
          : null;
    default:
      return null;
  }
};

const validateForm = (values) => {
  const errors = {};

  Object.keys(values).forEach(field => {
    const error = validateField(field, values[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

// Export stores for use in Svelte components
export const todoStore = createMachineStore(todoMachine);
export const trafficLightStore = createMachineStore(trafficLightMachine);
export const formStore = createMachineStore(formMachine);

// Example Svelte component code (as a string template)
export const svelteComponentExamples = {
  todoApp: `
<!-- TodoApp.svelte -->
<script>
  import { todoStore } from './svelte-example.js';

  $: ({ state, context } = $todoStore);

  $: filteredTodos = context.todos.filter(todo => {
    if (context.filter === 'active') return !todo.completed;
    if (context.filter === 'completed') return todo.completed;
    return true;
  });

  $: activeCount = context.todos.filter(todo => !todo.completed).length;
  $: completedCount = context.todos.filter(todo => todo.completed).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    todoStore.send('ADD_TODO');
  };

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      todoStore.send('CANCEL_EDIT');
    } else if (e.key === 'Enter') {
      todoStore.send('SAVE_EDIT');
    }
  };
</script>

<div class="todo-app">
  <h1>HSMJS + Svelte Todo App</h1>

  <!-- Add new todo -->
  <form on:submit={handleSubmit}>
    <input
      type="text"
      bind:value={context.newTodoText}
      on:input={(e) => todoStore.send('UPDATE_NEW_TODO', { text: e.target.value })}
      placeholder="What needs to be done?"
      class="new-todo"
    />
    <button type="submit">Add</button>
  </form>

  <!-- Filter buttons -->
  <div class="filters">
    <button
      class:active={context.filter === 'all'}
      on:click={() => todoStore.send('SET_FILTER', { filter: 'all' })}
    >
      All ({context.todos.length})
    </button>
    <button
      class:active={context.filter === 'active'}
      on:click={() => todoStore.send('SET_FILTER', { filter: 'active' })}
    >
      Active ({activeCount})
    </button>
    <button
      class:active={context.filter === 'completed'}
      on:click={() => todoStore.send('SET_FILTER', { filter: 'completed' })}
    >
      Completed ({completedCount})
    </button>
  </div>

  <!-- Todo list -->
  <ul class="todo-list">
    {#each filteredTodos as todo (todo.id)}
      <li class:completed={todo.completed} class:editing={context.editingId === todo.id}>
        {#if context.editingId === todo.id}
          <!-- Editing mode -->
          <input
            type="text"
            bind:value={context.editingText}
            on:input={(e) => todoStore.send('UPDATE_EDIT', { text: e.target.value })}
            on:keydown={handleKeydown}
            on:blur={() => todoStore.send('SAVE_EDIT')}
            class="edit"
          />
        {:else}
          <!-- Display mode -->
          <div class="view">
            <input
              type="checkbox"
              checked={todo.completed}
              on:change={() => todoStore.send('TOGGLE_TODO', { id: todo.id })}
            />
            <label on:dblclick={() => todoStore.send('START_EDIT', { id: todo.id })}>
              {todo.text}
            </label>
            <button
              class="destroy"
              on:click={() => todoStore.send('DELETE_TODO', { id: todo.id })}
            >
              ×
            </button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <!-- Clear completed -->
  {#if completedCount > 0}
    <button class="clear-completed" on:click={() => todoStore.send('CLEAR_COMPLETED')}>
      Clear completed ({completedCount})
    </button>
  {/if}

  <p class="state-info">Machine State: <strong>{state}</strong></p>
</div>

<style>
  .todo-app { max-width: 550px; margin: 0 auto; padding: 20px; }
  .new-todo { width: 100%; padding: 16px; font-size: 24px; border: 1px solid #ccc; }
  .filters { margin: 20px 0; }
  .filters button { margin: 0 5px; padding: 8px 16px; }
  .filters button.active { background: #0066cc; color: white; }
  .todo-list { list-style: none; padding: 0; }
  .todo-list li { padding: 15px; border-bottom: 1px solid #eee; display: flex; align-items: center; }
  .todo-list li.completed label { text-decoration: line-through; opacity: 0.6; }
  .destroy { margin-left: auto; background: #cc0000; color: white; border: none; padding: 5px 10px; }
  .clear-completed { margin-top: 20px; padding: 10px 20px; }
  .state-info { margin-top: 20px; font-size: 14px; color: #666; }
</style>
  `,

  trafficLight: `
<!-- TrafficLight.svelte -->
<script>
  import { trafficLightStore } from './svelte-example.js';

  $: ({ state, context } = $trafficLightStore);

  const getColor = (state) => {
    switch (state) {
      case 'red': return '#ff0000';
      case 'yellow': return '#ffff00';
      case 'green': return '#00ff00';
      default: return '#ccc';
    }
  };
</script>

<div class="traffic-light">
  <h2>Traffic Light Demo</h2>

  <div class="light-container">
    <div class="light red" class:active={state === 'red'}></div>
    <div class="light yellow" class:active={state === 'yellow'}></div>
    <div class="light green" class:active={state === 'green'}></div>
  </div>

  <div class="info">
    <p>Current: <strong style="color: {getColor(state)}">{state.toUpperCase()}</strong></p>
    <p>Time left: <strong>{context.timeLeft}s</strong></p>
  </div>

  <button on:click={() => trafficLightStore.send('MANUAL_OVERRIDE')}>
    Manual Override
  </button>
</div>

<style>
  .traffic-light { text-align: center; max-width: 200px; margin: 0 auto; }
  .light-container { background: #333; padding: 20px; border-radius: 10px; margin: 20px 0; }
  .light {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin: 10px auto;
    opacity: 0.3;
    transition: opacity 0.3s;
  }
  .light.red { background: #ff0000; }
  .light.yellow { background: #ffff00; }
  .light.green { background: #00ff00; }
  .light.active { opacity: 1; box-shadow: 0 0 20px currentColor; }
  .info p { margin: 5px 0; }
</style>
  `
};

// Usage instructions
export const usageInstructions = `
// To use these machines in your Svelte app:

1. Copy the machine store creation pattern:
   import { createMachineStore } from './svelte-example.js';

2. Create your machine stores:
   export const myStore = createMachineStore(myMachine);

3. Use in Svelte components:
   <script>
     import { myStore } from './stores.js';
     $: ({ state, context } = $myStore);
   </script>

   <!-- Use reactive statements -->
   {#if state === 'loading'}
     <p>Loading...</p>
   {:else}
     <p>State: {state}</p>
   {/if}

   <!-- Send events -->
   <button on:click={() => myStore.send('EVENT_NAME')}>
     Click me
   </button>

4. The store automatically updates when the machine state changes,
   triggering reactive updates in your Svelte components.
`;

export default {
  todoStore,
  trafficLightStore,
  formStore,
  createMachineStore,
  svelteComponentExamples,
  usageInstructions
};