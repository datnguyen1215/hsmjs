import { createMachine, assign } from '../src/index.js';

describe('Results API', () => {
  describe('Action result capture', () => {
    test('should capture return values from actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ACTION: {
                target: 'idle',
                actions: [
                  () => 'string-result',
                  () => 42,
                  () => ({ data: 'object' }),
                  () => [1, 2, 3],
                  () => null,
                  () => undefined
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('ACTION');

      expect(result.results).toHaveLength(6);
      expect(result.results[0].value).toBe('string-result');
      expect(result.results[1].value).toBe(42);
      expect(result.results[2].value).toEqual({ data: 'object' });
      expect(result.results[3].value).toEqual([1, 2, 3]);
      expect(result.results[4].value).toBeNull();
      expect(result.results[5].value).toBeUndefined();
    });

    test('should capture named action results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              NAMED: {
                target: 'idle',
                actions: ['action1', 'action2', 'action3']
              }
            }
          }
        }
      }, {
        actions: {
          action1: () => 'result1',
          action2: () => 'result2',
          action3: () => 'result3'
        }
      });

      const result = await machine.send('NAMED');

      expect(result.results).toHaveLength(3);
      expect(result.results[0]).toEqual({ name: 'action1', value: 'result1' });
      expect(result.results[1]).toEqual({ name: 'action2', value: 'result2' });
      expect(result.results[2]).toEqual({ name: 'action3', value: 'result3' });
    });

    test('should capture results from mixed named and anonymous actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              MIXED: {
                target: 'idle',
                actions: [
                  'namedAction',
                  () => 'anonymous',
                  'anotherNamed'
                ]
              }
            }
          }
        }
      }, {
        actions: {
          namedAction: () => 'named-result',
          anotherNamed: () => 'another-named-result'
        }
      });

      const result = await machine.send('MIXED');

      expect(result.results).toHaveLength(3);
      expect(result.results[0]).toEqual({ name: 'namedAction', value: 'named-result' });
      expect(result.results[1]).toEqual({ value: 'anonymous' });
      expect(result.results[2]).toEqual({ name: 'anotherNamed', value: 'another-named-result' });
    });
  });

  describe('Async action results', () => {
    test('should capture async action results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ASYNC: {
                target: 'idle',
                actions: [
                  async () => {
                    await new Promise(r => setTimeout(r, 30));
                    return 'async-result';
                  },
                  async () => {
                    await new Promise(r => setTimeout(r, 20));
                    return { async: 'object' };
                  }
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('ASYNC');

      expect(result.results).toHaveLength(2);
      expect(result.results[0].value).toBe('async-result');
      expect(result.results[1].value).toEqual({ async: 'object' });
    });

    test('should capture Promise-based action results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              PROMISE: {
                target: 'idle',
                actions: [
                  () => Promise.resolve('promise-result'),
                  () => Promise.resolve({ promise: 'data' })
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('PROMISE');

      expect(result.results).toHaveLength(2);
      expect(result.results[0].value).toBe('promise-result');
      expect(result.results[1].value).toEqual({ promise: 'data' });
    });
  });

  describe('Entry and exit action results', () => {
    test('should capture entry action results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'active' }
          },
          active: {
            entry: [
              () => 'entry1',
              () => 'entry2'
            ]
          }
        }
      });

      const result = await machine.send('START');

      expect(result.results).toEqual([
        { value: 'entry1' },
        { value: 'entry2' }
      ]);
    });

    test('should capture exit action results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'active',
        states: {
          active: {
            exit: [
              () => 'exit1',
              () => 'exit2'
            ],
            on: { STOP: 'inactive' }
          },
          inactive: {}
        }
      });

      const result = await machine.send('STOP');

      expect(result.results).toEqual([
        { value: 'exit1' },
        { value: 'exit2' }
      ]);
    });

    test('should capture results in order: exit, transition, entry', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'state1',
        states: {
          state1: {
            exit: [() => 'exit'],
            on: {
              TRANSITION: {
                target: 'state2',
                actions: [() => 'transition']
              }
            }
          },
          state2: {
            entry: [() => 'entry']
          }
        }
      });

      const result = await machine.send('TRANSITION');

      expect(result.results).toEqual([
        { value: 'exit' },
        { value: 'transition' },
        { value: 'entry' }
      ]);
    });
  });

  describe('Assign action results', () => {
    test('should return undefined for assign actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [
                  assign({ count: 10 }),
                  () => 'regular-action'
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('UPDATE');

      expect(result.results).toHaveLength(2);
      expect(result.results[0].value).toBeUndefined();
      expect(result.results[1].value).toBe('regular-action');
    });

    test('should return undefined for named assign actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 0 },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: ['assignAction', 'regularAction']
              }
            }
          }
        }
      }, {
        actions: {
          assignAction: assign({ value: 42 }),
          regularAction: () => 'regular'
        }
      });

      const result = await machine.send('UPDATE');

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ name: 'assignAction', value: undefined });
      expect(result.results[1]).toEqual({ name: 'regularAction', value: 'regular' });
    });
  });

  describe('Result aggregation', () => {
    test('should aggregate results from all executed actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'state1',
        states: {
          state1: {
            exit: [() => 'exit1', () => 'exit2'],
            on: {
              GO: {
                target: 'state2',
                actions: [() => 'trans1', () => 'trans2']
              }
            }
          },
          state2: {
            entry: [() => 'entry1', () => 'entry2']
          }
        }
      });

      const result = await machine.send('GO');

      expect(result.results).toHaveLength(6);
      expect(result.results.map(r => r.value)).toEqual([
        'exit1', 'exit2', 'trans1', 'trans2', 'entry1', 'entry2'
      ]);
    });

    test('should handle empty results arrays', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { EVENT: 'active' }
          },
          active: {}
        }
      });

      const result = await machine.send('EVENT');

      expect(result.results).toEqual([]);
    });
  });

  describe('Error handling in results', () => {
    test('should not include results from failed actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ERROR: {
                target: 'idle',
                actions: [
                  () => 'success1',
                  () => {
                    throw new Error('Action error');
                  },
                  () => 'should-not-execute'
                ]
              }
            }
          }
        }
      });


      try {
        await machine.send('ERROR');
      } catch (error) {
        // Action error should propagate
        expect(error.message).toBe('Action error');
      }

      // The machine should still be functional for subsequent events
      const result = await machine.send('EVENT', {});
      expect(result.results).toEqual([]);
    });

    test('should handle async action errors in results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ASYNC_ERROR: {
                target: 'idle',
                actions: [
                  async () => {
                    await new Promise(r => setTimeout(r, 30));
                    return 'success';
                  },
                  async () => {
                    await new Promise(r => setTimeout(r, 20));
                    throw new Error('Async error');
                  },
                  () => 'should-not-execute'
                ]
              }
            }
          }
        }
      });


      try {
        await machine.send('ASYNC_ERROR');
      } catch (error) {
        expect(error.message).toBe('Async error');
      }
    });
  });

  describe('Complex result scenarios', () => {
    test('should capture results from nested state transitions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child1',
            states: {
              child1: {
                exit: [() => 'child1-exit'],
                on: { NEXT: 'child2' }
              },
              child2: {
                entry: [() => 'child2-entry']
              }
            }
          }
        }
      });

      const result = await machine.send('NEXT');

      expect(result.results).toEqual([
        { value: 'child1-exit' },
        { value: 'child2-entry' }
      ]);
    });

    test('should handle results with context dependencies', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { multiplier: 2 },
        states: {
          idle: {
            on: {
              CALCULATE: {
                target: 'idle',
                actions: [
                  ({ context, event }) => context.multiplier * event.value,
                  assign(({ context, event }) => ({
                    result: context.multiplier * event.value
                  })),
                  ({ context }) => `Result: ${context.result || 'unknown'}`
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('CALCULATE', { value: 5 });

      expect(result.results[0].value).toBe(10);
      expect(result.results[1].value).toBeUndefined(); // assign action
      expect(result.results[2].value).toBe('Result: 10');
    });

    test('should preserve result order with mixed sync/async actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              MIXED: {
                target: 'idle',
                actions: [
                  () => 'sync1',
                  async () => {
                    await new Promise(r => setTimeout(r, 50));
                    return 'async1';
                  },
                  () => 'sync2',
                  async () => {
                    await new Promise(r => setTimeout(r, 20));
                    return 'async2';
                  },
                  () => 'sync3'
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('MIXED');

      expect(result.results.map(r => r.value)).toEqual([
        'sync1', 'async1', 'sync2', 'async2', 'sync3'
      ]);
    });
  });

  describe('Result immutability', () => {
    test('should provide immutable results', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              GET_OBJECT: {
                target: 'idle',
                actions: [() => ({ mutable: 'data' })]
              }
            }
          }
        }
      });

      const result = await machine.send('GET_OBJECT');

      const actionResult = result.results[0].value;
      actionResult.mutable = 'modified';

      // Subsequent calls should not be affected
      const result2 = await machine.send('GET_OBJECT');
      expect(result2.results[0].value).toEqual({ mutable: 'data' });
    });

    test('should provide independent result objects', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ACTION: {
                target: 'idle',
                actions: [() => 'result']
              }
            }
          }
        }
      });


      const result1 = await machine.send('ACTION');
      const result2 = await machine.send('ACTION');

      expect(result1.results).not.toBe(result2.results);
      expect(result1.results[0]).not.toBe(result2.results[0]);
      expect(result1.results[0].value).toBe(result2.results[0].value);
    });
  });
});