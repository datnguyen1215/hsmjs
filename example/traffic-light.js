import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const trafficLightMachine = createMachine({
    id: 'trafficLight',
    initial: 'red',
    context: {
      timer: null,
      redDuration: 3000,
      yellowDuration: 1000,
      greenDuration: 2000
    },
    states: {
      red: {
        entry: [
          () => console.log('🔴 STOP'),
          (ctx) => {
            ctx.timer = setTimeout(() => trafficLightMachine.send('TIMER'), ctx.redDuration);
          }
        ],
        exit: [(ctx) => clearTimeout(ctx.timer)],
        on: { TIMER: 'green' }
      },
      green: {
        entry: [
          () => console.log('🟢 GO'),
          (ctx) => {
            ctx.timer = setTimeout(() => trafficLightMachine.send('TIMER'), ctx.greenDuration);
          }
        ],
        exit: [(ctx) => clearTimeout(ctx.timer)],
        on: { TIMER: 'yellow' }
      },
      yellow: {
        entry: [
          () => console.log('🟡 CAUTION'),
          (ctx) => {
            ctx.timer = setTimeout(() => trafficLightMachine.send('TIMER'), ctx.yellowDuration);
          }
        ],
        exit: [(ctx) => clearTimeout(ctx.timer)],
        on: { TIMER: 'red' }
      }
    }
  });

  // Start the traffic light
  console.log('Starting traffic light system...');
  const result = await trafficLightMachine.send('TIMER');

  // Let it run for a few cycles, then clean up
  setTimeout(() => {
    console.log('Stopping traffic light system...');
    clearTimeout(trafficLightMachine.context.timer);
  }, 10000);
};

runExample().catch(console.error);