import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const undoableMachine = createMachine({
    id: 'undoable',
    initial: 'editing',
    context: { value: '', canUndo: false },
    states: {
      editing: {
        on: {
          UPDATE: {
            actions: [
              assign((ctx, event) => ({
                value: event.value,
                canUndo: true
              }))
            ]
          },
          UNDO: {
            cond: ctx => ctx.canUndo && undoableMachine.history.length > 1,
            actions: [
              async () => {
                // Restore to previous state in history
                const previousSnapshot = undoableMachine.history[undoableMachine.history.length - 2];
                const result = await undoableMachine.restore(previousSnapshot);
                console.log('Restored to previous state:', result.state);
                console.log('Previous value:', result.context.value);
                // UI will update automatically via subscription
              }
            ]
          }
        }
      }
    }
  });

  // Usage demonstration
  console.log('Basic Undo Button Example:');
  console.log('Initial state:', undoableMachine.state);
  console.log('Initial value:', undoableMachine.context.value);
  console.log('Can undo:', undoableMachine.context.canUndo);

  await undoableMachine.send('UPDATE', { value: 'Hello' });
  console.log('\nAfter first update:');
  console.log('Value:', undoableMachine.context.value);
  console.log('Can undo:', undoableMachine.context.canUndo);
  console.log('History size:', undoableMachine.historySize);

  await undoableMachine.send('UPDATE', { value: 'Hello World' });
  console.log('\nAfter second update:');
  console.log('Value:', undoableMachine.context.value);
  console.log('Can undo:', undoableMachine.context.canUndo);
  console.log('History size:', undoableMachine.historySize);

  // Test undo
  await undoableMachine.send('UNDO');
  console.log('\nAfter undo:');
  console.log('Value:', undoableMachine.context.value); // Should be 'Hello'
  console.log('Can undo:', undoableMachine.context.canUndo);
  console.log('History size:', undoableMachine.historySize);

  // Test another undo
  await undoableMachine.send('UNDO');
  console.log('\nAfter second undo:');
  console.log('Value:', undoableMachine.context.value); // Should be ''
  console.log('Can undo:', undoableMachine.context.canUndo);
  console.log('History size:', undoableMachine.historySize);
};

runExample().catch(console.error);