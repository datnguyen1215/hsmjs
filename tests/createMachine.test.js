import { createMachine } from '../src/index.js';

describe('createMachine', () => {
  describe('Valid configurations', () => {
    test('should create machine with minimal config', () => {
      const machine = createMachine({
        id: 'minimal',
        initial: 'idle',
        states: {
          idle: {}
        }
      });

      expect(machine).toBeDefined();
      expect(machine.state).toBe('idle');
      expect(machine.context).toEqual({});
    });

    test('should create machine with full config options', () => {
      const machine = createMachine({
        id: 'full',
        initial: 'idle',
        context: {
          count: 0,
          user: null
        },
        states: {
          idle: {
            entry: [() => {}],
            exit: [() => {}],
            on: {
              START: 'active'
            }
          },
          active: {}
        }
      });

      expect(machine).toBeDefined();
      expect(machine.state).toBe('idle');
      expect(machine.context).toEqual({ count: 0, user: null });
    });

    test('should handle nested states configuration', () => {
      const machine = createMachine({
        id: 'nested',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child1',
            states: {
              child1: {
                on: { NEXT: 'child2' }
              },
              child2: {}
            }
          }
        }
      });

      expect(machine).toBeDefined();
      expect(machine.state).toBe('parent.child1');
    });

    test('should resolve ID references with # syntax', () => {
      const machine = createMachine({
        id: 'root',
        initial: 'a',
        states: {
          a: {
            initial: 'a1',
            states: {
              a1: {
                on: {
                  JUMP: '#root.b.b2'
                }
              }
            }
          },
          b: {
            initial: 'b1',
            states: {
              b1: {},
              b2: {}
            }
          }
        }
      });

      expect(machine).toBeDefined();
      machine.send('JUMP');
      expect(machine.state).toBe('b.b2');
    });
  });

  describe('Invalid configurations', () => {
    test('should throw error for missing id field', () => {
      expect(() => {
        createMachine({
          initial: 'idle',
          states: { idle: {} }
        });
      }).toThrow();
    });

    test('should throw error for missing initial field', () => {
      expect(() => {
        createMachine({
          id: 'test',
          states: { idle: {} }
        });
      }).toThrow();
    });

    test('should throw error for missing states field', () => {
      expect(() => {
        createMachine({
          id: 'test',
          initial: 'idle'
        });
      }).toThrow();
    });

    test('should throw error for invalid initial state', () => {
      expect(() => {
        createMachine({
          id: 'test',
          initial: 'nonexistent',
          states: { idle: {} }
        });
      }).toThrow();
    });
  });

  describe('Context initialization', () => {
    test('should initialize with empty context by default', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: { idle: {} }
      });

      expect(machine.context).toEqual({});
    });

    test('should initialize with provided context', () => {
      const context = {
        count: 10,
        items: ['a', 'b'],
        nested: { value: true }
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context,
        states: { idle: {} }
      });

      expect(machine.context).toEqual(context);
    });
  });

  describe('Initial state validation', () => {
    test('should set correct initial state for flat machine', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'active',
        states: {
          idle: {},
          active: {},
          done: {}
        }
      });

      expect(machine.state).toBe('active');
    });

    test('should set correct initial state for nested machine', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        states: {
          parent: {
            initial: 'nested',
            states: {
              nested: {},
              other: {}
            }
          }
        }
      });

      expect(machine.state).toBe('parent.nested');
    });
  });
});