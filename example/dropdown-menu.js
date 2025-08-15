import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const dropdownMachine = createMachine({
    id: 'dropdown',
    initial: 'closed',
    context: {
      selectedIndex: -1,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4']
    },
    states: {
      closed: {
        on: {
          TOGGLE: 'open',
          FOCUS: 'open'
        }
      },
      open: {
        entry: [assign({ selectedIndex: -1 })],
        on: {
          TOGGLE: 'closed',
          BLUR: 'closed',
          ESCAPE: 'closed',
          ARROW_DOWN: {
            actions: [assign({
              selectedIndex: (ctx) =>
                Math.min(ctx.selectedIndex + 1, ctx.options.length - 1)
            })]
          },
          ARROW_UP: {
            actions: [assign({
              selectedIndex: (ctx) => Math.max(ctx.selectedIndex - 1, 0)
            })]
          },
          ENTER: [
            {
              target: 'closed',
              cond: (ctx) => ctx.selectedIndex >= 0,
              actions: [(ctx) => {
                const selected = ctx.options[ctx.selectedIndex];
                // Emit selection event
                console.log('Selected:', selected);
              }]
            }
          ],
          SELECT: {
            target: 'closed',
            actions: [(ctx, event) => {
              console.log('Selected:', event.option);
            }]
          }
        }
      }
    }
  });

  // Usage demonstration
  console.log('Dropdown Menu Example:');
  console.log('Initial state:', dropdownMachine.state);
  console.log('Options:', dropdownMachine.context.options);

  await dropdownMachine.send('TOGGLE');
  console.log('After TOGGLE (open):', dropdownMachine.state);
  console.log('Selected index:', dropdownMachine.context.selectedIndex);

  await dropdownMachine.send('ARROW_DOWN');
  console.log('After ARROW_DOWN:', dropdownMachine.context.selectedIndex);

  await dropdownMachine.send('ARROW_DOWN');
  console.log('After second ARROW_DOWN:', dropdownMachine.context.selectedIndex);

  await dropdownMachine.send('ENTER');
  console.log('After ENTER:', dropdownMachine.state);

  // Test direct selection
  await dropdownMachine.send('TOGGLE');
  await dropdownMachine.send('SELECT', { option: 'Option 2' });
  console.log('After direct SELECT:', dropdownMachine.state);
};

runExample().catch(console.error);