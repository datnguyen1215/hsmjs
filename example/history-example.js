import { createMachine, assign } from '../src/index.js';

// Text editor machine with undo functionality
const editorMachine = createMachine({
  id: 'textEditor',
  initial: 'editing',
  context: {
    content: '',
    saved: true
  },
  states: {
    editing: {
      on: {
        TYPE: {
          actions: [
            assign((ctx, event) => ({
              content: ctx.content + event.text,
              saved: false
            }))
          ]
        },
        DELETE_LAST: {
          cond: ctx => ctx.content.length > 0,
          actions: [
            assign(ctx => ({
              content: ctx.content.slice(0, -1),
              saved: false
            }))
          ]
        },
        SAVE: {
          target: 'saved',
          actions: [assign({ saved: true })]
        }
      }
    },
    saved: {
      entry: [() => console.log('Document saved!')],
      on: {
        TYPE: {
          target: 'editing',
          actions: [
            assign((ctx, event) => ({
              content: ctx.content + event.text,
              saved: false
            }))
          ]
        }
      }
    }
  }
}, { historySize: 20 }); // Keep last 20 states for undo

const runExample = async () => {
  console.log('=== Text Editor with History Example ===\n');

  // Initial state
  console.log('Initial state:', editorMachine.state);
  console.log('Content:', JSON.stringify(editorMachine.context.content));
  console.log('History size:', editorMachine.historySize);
  console.log('');

  // Type some text
  console.log('Typing "Hello"...');
  await editorMachine.send('TYPE', { text: 'Hello' });
  console.log('Content:', JSON.stringify(editorMachine.context.content));
  console.log('Saved:', editorMachine.context.saved);
  console.log('History size:', editorMachine.historySize);
  console.log('');

  // Type more
  console.log('Typing " World"...');
  await editorMachine.send('TYPE', { text: ' World' });
  console.log('Content:', JSON.stringify(editorMachine.context.content));
  console.log('History size:', editorMachine.historySize);
  console.log('');

  // Save the document
  console.log('Saving document...');
  await editorMachine.send('SAVE');
  console.log('State:', editorMachine.state);
  console.log('Saved:', editorMachine.context.saved);
  console.log('History size:', editorMachine.historySize);
  console.log('');

  // Type more after saving
  console.log('Typing "!" after save...');
  await editorMachine.send('TYPE', { text: '!' });
  console.log('State:', editorMachine.state);
  console.log('Content:', JSON.stringify(editorMachine.context.content));
  console.log('Saved:', editorMachine.context.saved);
  console.log('History size:', editorMachine.historySize);
  console.log('');

  // Demonstrate undo functionality with history
  console.log('=== Undo with History Navigation ===\n');

  console.log('Current content:', JSON.stringify(editorMachine.context.content));
  console.log('Available history entries:', editorMachine.history.length);

  // Show all history states
  console.log('History overview:');
  editorMachine.history.forEach((snapshot, index) => {
    console.log(`  ${index}: ${snapshot.state} - "${snapshot.context.content}" (saved: ${snapshot.context.saved})`);
  });
  console.log('');

  // Restore to previous state
  console.log('Restoring to previous state...');
  const previousSnapshot = editorMachine.history[editorMachine.history.length - 2];
  const result1 = await editorMachine.restore(previousSnapshot);
  console.log('After 1st restore:');
  console.log('  State:', result1.state);
  console.log('  Content:', JSON.stringify(result1.context.content));
  console.log('  Saved:', result1.context.saved);
  console.log('');

  // Restore to state before that
  console.log('Restoring to state before that...');
  const evenEarlierSnapshot = editorMachine.history[editorMachine.history.length - 3];
  const result2 = await editorMachine.restore(evenEarlierSnapshot);
  console.log('After 2nd restore:');
  console.log('  State:', result2.state);
  console.log('  Content:', JSON.stringify(result2.context.content));
  console.log('  Saved:', result2.context.saved);
  console.log('');

  // Restore to initial state
  console.log('Restoring to initial state...');
  const initialSnapshot = editorMachine.history[0];
  const result3 = await editorMachine.restore(initialSnapshot);
  console.log('After restoring to initial:');
  console.log('  State:', result3.state);
  console.log('  Content:', JSON.stringify(result3.context.content));
  console.log('  Saved:', result3.context.saved);
  console.log('');

  // Demonstrate state persistence
  console.log('=== State Persistence Demo ===\n');

  // Make some changes
  await editorMachine.send('TYPE', { text: 'Persistent text' });
  await editorMachine.send('SAVE');

  // Get snapshot and simulate persistence
  const persistentSnapshot = editorMachine.snapshot;
  const serializedState = JSON.stringify(persistentSnapshot);
  console.log('Serialized state for persistence:');
  console.log(serializedState);
  console.log('');

  // Simulate state change
  await editorMachine.send('TYPE', { text: ' - modified' });
  console.log('After modification:', JSON.stringify(editorMachine.context.content));

  // Restore from serialized state
  const restoredSnapshot = JSON.parse(serializedState);
  await editorMachine.restore(restoredSnapshot);
  console.log('After restoring from persistence:', JSON.stringify(editorMachine.context.content));
  console.log('');

  // Show current state
  console.log('=== Current Machine State ===');
  console.log('State:', editorMachine.state);
  console.log('Content:', JSON.stringify(editorMachine.context.content));
  console.log('History size:', editorMachine.historySize);
  console.log('');

  // Demonstrate fire-and-forget pattern
  console.log('=== Fire-and-Forget Pattern ===');
  console.log('Sending multiple events without awaiting...');

  editorMachine.send('TYPE', { text: 'A' });
  editorMachine.send('TYPE', { text: 'B' });
  editorMachine.send('TYPE', { text: 'C' });

  // Wait a bit for events to process
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('Final content:', JSON.stringify(editorMachine.context.content));
  console.log('Final history size:', editorMachine.historySize);

  // Show current snapshot
  console.log('Current snapshot:', JSON.stringify(editorMachine.snapshot));
};

// Subscribe to state changes
const unsubscribe = editorMachine.subscribe((snapshot) => {
  console.log('[Subscription] State changed to:', snapshot.state);
});

// Run the example
runExample().then(() => {
  console.log('\n=== Example Complete ===');
  unsubscribe();
});