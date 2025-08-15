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

  // Demonstrate undo functionality
  console.log('=== Undo Functionality ===\n');

  console.log('Current content:', JSON.stringify(editorMachine.context.content));
  console.log('Rolling back to previous state...');

  const result1 = await editorMachine.rollback();
  console.log('After 1st rollback:');
  console.log('  State:', result1.state);
  console.log('  Content:', JSON.stringify(result1.context.content));
  console.log('  Saved:', result1.context.saved);
  console.log('');

  console.log('Rolling back again...');
  const result2 = await editorMachine.rollback();
  console.log('After 2nd rollback:');
  console.log('  State:', result2.state);
  console.log('  Content:', JSON.stringify(result2.context.content));
  console.log('  Saved:', result2.context.saved);
  console.log('');

  console.log('Rolling back once more...');
  const result3 = await editorMachine.rollback();
  console.log('After 3rd rollback:');
  console.log('  State:', result3.state);
  console.log('  Content:', JSON.stringify(result3.context.content));
  console.log('  Saved:', result3.context.saved);
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