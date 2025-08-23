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
                actions: [assign(({ context }) => ({ count: context.count + 1 }))]
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

  describe('History Access and State Restoration', () => {
    test('machine.history returns array of snapshots', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              START: {
                target: 'active',
                actions: [assign({ count: 1 })]
              }
            }
          },
          active: {
            on: { FINISH: 'done' }
          },
          done: {}
        }
      });

      // Initial state should be in history
      expect(machine.history).toHaveLength(1);
      expect(machine.history[0]).toEqual({ state: 'idle', context: { count: 0 } });

      await machine.send('START');
      expect(machine.history).toHaveLength(2);
      expect(machine.history[1]).toEqual({ state: 'active', context: { count: 1 } });

      await machine.send('FINISH');
      expect(machine.history).toHaveLength(3);
      expect(machine.history[2]).toEqual({ state: 'done', context: { count: 1 } });
    });

    test('machine.snapshot returns current state/context', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 'test' },
        states: {
          idle: {
            on: {
              UPDATE: {
                actions: [assign({ value: 'updated' })]
              }
            }
          }
        }
      });

      expect(machine.snapshot).toEqual({ state: 'idle', context: { value: 'test' } });

      await machine.send('UPDATE');
      expect(machine.snapshot).toEqual({ state: 'idle', context: { value: 'updated' } });
    });

    test('restore() with valid snapshot works', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
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

      await machine.send('START');
      await machine.send('FINISH');
      expect(machine.state).toBe('done');

      // Restore to idle state
      const snapshot = { state: 'idle', context: { count: 5 } };
      const result = await machine.restore(snapshot);

      expect(machine.state).toBe('idle');
      expect(machine.context).toEqual({ count: 5 });
      expect(result).toEqual({ state: 'idle', context: { count: 5 } });
    });

    test('restore() with invalid snapshot rejects', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {}
        }
      });

      // Test null snapshot
      await expect(machine.restore(null)).rejects.toThrow('Snapshot must be an object');

      // Test snapshot without state property
      await expect(machine.restore({ context: {} })).rejects.toThrow('Snapshot must have state and context properties');

      // Test snapshot without context property
      await expect(machine.restore({ state: 'idle' })).rejects.toThrow('Snapshot must have state and context properties');

      // Test invalid state
      await expect(machine.restore({ state: 'invalid', context: {} })).rejects.toThrow('Invalid state in snapshot: invalid');
    });

    test('restore() from history entry works', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              START: {
                target: 'active',
                actions: [assign({ count: 1 })]
              }
            }
          },
          active: {
            on: {
              FINISH: {
                target: 'done',
                actions: [assign({ count: 2 })]
              }
            }
          },
          done: {}
        }
      });

      await machine.send('START');
      await machine.send('FINISH');

      // Get history entry and restore from it
      const previousSnapshot = machine.history[1]; // active state
      await machine.restore(previousSnapshot);

      expect(machine.state).toBe('active');
      expect(machine.context.count).toBe(1);
    });

    test('restore() clears event queue', async () => {
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

      // Restore should clear the queue
      const snapshot = { state: 'idle', context: {} };
      await machine.restore(snapshot);

      // Wait a bit to ensure no queued events execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still be in idle state
      expect(machine.state).toBe('idle');
    });

    test('restore() does not execute entry/exit actions', async () => {
      const entryFn = jest.fn();
      const exitFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [entryFn],
            exit: [exitFn]
          },
          active: {
            entry: [entryFn],
            exit: [exitFn]
          }
        }
      });

      // Clear initial call counts
      entryFn.mockClear();
      exitFn.mockClear();

      // Restore to active state
      const snapshot = { state: 'active', context: {} };
      await machine.restore(snapshot);

      expect(machine.state).toBe('active');

      // No entry/exit actions should have been called
      expect(entryFn).not.toHaveBeenCalled();
      expect(exitFn).not.toHaveBeenCalled();
    });

    test('Full persistence flow (stringify/parse/restore)', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, name: 'test' },
        states: {
          idle: {
            on: {
              START: {
                target: 'active',
                actions: [assign({ count: 5, name: 'active' })]
              }
            }
          },
          active: {}
        }
      });

      await machine.send('START');
      expect(machine.state).toBe('active');
      expect(machine.context).toEqual({ count: 5, name: 'active' });

      // Simulate persistence: serialize snapshot
      const snapshot = machine.snapshot;
      const serialized = JSON.stringify(snapshot);

      // Simulate power loss and restoration: parse and restore
      const restored = JSON.parse(serialized);
      await machine.restore(restored);

      expect(machine.state).toBe('active');
      expect(machine.context).toEqual({ count: 5, name: 'active' });
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

});