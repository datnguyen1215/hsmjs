import { createMachine, assign } from '../src/index.js';

describe('Registry Tests', () => {
  describe('Action Registry Tests', () => {
    test('should resolve string action references', () => {
      const actionFn = jest.fn(() => 'test-result');

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TEST: {
                target: 'idle',
                actions: ['testAction']
              }
            }
          }
        }
      }, {
        actions: {
          testAction: actionFn
        }
      });

      machine.send('TEST');

      expect(actionFn).toHaveBeenCalledTimes(1);
    });

    test('should handle assign actions in registry with object assigners', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, name: '' },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: ['updateContext']
              }
            }
          }
        }
      }, {
        actions: {
          updateContext: assign({
            count: (ctx) => ctx.count + 1,
            name: 'updated'
          })
        }
      });

      machine.send('UPDATE');

      expect(machine.context.count).toBe(1);
      expect(machine.context.name).toBe('updated');
    });

    test('should handle assign actions in registry with function assigners', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 10 },
        states: {
          idle: {
            on: {
              DOUBLE: {
                target: 'idle',
                actions: ['doubleValue']
              }
            }
          }
        }
      }, {
        actions: {
          doubleValue: assign((ctx) => ({ value: ctx.value * 2 }))
        }
      });

      machine.send('DOUBLE');

      expect(machine.context.value).toBe(20);
    });

    test('should handle assign actions in registry with plain object assigners', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { status: 'initial' },
        states: {
          idle: {
            on: {
              RESET: {
                target: 'idle',
                actions: ['resetStatus']
              }
            }
          }
        }
      }, {
        actions: {
          resetStatus: assign({ status: 'reset' })
        }
      });

      machine.send('RESET');

      expect(machine.context.status).toBe('reset');
    });

    test('should handle mixed action patterns', () => {
      const order = [];
      const regularAction = () => order.push('regular');

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              TEST: {
                target: 'idle',
                actions: [
                  'incrementCount',
                  regularAction,
                  'logAction'
                ]
              }
            }
          }
        }
      }, {
        actions: {
          incrementCount: assign({ count: (ctx) => ctx.count + 1 }),
          logAction: () => order.push('logged')
        }
      });

      machine.send('TEST');

      expect(machine.context.count).toBe(1);
      expect(order).toEqual(['regular', 'logged']);
    });

    test('should handle missing actions gracefully', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TEST: {
                target: 'idle',
                actions: ['nonExistentAction']
              }
            }
          }
        }
      });

      const result = await machine.send('TEST');

      expect(result.results[0]).toEqual({
        name: 'nonExistentAction',
        value: undefined
      });
    });

    test('should capture return values from registry actions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TEST: {
                target: 'idle',
                actions: ['action1', 'action2']
              }
            }
          }
        }
      }, {
        actions: {
          action1: () => 'result1',
          action2: () => 42
        }
      });

      const result = await machine.send('TEST');

      expect(result.results[0]).toEqual({ name: 'action1', value: 'result1' });
      expect(result.results[1]).toEqual({ name: 'action2', value: 42 });
    });
  });

  describe('Guard Registry Tests', () => {
    test('should resolve string guard references', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TEST: {
                target: 'active',
                cond: 'isAllowed'
              }
            }
          },
          active: {}
        }
      }, {
        guards: {
          isAllowed: () => true
        }
      });

      machine.send('TEST');

      expect(machine.state).toBe('active');
    });

    test('should evaluate guards with context and event', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 5 },
        states: {
          idle: {
            on: {
              INCREMENT: {
                target: 'active',
                cond: 'isCountBelowTen'
              }
            }
          },
          active: {}
        }
      }, {
        guards: {
          isCountBelowTen: (ctx, event) => ctx.count < 10
        }
      });

      machine.send('INCREMENT');

      expect(machine.state).toBe('active');
    });

    test('should handle missing guards', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TEST: {
                target: 'active',
                cond: 'nonExistentGuard'
              }
            }
          },
          active: {}
        }
      });

      machine.send('TEST');

      // Should stay in idle since guard is missing
      expect(machine.state).toBe('idle');
    });

    test('should handle multiple guard conditions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 5 },
        states: {
          idle: {
            on: {
              TEST: [
                {
                  target: 'high',
                  cond: 'isHigh'
                },
                {
                  target: 'medium',
                  cond: 'isMedium'
                },
                {
                  target: 'low'
                }
              ]
            }
          },
          high: {},
          medium: {},
          low: {}
        }
      }, {
        guards: {
          isHigh: (ctx) => ctx.value > 10,
          isMedium: (ctx) => ctx.value >= 5
        }
      });

      machine.send('TEST');

      expect(machine.state).toBe('medium');
    });
  });

  describe('Integration Tests', () => {
    test('should combine guards and actions from registry - success case', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, attempts: 0 },
        states: {
          idle: {
            on: {
              ATTEMPT: [
                {
                  target: 'success',
                  cond: 'isValid',
                  actions: ['markSuccess']
                },
                {
                  actions: ['incrementAttempts']
                }
              ]
            }
          },
          success: {}
        }
      }, {
        guards: {
          isValid: (ctx) => ctx.attempts < 2
        },
        actions: {
          markSuccess: assign({ count: (ctx) => ctx.count + 1 }),
          incrementAttempts: assign({ attempts: (ctx) => ctx.attempts + 1 })
        }
      });

      // First attempt should succeed
      machine.send('ATTEMPT');
      expect(machine.state).toBe('success');
      expect(machine.context.count).toBe(1);
    });

    test('should combine guards and actions from registry - failure case', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, attempts: 3 }, // Start with attempts > 2
        states: {
          idle: {
            on: {
              ATTEMPT: [
                {
                  target: 'success',
                  cond: 'isValid',
                  actions: ['markSuccess']
                },
                {
                  actions: ['incrementAttempts']
                }
              ]
            }
          },
          success: {}
        }
      }, {
        guards: {
          isValid: (ctx) => ctx.attempts < 2
        },
        actions: {
          markSuccess: assign({ count: (ctx) => ctx.count + 1 }),
          incrementAttempts: assign({ attempts: (ctx) => ctx.attempts + 1 })
        }
      });

      machine.send('ATTEMPT');
      expect(machine.state).toBe('idle');
      expect(machine.context.attempts).toBe(4);
    });

    test('should work with nested states and registry', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        context: { level: 1 },
        states: {
          parent: {
            initial: 'child1',
            states: {
              child1: {
                on: {
                  NEXT: {
                    target: 'child2',
                    cond: 'canAdvance',
                    actions: ['advanceLevel']
                  }
                }
              },
              child2: {}
            }
          }
        }
      }, {
        guards: {
          canAdvance: (ctx) => ctx.level >= 1
        },
        actions: {
          advanceLevel: assign({ level: (ctx) => ctx.level + 1 })
        }
      });

      machine.send('NEXT');

      expect(machine.state).toBe('parent.child2');
      expect(machine.context.level).toBe(2);
    });

    test('should handle sync actions in registry', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { data: null },
        states: {
          idle: {
            on: {
              SET: {
                target: 'idle',
                actions: ['setData']
              }
            }
          }
        }
      }, {
        actions: {
          setData: assign({ data: 'sync-value' })
        }
      });

      await machine.send('SET');
      expect(machine.context.data).toBe('sync-value');
    });
  });
});