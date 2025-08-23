import { createMachine, assign } from '../src/index.js';

describe('Context Management', () => {
  describe('Initial context setup', () => {
    test('should initialize with empty context by default', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: { idle: {} }
      });

      expect(machine.context).toEqual({});
    });

    test('should initialize with provided context', () => {
      const initialContext = {
        count: 0,
        user: { name: 'John', age: 30 },
        items: ['item1', 'item2']
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: initialContext,
        states: { idle: {} }
      });

      expect(machine.context).toEqual(initialContext);
    });

    test('should create independent context for each machine instance', () => {
      const config = {
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              INCREMENT: {
                target: 'idle',
                actions: [assign(({ context }) => ({ count: context.count + 1 }))]
              }
            }
          }
        }
      };

      const machine1 = createMachine(config);
      const machine2 = createMachine(config);

      // Update machine1's context through actions
      machine1.send('INCREMENT');
      machine1.send('INCREMENT');

      // machine2 should remain unchanged
      expect(machine1.context.count).toBe(2);
      expect(machine2.context.count).toBe(0);
    });
  });

  describe('Context updates with assign()', () => {
    test('should update context with object literal', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, name: 'initial' },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign({ count: 10, name: 'updated' })]
              }
            }
          }
        }
      });

      machine.send('UPDATE');

      expect(machine.context).toEqual({ count: 10, name: 'updated' });
    });

    test('should update context with function updater', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 5 },
        states: {
          idle: {
            on: {
              INCREMENT: {
                target: 'idle',
                actions: [assign(({ context }) => ({ count: context.count + 1 }))]
              }
            }
          }
        }
      });

      machine.send('INCREMENT');
      expect(machine.context.count).toBe(6);

      machine.send('INCREMENT');
      expect(machine.context.count).toBe(7);
    });

    test('should have access to event in assign function', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: null },
        states: {
          idle: {
            on: {
              SET: {
                target: 'idle',
                actions: [assign(({ context, event }) => ({ value: event.data }))]
              }
            }
          }
        }
      });

      machine.send('SET', { data: 'test-value' });

      expect(machine.context.value).toBe('test-value');
    });

    test('should merge updates with existing context', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { a: 1, b: 2, c: 3 },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign({ b: 20, d: 4 })]
              }
            }
          }
        }
      });

      machine.send('UPDATE');

      expect(machine.context).toEqual({ a: 1, b: 20, c: 3, d: 4 });
    });
  });

  describe('Context immutability', () => {
    test('should create new context object on updates', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign({ count: 1 })]
              }
            }
          }
        }
      });

      const contextBefore = machine.context;

      machine.send('UPDATE');
      const contextAfter = machine.context;

      expect(contextBefore).not.toBe(contextAfter);
      expect(contextBefore.count).toBe(0);
      expect(contextAfter.count).toBe(1);
    });

    test('should not mutate nested objects', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: {
          user: { name: 'John', age: 30 }
        },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign(({ context }) => ({
                  user: { ...context.user, age: 31 }
                }))]
              }
            }
          }
        }
      });

      const userBefore = machine.context.user;

      machine.send('UPDATE');
      const userAfter = machine.context.user;

      expect(userBefore).not.toBe(userAfter);
      expect(userBefore.age).toBe(30);
      expect(userAfter.age).toBe(31);
    });
  });

  describe('Complex context merging', () => {
    test('should handle deep object merging', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: {
          settings: {
            theme: 'light',
            notifications: {
              email: true,
              push: false
            }
          }
        },
        states: {
          idle: {
            on: {
              UPDATE_THEME: {
                target: 'idle',
                actions: [assign(({ context }) => ({
                  settings: {
                    ...context.settings,
                    theme: 'dark'
                  }
                }))]
              },
              UPDATE_NOTIF: {
                target: 'idle',
                actions: [assign(({ context }) => ({
                  settings: {
                    ...context.settings,
                    notifications: {
                      ...context.settings.notifications,
                      push: true
                    }
                  }
                }))]
              }
            }
          }
        }
      });

      machine.send('UPDATE_THEME');
      expect(machine.context.settings.theme).toBe('dark');
      expect(machine.context.settings.notifications.email).toBe(true);

      machine.send('UPDATE_NOTIF');
      expect(machine.context.settings.theme).toBe('dark');
      expect(machine.context.settings.notifications.push).toBe(true);
    });

    test('should handle array updates in context', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { items: ['a', 'b'] },
        states: {
          idle: {
            on: {
              ADD_ITEM: {
                target: 'idle',
                actions: [assign(({ context, event }) => ({
                  items: [...context.items, event.item]
                }))]
              },
              REMOVE_ITEM: {
                target: 'idle',
                actions: [assign(({ context, event }) => ({
                  items: context.items.filter(item => item !== event.item)
                }))]
              }
            }
          }
        }
      });

      machine.send('ADD_ITEM', { item: 'c' });
      expect(machine.context.items).toEqual(['a', 'b', 'c']);

      machine.send('REMOVE_ITEM', { item: 'b' });
      expect(machine.context.items).toEqual(['a', 'c']);
    });
  });

  describe('Context persistence across transitions', () => {
    test('should maintain context through state transitions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              START: {
                target: 'active',
                actions: [assign(({ context }) => ({ count: context.count + 1 }))]
              }
            }
          },
          active: {
            on: {
              STOP: {
                target: 'idle',
                actions: [assign(({ context }) => ({ count: context.count + 1 }))]
              }
            }
          }
        }
      });

      expect(machine.context.count).toBe(0);

      machine.send('START');
      expect(machine.context.count).toBe(1);

      machine.send('STOP');
      expect(machine.context.count).toBe(2);
    });

    test('should accumulate context changes through multiple actions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { a: 0, b: 0, c: 0 },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [
                  assign({ a: 1 }),
                  assign(({ context }) => ({ b: context.a + 1 })),
                  assign(({ context }) => ({ c: context.b + 1 }))
                ]
              }
            }
          }
        }
      });

      machine.send('UPDATE');

      expect(machine.context).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('Context in nested states', () => {
    test('should share context across nested states', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        context: { value: 'initial' },
        states: {
          parent: {
            initial: 'child1',
            states: {
              child1: {
                entry: [assign({ value: 'child1' })],
                on: {
                  NEXT: 'child2'
                }
              },
              child2: {
                entry: [assign({ value: 'child2' })]
              }
            }
          }
        }
      });

      expect(machine.context.value).toBe('child1');

      machine.send('NEXT');
      expect(machine.context.value).toBe('child2');
    });

    test('should update context from any nested level', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'level1',
        context: { depth: 0 },
        states: {
          level1: {
            initial: 'level2',
            states: {
              level2: {
                initial: 'level3',
                states: {
                  level3: {
                    on: {
                      UPDATE: {
                        target: 'level3',
                        actions: [assign(({ context }) => ({ depth: context.depth + 1 }))]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      expect(machine.context.depth).toBe(0);

      machine.send('UPDATE');
      expect(machine.context.depth).toBe(1);
    });
  });
});