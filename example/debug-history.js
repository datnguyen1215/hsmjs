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

                // Save current snapshot to restore later
                const currentSnapshot = debugMachine.snapshot;

                console.log('\n=== History Navigation ===');
                console.log('Complete history overview:');
                debugMachine.history.forEach((snapshot, index) => {
                  const isCurrents = index === debugMachine.history.length - 1;
                  console.log(`  ${index}: ${snapshot.state} - breadcrumbs: [${snapshot.context.breadcrumbs.join(', ')}]${isCurrents ? ' (current)' : ''}`);
                });

                console.log('\n=== Analyzing Previous States ===');
                // Show last few states for analysis
                const recentStates = debugMachine.history.slice(-5);
                recentStates.forEach((snapshot, index) => {
                  const globalIndex = debugMachine.history.length - recentStates.length + index;
                  console.log(`State ${globalIndex}: ${snapshot.state}`);
                  console.log(`  Breadcrumbs: [${snapshot.context.breadcrumbs.join(', ')}]`);
                  console.log(`  Error count: ${snapshot.context.errorCount}`);
                });

                console.log('\n=== State Restoration Demo ===');
                // Navigate to a previous state for inspection
                if (debugMachine.history.length >= 2) {
                  const prevSnapshot = debugMachine.history[debugMachine.history.length - 2];
                  console.log(`Temporarily restoring to previous state: ${prevSnapshot.state}`);
                  await debugMachine.restore(prevSnapshot);
                  console.log('Restored state:', debugMachine.state);
                  console.log('Restored breadcrumbs:', debugMachine.context.breadcrumbs);
                }

                console.log('\n=== Restoring to Failed State ===');
                // Restore back to the failed state for continued debugging
                await debugMachine.restore(currentSnapshot);
                console.log('Restored to original failed state:', debugMachine.state);

                // Demonstrate state persistence for debugging
                console.log('\n=== Debug State Persistence ===');
                const serializedDebugState = JSON.stringify(currentSnapshot);
                console.log('Serialized state for bug report:');
                console.log(serializedDebugState);
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