import { createMachine, assign } from '../src/index.js';

// Simple counter machine from the docs
const machine = createMachine({
  id: 'myMachine',
  initial: 'idle',
  context: {
    count: 0
  },
  states: {
    idle: {
      on: {
        START: 'active'
      }
    },
    active: {
      entry: [() => console.log('Activated')],
      exit: [() => console.log('Deactivated')],
      on: {
        STOP: 'idle'
      }
    }
  }
});

const runExample = async () => {
  console.log('Initial state:', machine.state);
  console.log('Initial context:', machine.context);

  // Fire and forget
  machine.send('START');

  // Wait a bit for the console logs
  await new Promise(resolve => setTimeout(resolve, 10));

  console.log('\nCurrent state:', machine.state);

  // Wait for completion
  const result = await machine.send('STOP');
  console.log('\nAfter STOP:');
  console.log('State:', result.state);
  console.log('Context:', result.context);
};

runExample().catch(console.error);