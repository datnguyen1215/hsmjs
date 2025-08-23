import { createMachine, assign } from '../src/index.js';

describe('Actions', () => {
  describe('Entry and exit action execution order', () => {
    test('should execute entry actions in order', () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'active' }
          },
          active: {
            entry: [
              () => order.push('first'),
              () => order.push('second'),
              () => order.push('third')
            ]
          }
        }
      });

      machine.send('START');

      expect(order).toEqual(['first', 'second', 'third']);
    });

    test('should execute exit actions in order', () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            exit: [
              () => order.push('exit1'),
              () => order.push('exit2')
            ],
            on: { START: 'active' }
          },
          active: {}
        }
      });

      machine.send('START');

      expect(order).toEqual(['exit1', 'exit2']);
    });

    test('should execute actions in correct order: exit, transition, entry', () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            exit: [() => order.push('exit')],
            on: {
              START: {
                target: 'active',
                actions: [() => order.push('transition')]
              }
            }
          },
          active: {
            entry: [() => order.push('entry')]
          }
        }
      });

      machine.send('START');

      expect(order).toEqual(['exit', 'transition', 'entry']);
    });
  });

  describe('Transition actions', () => {
    test('should execute transition actions', () => {
      const actionFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: {
                target: 'active',
                actions: [actionFn]
              }
            }
          },
          active: {}
        }
      });

      machine.send('EVENT');

      expect(actionFn).toHaveBeenCalledTimes(1);
    });

    test('should execute multiple transition actions in order', () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: {
                target: 'idle',
                actions: [
                  () => order.push('action1'),
                  () => order.push('action2'),
                  () => order.push('action3')
                ]
              }
            }
          }
        }
      });

      machine.send('EVENT');

      expect(order).toEqual(['action1', 'action2', 'action3']);
    });
  });

  describe('String action references', () => {
    test('should resolve string actions from actions map', () => {
      const actionFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: ['myAction'],
            on: {
              EVENT: {
                target: 'active',
                actions: ['myAction']
              }
            }
          },
          active: {
            entry: ['myAction']
          }
        }
      }, {
        actions: {
          myAction: actionFn
        }
      });

      expect(actionFn).toHaveBeenCalledTimes(1);

      machine.send('EVENT');
      expect(actionFn).toHaveBeenCalledTimes(3);
    });

    test('should handle mixed string and function actions', () => {
      const order = [];
      const namedAction = () => order.push('named');

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: {
                target: 'idle',
                actions: [
                  'namedAction',
                  () => order.push('inline'),
                  'namedAction'
                ]
              }
            }
          }
        }
      }, {
        actions: {
          namedAction
        }
      });

      machine.send('EVENT');

      expect(order).toEqual(['named', 'inline', 'named']);
    });
  });

  describe('Async action handling', () => {
    test('should handle async actions', async () => {
      let result = null;

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              FETCH: {
                target: 'idle',
                actions: [async () => {
                  await new Promise(resolve => setTimeout(resolve, 10));
                  result = 'fetched';
                  return 'fetched';
                }]
              }
            }
          }
        }
      });

      const response = await machine.send('FETCH');

      expect(result).toBe('fetched');
      expect(response.results[0].value).toBe('fetched');
    });

    test('should execute multiple async actions sequentially', async () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              RUN: {
                target: 'idle',
                actions: [
                  async () => {
                    await new Promise(r => setTimeout(r, 20));
                    order.push('first');
                  },
                  async () => {
                    await new Promise(r => setTimeout(r, 10));
                    order.push('second');
                  },
                  () => order.push('third')
                ]
              }
            }
          }
        }
      });

      await machine.send('RUN');

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });

  describe('Action return values', () => {
    test('should capture action return values in results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              COMPUTE: {
                target: 'idle',
                actions: [
                  () => 'value1',
                  () => 42,
                  () => ({ data: 'object' })
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('COMPUTE');

      expect(result.results[0].value).toBe('value1');
      expect(result.results[1].value).toBe(42);
      expect(result.results[2].value).toEqual({ data: 'object' });
    });

    test('should capture named action return values', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              RUN: {
                target: 'idle',
                actions: ['action1', 'action2']
              }
            }
          }
        }
      }, {
        actions: {
          action1: () => 'result1',
          action2: () => 'result2'
        }
      });

      const result = await machine.send('RUN');

      expect(result.results[0]).toEqual({ name: 'action1', value: 'result1' });
      expect(result.results[1]).toEqual({ name: 'action2', value: 'result2' });
    });
  });

  describe('assign() function', () => {
    test('should update context with assign object literal', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              SET: {
                target: 'idle',
                actions: [assign({ count: 10 })]
              }
            }
          }
        }
      });

      machine.send('SET');

      expect(machine.context.count).toBe(10);
    });

    test('should update context with assign function', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 5 },
        states: {
          idle: {
            on: {
              DOUBLE: {
                target: 'idle',
                actions: [assign(({ context }) => ({ count: context.count * 2 }))]
              }
            }
          }
        }
      });

      machine.send('DOUBLE');

      expect(machine.context.count).toBe(10);
    });

    test('should return undefined for assign actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 0 },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [
                  assign({ value: 1 }),
                  () => 'other-value'
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('UPDATE');

      expect(result.results[0].value).toBeUndefined();
      expect(result.results[1].value).toBe('other-value');
    });

    test('should handle assign actions in registry with mixed function and object properties', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, status: 'initial', timestamp: null },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: ['updateMixed']
              }
            }
          }
        }
      }, {
        actions: {
          updateMixed: assign({
            count: ({ context, event }) => context.count + (event.increment || 1),
            status: 'updated',
            timestamp: () => Date.now()
          })
        }
      });

      const before = Date.now();
      machine.send('UPDATE', { increment: 5 });

      expect(machine.context.count).toBe(5);
      expect(machine.context.status).toBe('updated');
      expect(machine.context.timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Side effects execution', () => {
    test('should execute side effects without affecting state', () => {
      const sideEffect = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [sideEffect],
            on: {
              EVENT: {
                target: 'idle',
                actions: [sideEffect]
              }
            }
          }
        }
      });

      expect(sideEffect).toHaveBeenCalledTimes(1); // Initial entry

      machine.send('EVENT');
      // Self-transition now behaves as internal transition: only transition action (1 call)
      expect(sideEffect).toHaveBeenCalledTimes(2);
    });

    test('should pass context and event to action functions', () => {
      const actionFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 'test' },
        states: {
          idle: {
            on: {
              EVENT: {
                target: 'idle',
                actions: [actionFn]
              }
            }
          }
        }
      });

      machine.send('EVENT', { data: 'payload' });

      expect(actionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ value: 'test' }),
          event: expect.objectContaining({ type: 'EVENT', data: 'payload' }),
          machine: expect.any(Object)
        })
      );
    });

    test('should handle errors in actions gracefully', async () => {
      const errorAction = () => {
        throw new Error('Action error');
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ERROR: {
                target: 'idle',
                actions: [
                  errorAction,
                  () => 'should-execute'
                ]
              }
            }
          }
        }
      });


      await expect(machine.send('ERROR')).rejects.toThrow('Action error');
    });
  });
});