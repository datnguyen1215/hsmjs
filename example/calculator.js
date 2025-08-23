import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const calculatorMachine = createMachine({
    id: 'calculator',
    initial: 'idle',
    context: {
      display: '0',
      operand1: null,
      operand2: null,
      operator: null
    },
    states: {
      idle: {
        entry: [assign(() => ({ display: '0', operand1: null, operand2: null, operator: null }))],
        on: {
          NUMBER: {
            target: 'operand1',
            actions: [assign(({ context, event }) => ({
              display: event.value,
              operand1: parseFloat(event.value)
            }))]
          }
        }
      },
      operand1: {
        on: {
          NUMBER: {
            actions: [assign({
              display: ({ context, event }) => context.display + event.value,
              operand1: ({ context, event }) => parseFloat(context.display + event.value)
            })]
          },
          OPERATOR: {
            target: 'operator',
            actions: [assign({
              operator: ({ context, event }) => event.value,
              display: ({ context, event }) => event.value
            })]
          },
          CLEAR: 'idle'
        }
      },
      operator: {
        on: {
          NUMBER: {
            target: 'operand2',
            actions: [assign({
              display: ({ context, event }) => event.value,
              operand2: ({ context, event }) => parseFloat(event.value)
            })]
          },
          CLEAR: 'idle'
        }
      },
      operand2: {
        on: {
          NUMBER: {
            actions: [assign({
              display: ({ context, event }) => context.display + event.value,
              operand2: (ctx, event) => parseFloat(ctx.display + event.value)
            })]
          },
          EQUALS: {
            target: 'result',
            actions: [assign({
              display: (ctx) => {
                let result;
                switch (ctx.operator) {
                  case '+': result = ctx.operand1 + ctx.operand2; break;
                  case '-': result = ctx.operand1 - ctx.operand2; break;
                  case '*': result = ctx.operand1 * ctx.operand2; break;
                  case '/': result = ctx.operand1 / ctx.operand2; break;
                  default: result = ctx.operand2;
                }
                return result.toString();
              }
            })]
          },
          OPERATOR: {
            target: 'operator',
            actions: [assign({
              operand1: (ctx) => {
                let result;
                switch (ctx.operator) {
                  case '+': result = ctx.operand1 + ctx.operand2; break;
                  case '-': result = ctx.operand1 - ctx.operand2; break;
                  case '*': result = ctx.operand1 * ctx.operand2; break;
                  case '/': result = ctx.operand1 / ctx.operand2; break;
                  default: result = ctx.operand2;
                }
                return result;
              },
              operator: ({ context, event }) => event.value,
              operand2: null,
              display: ({ context, event }) => event.value
            })]
          },
          CLEAR: 'idle'
        }
      },
      result: {
        on: {
          NUMBER: {
            target: 'operand1',
            actions: [assign({
              display: ({ context, event }) => event.value,
              operand1: (ctx, event) => parseFloat(event.value),
              operand2: null,
              operator: null
            })]
          },
          OPERATOR: {
            target: 'operator',
            actions: [assign({
              operand1: (ctx) => parseFloat(ctx.display),
              operator: ({ context, event }) => event.value,
              operand2: null,
              display: ({ context, event }) => event.value
            })]
          },
          CLEAR: 'idle'
        }
      }
    }
  });

  // Usage demonstration
  console.log('Calculator Example - Computing 5 + 3:');
  console.log('Initial state:', calculatorMachine.state);
  console.log('Initial display:', calculatorMachine.context.display);

  await calculatorMachine.send('NUMBER', { value: '5' });
  console.log('After entering 5:', calculatorMachine.context.display);

  await calculatorMachine.send('OPERATOR', { value: '+' });
  console.log('After operator +:', calculatorMachine.context.display);

  await calculatorMachine.send('NUMBER', { value: '3' });
  console.log('After entering 3:', calculatorMachine.context.display);

  await calculatorMachine.send('EQUALS');
  console.log('Final result:', calculatorMachine.context.display); // '8'
};

runExample().catch(console.error);