# Svelte Integration

The recommended way to use HSM with Svelte is through a custom store.

## The Store

```javascript
import { writable, derived } from 'svelte/store';

export function createStateMachineStore(machine, initialContext = {}) {
  const instance = machine.start(initialContext);
  const state = writable({
    current: instance.current,
    context: instance.context
  });

  instance.subscribe(({ to }) => {
    state.set({
      current: to,
      context: { ...instance.context }
    });
  });

  return {
    subscribe: state.subscribe,
    send: (event, payload) => instance.send(event, payload),
    current: derived(state, $state => $state.current),
    context: derived(state, $state => $state.context)
  };
}
```

## Usage Example

```svelte
<script>
  import { createMachine } from 'hsm';
  import { createStateMachineStore } from './stateMachineStore';

  // Define machine
  const machine = createMachine('todo');
  
  const editing = machine.state('editing');
  const saving = machine.state('saving');
  
  editing
    .on('SAVE', saving)
    .do((ctx, event) => {
      ctx.text = event.text;
    });
  
  saving
    .on('SUCCESS', editing)
    .doAsync(async (ctx) => {
      await fetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ text: ctx.text })
      });
      ctx.saved = true;
    })
    .on('ERROR', editing);
  
  machine.initial(editing);
  
  // Create store
  const sm = createStateMachineStore(machine, { 
    text: '', 
    saved: false 
  });
  
  let inputValue = '';
  
  async function handleSave() {
    await sm.send('SAVE', { text: inputValue });
  }
</script>

<div>
  <h2>State: {$sm.current}</h2>
  
  {#if $sm.current === 'editing'}
    <input bind:value={inputValue} placeholder="Enter todo..." />
    <button on:click={handleSave}>Save</button>
    {#if $sm.context.saved}
      <span>✓ Saved</span>
    {/if}
  {/if}
  
  {#if $sm.current === 'saving'}
    <p>Saving...</p>
  {/if}
</div>
```

## Key Points

- Creates Svelte stores that auto-update components
- Derived stores for current state and context
- Use `$` prefix to access store values in templates
- Fully reactive - changes propagate automatically