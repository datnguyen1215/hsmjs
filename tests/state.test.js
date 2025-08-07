import { createMachine } from '../src/index.js';

describe('State Management', () => {
  describe('State transitions', () => {
    test('should transition between states on events', () => {
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

      expect(machine.state).toBe('idle');

      machine.send('START');
      expect(machine.state).toBe('active');

      machine.send('STOP');
      expect(machine.state).toBe('idle');
    });

    test('should ignore invalid transitions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'active' }
          },
          active: {}
        }
      });

      expect(machine.state).toBe('idle');

      machine.send('INVALID');
      expect(machine.state).toBe('idle');

      machine.send('STOP');
      expect(machine.state).toBe('idle');
    });

    test('should handle self-transitions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'active',
        states: {
          active: {
            on: { REFRESH: 'active' }
          }
        }
      });

      expect(machine.state).toBe('active');

      machine.send('REFRESH');
      expect(machine.state).toBe('active');
    });
  });

  describe('Nested state navigation', () => {
    test('should navigate to nested states', () => {
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
                on: { BACK: 'child1' }
              }
            }
          }
        }
      });

      expect(machine.state).toBe('parent.child1');

      machine.send('NEXT');
      expect(machine.state).toBe('parent.child2');

      machine.send('BACK');
      expect(machine.state).toBe('parent.child1');
    });

    test('should transition between parent states', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent1',
        states: {
          parent1: {
            initial: 'child',
            states: {
              child: {}
            },
            on: { SWITCH: 'parent2' }
          },
          parent2: {
            initial: 'child',
            states: {
              child: {}
            },
            on: { SWITCH: 'parent1' }
          }
        }
      });

      expect(machine.state).toBe('parent1.child');

      machine.send('SWITCH');
      expect(machine.state).toBe('parent2.child');

      machine.send('SWITCH');
      expect(machine.state).toBe('parent1.child');
    });
  });

  describe('Entry and exit actions', () => {
    test('should execute entry actions on state entry', () => {
      const entryFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'active' }
          },
          active: {
            entry: [entryFn]
          }
        }
      });

      expect(entryFn).not.toHaveBeenCalled();

      machine.send('START');
      expect(entryFn).toHaveBeenCalledTimes(1);
    });

    test('should execute exit actions on state exit', () => {
      const exitFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            exit: [exitFn],
            on: { START: 'active' }
          },
          active: {}
        }
      });

      expect(exitFn).not.toHaveBeenCalled();

      machine.send('START');
      expect(exitFn).toHaveBeenCalledTimes(1);
    });

    test('should execute entry and exit actions in correct order', () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            exit: [() => order.push('exit-idle')],
            on: { START: 'active' }
          },
          active: {
            entry: [() => order.push('entry-active')],
            exit: [() => order.push('exit-active')],
            on: { STOP: 'idle' }
          }
        }
      });

      machine.send('START');
      expect(order).toEqual(['exit-idle', 'entry-active']);

      order.length = 0;
      machine.send('STOP');
      expect(order).toEqual(['exit-active']);
    });
  });

  describe('State tracking', () => {
    test('should track current state correctly', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TO_ACTIVE: 'active',
              TO_DONE: 'done'
            }
          },
          active: {
            on: { TO_DONE: 'done' }
          },
          done: {}
        }
      });

      expect(machine.state).toBe('idle');

      machine.send('TO_ACTIVE');
      expect(machine.state).toBe('active');

      machine.send('TO_DONE');
      expect(machine.state).toBe('done');
    });

    test('should maintain state after invalid transitions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { VALID: 'active' }
          },
          active: {}
        }
      });

      const initialState = machine.state;

      machine.send('INVALID_EVENT');
      expect(machine.state).toBe(initialState);

      machine.send('ANOTHER_INVALID');
      expect(machine.state).toBe(initialState);
    });
  });

  describe('State history', () => {
    test('should maintain state history through transitions', () => {
      const stateHistory = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [() => stateHistory.push('idle')],
            on: { START: 'running' }
          },
          running: {
            entry: [() => stateHistory.push('running')],
            on: {
              PAUSE: 'paused',
              STOP: 'idle'
            }
          },
          paused: {
            entry: [() => stateHistory.push('paused')],
            on: {
              RESUME: 'running',
              STOP: 'idle'
            }
          }
        }
      });

      machine.send('START');
      machine.send('PAUSE');
      machine.send('RESUME');
      machine.send('STOP');

      expect(stateHistory).toEqual(['idle', 'running', 'paused', 'running', 'idle']);
    });
  });
});