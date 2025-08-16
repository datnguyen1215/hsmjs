import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const modalMachine = createMachine({
    id: 'modal',
    initial: 'closed',
    context: {
      data: null,
      returnFocus: null
    },
    states: {
      closed: {
        on: {
          OPEN: {
            target: 'opening',
            actions: [assign({
              data: (ctx, event) => event.data,
              returnFocus: () => 'previousElement' // Mock for Node.js
            })]
          }
        }
      },
      opening: {
        entry: [
          () => {
            // In browser: document.body.style.overflow = 'hidden';
            console.log('Modal opening - disabling body scroll');
            // Focus trap setup would go here
          }
        ],
        on: {
          OPENED: 'open',
          CLOSE: 'closing'
        }
      },
      open: {
        on: {
          CLOSE: 'closing',
          ESCAPE: 'closing',
          BACKDROP_CLICK: 'closing'
        }
      },
      closing: {
        entry: [
          () => {
            // In browser: document.body.style.overflow = '';
            console.log('Modal closing - re-enabling body scroll');
          }
        ],
        on: {
          CLOSED: {
            target: 'closed',
            actions: [
              (ctx) => {
                // Return focus
                if (ctx.returnFocus) {
                  console.log('Returning focus to:', ctx.returnFocus);
                }
              },
              assign({ data: null, returnFocus: null })
            ]
          }
        }
      }
    }
  });

  // Usage demonstration
  console.log('Modal Dialog Example:');
  console.log('Initial state:', modalMachine.state);

  await modalMachine.send('OPEN', { data: { title: 'Welcome', content: 'Hello world!' } });
  console.log('After OPEN:', modalMachine.state);
  console.log('Modal data:', modalMachine.context.data);

  await modalMachine.send('OPENED');
  console.log('After OPENED:', modalMachine.state);

  await modalMachine.send('ESCAPE');
  console.log('After ESCAPE:', modalMachine.state);

  await modalMachine.send('CLOSED');
  console.log('After CLOSED:', modalMachine.state);
  console.log('Modal data:', modalMachine.context.data);
};

runExample().catch(console.error);