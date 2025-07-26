# React Integration

The recommended way to use HSM with React is through a custom hook.

## The Hook

```javascript
import { useEffect, useState, useCallback } from 'react';

export function useStateMachine(machine, initialContext = {}) {
  const [instance] = useState(() => machine.start(initialContext));
  const [current, setCurrent] = useState(instance.current);
  const [context, setContext] = useState(instance.context);

  useEffect(() => {
    const unsubscribe = instance.subscribe(({ to }) => {
      setCurrent(to);
      setContext({ ...instance.context });
    });
    return unsubscribe;
  }, [instance]);

  const send = useCallback((event, payload) => {
    return instance.send(event, payload);
  }, [instance]);

  return { current, context, send };
}
```

## Usage Example

```javascript
import { createMachine } from 'hsmjs';
import { useStateMachine } from './useStateMachine';

// Define your machine
const machine = createMachine('counter');

const idle = machine.state('idle');
const counting = machine.state('counting');

idle.on('START', counting);

counting
  .on('INCREMENT', counting)
  .do((ctx) => { ctx.count++; })
  .on('DECREMENT', counting)
  .do((ctx) => { ctx.count--; })
  .on('RESET', idle)
  .do((ctx) => { ctx.count = 0; });

machine.initial(idle);

// React component
function Counter() {
  const { current, context, send } = useStateMachine(machine, { count: 0 });

  return (
    <div>
      <h2>State: {current}</h2>
      <h3>Count: {context.count}</h3>
      
      {current === 'idle' && (
        <button onClick={() => send('START')}>Start Counting</button>
      )}
      
      {current === 'counting' && (
        <>
          <button onClick={() => send('INCREMENT')}>+</button>
          <button onClick={() => send('DECREMENT')}>-</button>
          <button onClick={() => send('RESET')}>Reset</button>
        </>
      )}
    </div>
  );
}
```

## Key Points

- The hook creates a single machine instance that persists across renders
- State and context updates trigger React re-renders automatically
- The `send` function is memoized for performance
- Perfect for component-level state management