import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const textEditorMachine = createMachine({
    id: 'textEditor',
    initial: 'ready',
    context: {
      content: '',
      cursor: 0,
      undoStack: 0 // Track undo depth
    },
    states: {
      ready: {
        on: {
          TYPE: {
            actions: [
              assign({
                content: (ctx, event) => {
                  const before = ctx.content.slice(0, ctx.cursor);
                  const after = ctx.content.slice(ctx.cursor);
                  return before + event.char + after;
                },
                cursor: ctx => ctx.cursor + 1,
                undoStack: 0 // Reset undo stack on new action
              })
            ]
          },
          DELETE: {
            cond: ctx => ctx.cursor > 0,
            actions: [
              assign({
                content: ctx => {
                  const before = ctx.content.slice(0, ctx.cursor - 1);
                  const after = ctx.content.slice(ctx.cursor);
                  return before + after;
                },
                cursor: ctx => ctx.cursor - 1,
                undoStack: 0
              })
            ]
          },
          UNDO: {
            cond: () => textEditorMachine.history.length > 1,
            actions: [
              async () => {
                // Find the previous state in history (skip current state)
                const currentIndex = textEditorMachine.history.length - 1;
                if (currentIndex > 0) {
                  const previousSnapshot = textEditorMachine.history[currentIndex - 1];
                  await textEditorMachine.restore(previousSnapshot);
                }
              },
              assign({ undoStack: ctx => ctx.undoStack + 1 })
            ]
          },
          REDO: {
            cond: ctx => ctx.undoStack > 0,
            actions: [
              () => console.log('Redo not implemented - would need separate redo stack')
            ]
          }
        }
      }
    }
  }, { historySize: 100 }); // Keep more history for editing

  // Usage demonstration
  console.log('Text Editor with Character-by-Character Undo Example:');
  console.log('Initial state:', textEditorMachine.state);
  console.log('Content:', `"${textEditorMachine.context.content}"`);
  console.log('Cursor position:', textEditorMachine.context.cursor);

  // Simulate typing
  console.log('\nTyping "Hi!"...');
  await textEditorMachine.send('TYPE', { char: 'H' });
  console.log('After H:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);

  await textEditorMachine.send('TYPE', { char: 'i' });
  console.log('After i:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);

  await textEditorMachine.send('TYPE', { char: '!' });
  console.log('After !:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);
  console.log('History size:', textEditorMachine.historySize);

  // Undo one character
  console.log('\nUndoing one character...');
  await textEditorMachine.send('UNDO');
  console.log('After undo:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);
  console.log('Undo stack depth:', textEditorMachine.context.undoStack);

  // Undo another character
  console.log('\nUndoing another character...');
  await textEditorMachine.send('UNDO');
  console.log('After second undo:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);
  console.log('Undo stack depth:', textEditorMachine.context.undoStack);

  // Type again (resets undo stack)
  console.log('\nTyping new character...');
  await textEditorMachine.send('TYPE', { char: 'e' });
  console.log('After new char:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);
  console.log('Undo stack depth (should be 0):', textEditorMachine.context.undoStack);

  // Test delete
  console.log('\nTesting delete...');
  await textEditorMachine.send('DELETE');
  console.log('After delete:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);

  await textEditorMachine.send('UNDO');
  console.log('After undo delete:', `"${textEditorMachine.context.content}"`, 'cursor:', textEditorMachine.context.cursor);
};

runExample().catch(console.error);