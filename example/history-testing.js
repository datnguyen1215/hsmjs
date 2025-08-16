import { createMachine, assign } from '../src/index.js';

// Test helper function using state snapshots
const testScenario = async (machine, scenario) => {
  // Save initial state snapshot
  const initialSnapshot = machine.snapshot;
  const initialHistoryLength = machine.history.length;

  try {
    // Run scenario
    await scenario();

    // Verify end state
    return {
      success: true,
      finalState: machine.state,
      context: machine.context,
      stateChanges: machine.history.length - initialHistoryLength
    };
  } catch (error) {
    // On failure, restore to initial state
    await machine.restore(initialSnapshot);

    return {
      success: false,
      error: error.message,
      restored: true,
      restoredTo: machine.state
    };
  }
};

const runExample = async () => {
  const testMachine = createMachine({
    id: 'testable',
    initial: 'start',
    context: { steps: [], values: {} },
    states: {
      start: {
        on: {
          BEGIN_TEST: 'step1'
        }
      },
      step1: {
        entry: [assign({ steps: ctx => [...ctx.steps, 'step1'] })],
        on: {
          INPUT: {
            target: 'step2',
            actions: [assign({ values: (ctx, event) => ({ ...ctx.values, step1: event.value }) })]
          }
        }
      },
      step2: {
        entry: [assign({ steps: ctx => [...ctx.steps, 'step2'] })],
        on: {
          INPUT: {
            target: 'step3',
            actions: [assign({ values: (ctx, event) => ({ ...ctx.values, step2: event.value }) })]
          }
        }
      },
      step3: {
        entry: [assign({ steps: ctx => [...ctx.steps, 'step3'] })],
        on: {
          COMPLETE: 'done'
        }
      },
      done: {}
    }
  });

  // Usage demonstration
  console.log('History-Based Testing Example:');
  console.log('Initial state:', testMachine.state);
  console.log('Initial context:', testMachine.context);

  // Test scenario 1: Complete flow
  console.log('\n--- Test Scenario 1: Complete Flow ---');
  const result1 = await testScenario(testMachine, async () => {
    await testMachine.send('BEGIN_TEST');
    console.log('After BEGIN_TEST:', testMachine.state, 'Steps:', testMachine.context.steps);

    await testMachine.send('INPUT', { value: 'A' });
    console.log('After INPUT A:', testMachine.state, 'Values:', testMachine.context.values);

    await testMachine.send('INPUT', { value: 'B' });
    console.log('After INPUT B:', testMachine.state, 'Values:', testMachine.context.values);

    await testMachine.send('COMPLETE');
    console.log('After COMPLETE:', testMachine.state);

    if (testMachine.state !== 'done') {
      throw new Error('Expected to be in done state');
    }
  });

  console.log('Scenario 1 result:', result1);
  console.log('Machine state after test 1:', testMachine.state);
  console.log('Machine context after test 1:', testMachine.context);

  // Test scenario 2: Partial flow (should rollback)
  console.log('\n--- Test Scenario 2: Partial Flow (Error) ---');
  const result2 = await testScenario(testMachine, async () => {
    await testMachine.send('BEGIN_TEST');
    console.log('After BEGIN_TEST:', testMachine.state);

    await testMachine.send('INPUT', { value: 'X' });
    console.log('After INPUT X:', testMachine.state);

    // Simulate an error condition
    throw new Error('Simulated test failure');
  });

  console.log('Scenario 2 result:', result2);
  console.log('Machine state after test 2 (should be restored):', testMachine.state);
  console.log('Machine context after test 2:', testMachine.context);

  // Test scenario 3: Different path
  console.log('\n--- Test Scenario 3: Different Path ---');
  const result3 = await testScenario(testMachine, async () => {
    await testMachine.send('BEGIN_TEST');
    await testMachine.send('INPUT', { value: 'X' });
    await testMachine.send('INPUT', { value: 'Y' });
    await testMachine.send('COMPLETE');

    console.log('Final values:', testMachine.context.values);
    console.log('Final steps:', testMachine.context.steps);
  });

  console.log('Scenario 3 result:', result3);
  console.log('Final machine state:', testMachine.state);
  console.log('Final machine context:', testMachine.context);

  console.log('\n--- Summary ---');
  console.log('Test 1 (complete flow):', result1.success ? 'PASSED' : 'FAILED');
  console.log('Test 2 (error handling):', result2.success ? 'FAILED' : 'PASSED (correctly restored)');
  console.log('Test 3 (different path):', result3.success ? 'PASSED' : 'FAILED');
};

runExample().catch(console.error);