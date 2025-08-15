import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const debugMachine = createMachine({
    id: 'debuggable',
    initial: 'init',
    context: {
      breadcrumbs: [],
      errorCount: 0
    },
    states: {
      init: {
        entry: [assign({ breadcrumbs: ctx => [...ctx.breadcrumbs, 'init'] })],
        on: {
          START: 'loading'
        }
      },
      loading: {
        entry: [
          assign({ breadcrumbs: ctx => [...ctx.breadcrumbs, 'loading'] }),
          async () => {
            try {
              // Simulate async work
              await new Promise(resolve => setTimeout(resolve, 100));
              debugMachine.send('SUCCESS');
            } catch (error) {
              debugMachine.send('ERROR', { error });
            }
          }
        ],
        on: {
          SUCCESS: 'ready',
          ERROR: 'failed'
        }
      },
      ready: {
        entry: [assign({ breadcrumbs: ctx => [...ctx.breadcrumbs, 'ready'] })],
        on: {
          REFRESH: 'loading',
          BREAK: 'failed'
        }
      },
      failed: {
        entry: [
          assign({
            breadcrumbs: ctx => [...ctx.breadcrumbs, 'failed'],
            errorCount: ctx => ctx.errorCount + 1
          })
        ],
        on: {
          DEBUG: {
            actions: [
              async () => {
                console.log('=== Debug Information ===');
                console.log('Current state:', debugMachine.state);
                console.log('History size:', debugMachine.historySize);
                console.log('Breadcrumbs:', debugMachine.context.breadcrumbs);
                console.log('Error count:', debugMachine.context.errorCount);

                // Show previous states
                const states = [];

                // Save current state to restore later
                const currentState = debugMachine.state;
                const currentContext = { ...debugMachine.context };

                console.log('\n=== Previous States ===');
                for (let i = 0; i < Math.min(5, debugMachine.historySize - 1); i++) {
                  await debugMachine.rollback();
                  states.push({
                    state: debugMachine.state,
                    breadcrumbs: [...debugMachine.context.breadcrumbs]
                  });
                  console.log(`State ${i + 1} back:`, debugMachine.state, 'Breadcrumbs:', debugMachine.context.breadcrumbs);
                }

                console.log('\n=== Restoring to Failed State ===');
                // Restore to failed state by replaying the scenario
                await debugMachine.send('START');
                await debugMachine.send('SUCCESS');
                await debugMachine.send('BREAK');
                console.log('Restored to:', debugMachine.state);
              }
            ]
          },
          RETRY: 'loading'
        }
      }
    }
  });

  // Usage demonstration
  console.log('Debug Helper with State History Example:');
  console.log('Initial state:', debugMachine.state);
  console.log('Initial breadcrumbs:', debugMachine.context.breadcrumbs);

  // Create a normal flow first
  console.log('\n--- Normal Flow ---');
  await debugMachine.send('START');
  console.log('After START:', debugMachine.state, 'Breadcrumbs:', debugMachine.context.breadcrumbs);

  // Wait for loading to complete
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('After loading:', debugMachine.state, 'Breadcrumbs:', debugMachine.context.breadcrumbs);

  // Create a failure scenario
  console.log('\n--- Creating Failure Scenario ---');
  await debugMachine.send('BREAK');
  console.log('After BREAK:', debugMachine.state);
  console.log('Error count:', debugMachine.context.errorCount);
  console.log('Final breadcrumbs:', debugMachine.context.breadcrumbs);
  console.log('History size before debug:', debugMachine.historySize);

  // Debug to see history
  console.log('\n--- Debugging ---');
  await debugMachine.send('DEBUG');

  console.log('\n--- After Debug Analysis ---');
  console.log('Current state:', debugMachine.state);
  console.log('Current breadcrumbs:', debugMachine.context.breadcrumbs);
};

runExample().catch(console.error);