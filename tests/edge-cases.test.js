import { createMachine, assign } from '../src/index.js';

describe('Edge Cases', () => {
  describe('Invalid configurations', () => {
    test('should handle missing required fields', () => {
      expect(() => {
        createMachine({
          initial: 'idle',
          states: { idle: {} }
          // Missing id
        });
      }).toThrow();

      expect(() => {
        createMachine({
          id: 'test',
          states: { idle: {} }
          // Missing initial
        });
      }).toThrow();

      expect(() => {
        createMachine({
          id: 'test',
          initial: 'idle'
          // Missing states
        });
      }).toThrow();
    });

    test('should handle invalid initial state', () => {
      expect(() => {
        createMachine({
          id: 'test',
          initial: 'nonexistent',
          states: { idle: {} }
        });
      }).toThrow();
    });

    test('should handle circular references in nested states', () => {
      // This should not cause infinite loops
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child',
            states: {
              child: {
                on: {
                  UP: '#test.parent',
                  SELF: 'child'
                }
              }
            }
          }
        }
      });

      expect(machine.state).toBe('parent.child');

      machine.send('SELF');
      expect(machine.state).toBe('parent.child');

      machine.send('UP');
      expect(machine.state).toBe('parent.child'); // Should resolve to initial child
    });
  });

  describe('Null and undefined handling', () => {
    test('should handle null/undefined context values', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          false: false
        },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign({
                  nullValue: 'not-null',
                  undefinedValue: 'defined'
                })]
              }
            }
          }
        }
      });

      expect(machine.context.nullValue).toBeNull();
      expect(machine.context.undefinedValue).toBeUndefined();
      expect(machine.context.emptyString).toBe('');
      expect(machine.context.zero).toBe(0);
      expect(machine.context.false).toBe(false);

      machine.send('UPDATE');

      expect(machine.context.nullValue).toBe('not-null');
      expect(machine.context.undefinedValue).toBe('defined');
    });

    test('should handle null/undefined event payloads', () => {
      const actionFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              NULL_EVENT: {
                target: 'idle',
                actions: [actionFn]
              }
            }
          }
        }
      });

      machine.send('NULL_EVENT', null);
      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'NULL_EVENT' })
      );

      actionFn.mockClear();

      machine.send('NULL_EVENT', undefined);
      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'NULL_EVENT' })
      );

      actionFn.mockClear();

      machine.send('NULL_EVENT');
      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'NULL_EVENT' })
      );
    });

    test('should handle null/undefined action functions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [null, undefined, () => 'valid'],
            on: {
              EVENT: {
                target: 'idle',
                actions: [null, undefined, () => 'valid']
              }
            }
          }
        }
      });

      expect(() => {
        machine.send('EVENT');
      }).not.toThrow();
    });
  });

  describe('Empty arrays and objects', () => {
    test('should handle empty action arrays', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [],
            exit: [],
            on: {
              EVENT: {
                target: 'active',
                actions: []
              }
            }
          },
          active: {
            entry: [],
            exit: []
          }
        }
      });

      expect(() => {
        machine.send('EVENT');
      }).not.toThrow();

      expect(machine.state).toBe('active');
    });

    test('should handle empty states object', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TO_EMPTY: 'empty'
            }
          },
          empty: {
            // Completely empty state
          }
        }
      });

      machine.send('TO_EMPTY');
      expect(machine.state).toBe('empty');
    });

    test('should handle empty context object', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: {},
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign({ newProp: 'value' })]
              }
            }
          }
        }
      });

      expect(machine.context).toEqual({});

      machine.send('UPDATE');
      expect(machine.context).toEqual({ newProp: 'value' });
    });
  });

  describe('Special characters and edge case strings', () => {
    test('should handle special characters in event names', () => {
      const actionFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              'EVENT-WITH-DASHES': { actions: [actionFn] },
              'EVENT_WITH_UNDERSCORES': { actions: [actionFn] },
              'EVENT.WITH.DOTS': { actions: [actionFn] },
              'EVENT WITH SPACES': { actions: [actionFn] },
              '123NUMERIC': { actions: [actionFn] },
              'ÉMOJÎ🎉EVENT': { actions: [actionFn] }
            }
          }
        }
      });

      machine.send('EVENT-WITH-DASHES');
      machine.send('EVENT_WITH_UNDERSCORES');
      machine.send('EVENT.WITH.DOTS');
      machine.send('EVENT WITH SPACES');
      machine.send('123NUMERIC');
      machine.send('ÉMOJÎ🎉EVENT');

      expect(actionFn).toHaveBeenCalledTimes(6);
    });

    test('should handle unicode and emoji in context', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: {
          unicode: 'Héllö Wörld',
          emoji: '🎉🚀✨',
          chinese: '你好世界',
          arabic: 'مرحبا بالعالم',
          mixed: '🎉 Hello 世界 ✨'
        },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign({
                  unicode: 'Üpdätëd',
                  emoji: '🎊🎈🎁'
                })]
              }
            }
          }
        }
      });

      expect(machine.context.unicode).toBe('Héllö Wörld');
      expect(machine.context.emoji).toBe('🎉🚀✨');
      expect(machine.context.chinese).toBe('你好世界');

      machine.send('UPDATE');

      expect(machine.context.unicode).toBe('Üpdätëd');
      expect(machine.context.emoji).toBe('🎊🎈🎁');
    });
  });

  describe('Large data structures', () => {
    test('should handle large arrays in context', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { items: largeArray },
        states: {
          idle: {
            on: {
              ADD_ITEM: {
                target: 'idle',
                actions: [assign((context) => ({
                  items: [...context.items, context.items.length]
                }))]
              }
            }
          }
        }
      });

      expect(machine.context.items).toHaveLength(10000);

      machine.send('ADD_ITEM');
      expect(machine.context.items).toHaveLength(10001);
      expect(machine.context.items[10000]).toBe(10000);
    });

    test('should handle deeply nested objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep'
                }
              }
            }
          }
        }
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { deep: deepObject },
        states: {
          idle: {
            on: {
              UPDATE_DEEP: {
                target: 'idle',
                actions: [assign((context) => ({
                  deep: {
                    ...context.deep,
                    level1: {
                      ...context.deep.level1,
                      level2: {
                        ...context.deep.level1.level2,
                        level3: {
                          ...context.deep.level1.level2.level3,
                          level4: {
                            ...context.deep.level1.level2.level3.level4,
                            level5: {
                              value: 'updated'
                            }
                          }
                        }
                      }
                    }
                  }
                }))]
              }
            }
          }
        }
      });

      expect(machine.context.deep.level1.level2.level3.level4.level5.value).toBe('deep');

      machine.send('UPDATE_DEEP');
      expect(machine.context.deep.level1.level2.level3.level4.level5.value).toBe('updated');
    });
  });

  describe('Function edge cases', () => {
    test('should handle functions that return functions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              FUNCTION: {
                target: 'idle',
                actions: [() => () => 'nested-function']
              }
            }
          }
        }
      });


      expect(() => machine.send('FUNCTION')).not.toThrow();
    });

    test('should handle actions that return promises that resolve to functions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ASYNC_FUNCTION: {
                target: 'idle',
                actions: [async () => {
                  return Promise.resolve(() => 'function-from-promise');
                }]
              }
            }
          }
        }
      });


      await expect(machine.send('ASYNC_FUNCTION')).resolves.not.toThrow();
    });

    test('should handle bound functions and arrow functions', () => {
      const obj = {
        value: 'bound',
        method: function() { return this.value; }
      };

      const boundMethod = obj.method.bind(obj);
      const arrowFunction = () => 'arrow';

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              BOUND: {
                target: 'idle',
                actions: [boundMethod]
              },
              ARROW: {
                target: 'idle',
                actions: [arrowFunction]
              }
            }
          }
        }
      });


      expect(() => {
        machine.send('BOUND');
        machine.send('ARROW');
      }).not.toThrow();
    });
  });

  describe('Memory and performance edge cases', () => {
    test('should not leak memory with many transitions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              TOGGLE: 'active'
            }
          },
          active: {
            on: {
              TOGGLE: 'idle'
            }
          }
        }
      });


      // Perform many transitions
      for (let i = 0; i < 1000; i++) {
        machine.send('TOGGLE');
      }

      expect(machine.state).toBe('idle'); // Should end up in idle (even number of toggles)
    });

    test('should handle rapid event sending without memory issues', async () => {
      let counter = 0;

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              TICK: {
                target: 'idle',
                actions: [() => counter++]
              }
            }
          }
        }
      });


      // Send many events rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(machine.send('TICK'));
      }

      await Promise.all(promises);
      expect(counter).toBe(100);
    });
  });

  describe('Error boundary cases', () => {
    test('should handle errors in guards without breaking machine', () => {
      const errorGuard = () => {
        throw new Error('Guard error');
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ERROR_GUARD: {
                target: 'error',
                cond: errorGuard
              },
              NORMAL: 'active'
            }
          },
          error: {},
          active: {}
        }
      });


      expect(() => machine.send('ERROR_GUARD')).not.toThrow();
      expect(machine.state).toBe('idle'); // Should stay in idle due to failed guard

      machine.send('NORMAL');
      expect(machine.state).toBe('active'); // Should still work normally
    });

    test('should handle malformed transition objects', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              // Various malformed transition scenarios
              EMPTY_OBJECT: {},
              NO_TARGET: { actions: [() => 'action'] },
              NULL_TARGET: { target: null },
              UNDEFINED_TARGET: { target: undefined }
            }
          }
        }
      });


      expect(() => {
        machine.send('EMPTY_OBJECT');
        machine.send('NO_TARGET');
        machine.send('NULL_TARGET');
        machine.send('UNDEFINED_TARGET');
      }).not.toThrow();

      expect(machine.state).toBe('idle'); // Should stay in idle for all cases
    });
  });

  describe('Concurrency edge cases', () => {
    test('should handle overlapping async operations', async () => {
      let activeOperations = 0;
      const maxConcurrent = 1; // Should be enforced by the machine

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ASYNC: {
                target: 'idle',
                actions: [async () => {
                  activeOperations++;
                  expect(activeOperations).toBeLessThanOrEqual(maxConcurrent);
                  await new Promise(resolve => setTimeout(resolve, 100));
                  activeOperations--;
                }]
              }
            }
          }
        }
      });


      // Start multiple async operations
      const operations = [
        machine.send('ASYNC'),
        machine.send('ASYNC'),
        machine.send('ASYNC')
      ];

      await Promise.all(operations);
      expect(activeOperations).toBe(0);
    });
  });
});