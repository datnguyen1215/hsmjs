import { createMachine, assign } from '../src/index.js';

describe('History and Rollback', () => {
  describe('Basic history tracking', () => {
    test('should store initial state in history', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {}
        }
      });

      expect(machine.historySize).toBe(1);
    });

    test('should track state transitions in history', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'active' }
          },
          active: {
            on: { STOP: 'idle' }
          }
        }
      });

      expect(machine.historySize).toBe(1);

      await machine.send('START');
      expect(machine.historySize).toBe(2);

      await machine.send('STOP');
      expect(machine.historySize).toBe(3);
    });

    test('should track context changes in history', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              INCREMENT: {
                actions: [assign((ctx) => ({ count: ctx.count + 1 }))]
              }
            }
          }
        }
      });

      expect(machine.historySize).toBe(1);
      expect(machine.context.count).toBe(0);

      await machine.send('INCREMENT');
      expect(machine.historySize).toBe(2);
      expect(machine.context.count).toBe(1);

      await machine.send('INCREMENT');
      expect(machine.historySize).toBe(3);
      expect(machine.context.count).toBe(2);
    });

    test('should respect history size limit', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { TOGGLE: 'active' }
          },
          active: {
            on: { TOGGLE: 'idle' }
          }
        }
      }, { historySize: 3 });

      // Initial state
      expect(machine.historySize).toBe(1);

      // Make 5 transitions
      for (let i = 0; i < 5; i++) {
        await machine.send('TOGGLE');
      }

      // Should only keep last 3 states
      expect(machine.historySize).toBe(3);
    });
  });

  describe('Rollback functionality', () => {
    test('should rollback to previous state', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'active' }
          },
          active: {
            on: { FINISH: 'done' }
          },
          done: {}
        }
      });

      expect(machine.state).toBe('idle');

      await machine.send('START');
      expect(machine.state).toBe('active');

      await machine.send('FINISH');
      expect(machine.state).toBe('done');

      // Rollback to active
      const result1 = await machine.rollback();
      expect(machine.state).toBe('active');
      expect(result1.state).toBe('active');

      // Rollback to idle
      const result2 = await machine.rollback();
      expect(machine.state).toBe('idle');
      expect(result2.state).toBe('idle');
    });

    test('should rollback context along with state', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, name: 'test' },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'active',
                actions: [assign({ count: 10, name: 'updated' })]
              }
            }
          },
          active: {
            on: {
              INCREMENT: {
                actions: [assign((ctx) => ({ count: ctx.count + 1 }))]
              }
            }
          }
        }
      });

      expect(machine.context).toEqual({ count: 0, name: 'test' });

      await machine.send('UPDATE');
      expect(machine.context).toEqual({ count: 10, name: 'updated' });

      await machine.send('INCREMENT');
      expect(machine.context).toEqual({ count: 11, name: 'updated' });

      // Rollback
      await machine.rollback();
      expect(machine.context).toEqual({ count: 10, name: 'updated' });

      await machine.rollback();
      expect(machine.context).toEqual({ count: 0, name: 'test' });
    });

    test('should handle rollback with no history', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 'initial' },
        states: {
          idle: {}
        }
      });

      // Rollback when only initial state exists
      const result = await machine.rollback();
      expect(machine.state).toBe('idle');
      expect(result.state).toBe('idle');
      expect(result.context.value).toBe('initial');
    });

    test('should clear event queue on rollback', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [async () => {
              await new Promise(resolve => setTimeout(resolve, 50));
            }],
            on: { START: 'active' }
          },
          active: {
            on: { STOP: 'idle' }
          }
        }
      });

      // Send async transition
      machine.send('START');

      // Queue another event while transitioning
      machine.send('STOP');

      // Rollback should clear the queue
      await machine.rollback();

      // Wait a bit to ensure no queued events execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still be in idle state
      expect(machine.state).toBe('idle');
    });

    test('should not execute entry/exit actions on rollback', async () => {
      const entryFn = jest.fn();
      const exitFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            exit: [exitFn],
            on: { START: 'active' }
          },
          active: {
            entry: [entryFn],
            on: { STOP: 'idle' }
          }
        }
      });

      // Clear initial call counts
      entryFn.mockClear();
      exitFn.mockClear();

      // Transition to active
      await machine.send('START');
      expect(entryFn).toHaveBeenCalledTimes(1);
      expect(exitFn).toHaveBeenCalledTimes(1);

      // Clear counts
      entryFn.mockClear();
      exitFn.mockClear();

      // Rollback
      await machine.rollback();
      expect(machine.state).toBe('idle');

      // No entry/exit actions should have been called
      expect(entryFn).not.toHaveBeenCalled();
      expect(exitFn).not.toHaveBeenCalled();
    });
  });

  describe('Async transitions and history', () => {
    test('should track async transitions in history', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { data: null },
        states: {
          idle: {
            on: {
              FETCH: {
                target: 'loading',
                actions: [assign(async () => {
                  await new Promise(resolve => setTimeout(resolve, 10));
                  return { data: 'loaded' };
                })]
              }
            }
          },
          loading: {}
        }
      });

      expect(machine.historySize).toBe(1);

      await machine.send('FETCH');

      // Wait for async action to complete
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(machine.historySize).toBe(2);
      expect(machine.state).toBe('loading');
    });
  });

  describe('Complex rollback scenarios', () => {
    test('should handle multiple rollbacks in sequence', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'a',
        context: { path: ['a'] },
        states: {
          a: {
            on: {
              NEXT: {
                target: 'b',
                actions: [assign((ctx) => ({ path: [...ctx.path, 'b'] }))]
              }
            }
          },
          b: {
            on: {
              NEXT: {
                target: 'c',
                actions: [assign((ctx) => ({ path: [...ctx.path, 'c'] }))]
              }
            }
          },
          c: {
            on: {
              NEXT: {
                target: 'd',
                actions: [assign((ctx) => ({ path: [...ctx.path, 'd'] }))]
              }
            }
          },
          d: {}
        }
      });

      // Navigate through states
      await machine.send('NEXT'); // a -> b
      await machine.send('NEXT'); // b -> c
      await machine.send('NEXT'); // c -> d

      expect(machine.state).toBe('d');
      expect(machine.context.path).toEqual(['a', 'b', 'c', 'd']);

      // Rollback multiple times
      await machine.rollback(); // d -> c
      expect(machine.state).toBe('c');
      expect(machine.context.path).toEqual(['a', 'b', 'c']);

      await machine.rollback(); // c -> b
      expect(machine.state).toBe('b');
      expect(machine.context.path).toEqual(['a', 'b']);

      await machine.rollback(); // b -> a
      expect(machine.state).toBe('a');
      expect(machine.context.path).toEqual(['a']);

      // No more history to rollback
      await machine.rollback();
      expect(machine.state).toBe('a');
      expect(machine.context.path).toEqual(['a']);
    });

    test('should handle nested state rollback', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child1',
            states: {
              child1: {
                on: { NEXT: 'child2' }
              },
              child2: {
                on: { EXIT: '#test.outside' }
              }
            }
          },
          outside: {}
        }
      });

      expect(machine.state).toBe('parent.child1');

      await machine.send('NEXT');
      expect(machine.state).toBe('parent.child2');

      await machine.send('EXIT');
      expect(machine.state).toBe('outside');

      // Rollback to nested state
      await machine.rollback();
      expect(machine.state).toBe('parent.child2');

      await machine.rollback();
      expect(machine.state).toBe('parent.child1');
    });
  });
});