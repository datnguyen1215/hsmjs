# Vue 3 Integration

The recommended way to use HSM with Vue 3 is through a composable.

## The Composable

```javascript
import { ref, readonly, onUnmounted } from 'vue';

export function useStateMachine(machine, initialContext = {}) {
  const instance = machine.start(initialContext);
  const current = ref(instance.current);
  const context = ref(instance.context);

  const unsubscribe = instance.subscribe(({ to }) => {
    current.value = to;
    context.value = { ...instance.context };
  });

  onUnmounted(() => {
    unsubscribe();
  });

  const send = (event, payload) => {
    return instance.send(event, payload);
  };

  return {
    current: readonly(current),
    context: readonly(context),
    send
  };
}
```

## Usage Example

```vue
<template>
  <div>
    <h2>State: {{ current }}</h2>
    <p>{{ context.message }}</p>

    <div v-if="current === 'idle'">
      <button @click="send('FETCH')">Load Data</button>
    </div>

    <div v-else-if="current === 'loading'">
      <p>Loading...</p>
    </div>

    <div v-else-if="current === 'success'">
      <p>Data: {{ context.data }}</p>
      <button @click="send('RESET')">Reset</button>
    </div>

    <div v-else-if="current === 'error'">
      <p>Error: {{ context.error }}</p>
      <button @click="send('RETRY')">Retry</button>
    </div>
  </div>
</template>

<script setup>
import { createMachine } from '@datnguyen1215/hsmjs';
import { useStateMachine } from './useStateMachine';

// Define machine
const machine = createMachine('fetcher');

const idle = machine.state('idle');
const loading = machine.state('loading');
const success = machine.state('success');
const error = machine.state('error');

idle.on('FETCH', loading);

loading
  .enter(() => console.log('Fetching data...'))
  .on('SUCCESS', success)
  .do(async (ctx) => {
    const res = await fetch('/api/data');
    ctx.data = await res.json();
  })
  .on('ERROR', error)
  .do((ctx, event) => {
    ctx.error = event.message;
  });

success.on('RESET', idle);
error.on('RETRY', loading);

machine.initial('idle');

// Use in component
const { current, context, send } = useStateMachine(machine, {
  message: 'Ready to fetch',
  data: null,
  error: null
});
</script>
```

## Key Points

- The composable returns reactive refs that work with Vue's reactivity
- Use `readonly` to prevent accidental mutations
- Automatic cleanup on component unmount
- Works seamlessly with Vue's template syntax