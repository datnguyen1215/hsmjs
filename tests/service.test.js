import { createMachine, assign } from '../src/index.js';

describe('Machine', () => {
  describe('Machine machine lifecycle', () => {
    test('should start machine machine correctly', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: { idle: {} }
      });

      expect(machine).toBeDefined();
      expect(machine.state).toBe('idle');
      expect(machine.context).toEqual({});
    });

    test('should execute entry actions on start', () => {
      const entryAction = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [entryAction]
          }
        }
      });

      expect(entryAction).toHaveBeenCalledTimes(1);
    });

    test('should handle nested initial states on start', () => {
      const childEntryAction = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child',
            states: {
              child: {
                entry: [childEntryAction]
              }
            }
          }
        }
      });

      expect(machine.state).toBe('parent.child');
      expect(childEntryAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Machine subscriptions', () => {
    test('should allow subscribing to state changes', () => {
      const subscriber = jest.fn();

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

      machine.subscribe(subscriber);

      machine.send('START');

      expect(subscriber).toHaveBeenCalledWith({
        previousState: {
          state: 'idle',
          context: {}
        },
        nextState: {
          state: 'active',
          context: {}
        },
        event: { type: 'START' }
      });
    });

    test('should support multiple subscribers', () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              INCREMENT: {
                target: 'idle',
                actions: [assign(ctx => ({ count: ctx.count + 1 }))]
              }
            }
          }
        }
      });

      machine.subscribe(subscriber1);
      machine.subscribe(subscriber2);

      machine.send('INCREMENT');

      const expectedTransition = {
        previousState: {
          state: 'idle',
          context: { count: 0 }
        },
        nextState: {
          state: 'idle',
          context: { count: 1 }
        },
        event: { type: 'INCREMENT' }
      };

      expect(subscriber1).toHaveBeenCalledWith(expectedTransition);
      expect(subscriber2).toHaveBeenCalledWith(expectedTransition);
    });

    test('should return unsubscribe function', () => {
      const subscriber = jest.fn();

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

      const unsubscribe = machine.subscribe(subscriber);

      machine.send('EVENT');
      expect(subscriber).toHaveBeenCalledTimes(1);

      subscriber.mockClear();
      unsubscribe();

      // Reset to test unsubscribed behavior
      const machine2 = createMachine({
        id: 'test',
        initial: 'active',
        states: {
          active: {
            on: { EVENT: 'idle' }
          },
          idle: {}
        }
      });

      machine2.subscribe(subscriber);
      const unsubscribe2 = machine2.subscribe(() => {});
      unsubscribe2();

      machine2.send('EVENT');
      expect(subscriber).toHaveBeenCalledTimes(1); // Only one subscriber should be called
    });

    test('should handle subscriber errors gracefully', () => {
      const errorSubscriber = () => {
        throw new Error('Subscriber error');
      };
      const normalSubscriber = jest.fn();

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

      machine.subscribe(errorSubscriber);
      machine.subscribe(normalSubscriber);

      expect(() => machine.send('EVENT')).not.toThrow();
      expect(normalSubscriber).toHaveBeenCalled();
    });

    test('should provide complete transition details', () => {
      const subscriber = jest.fn();
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 'initial' },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'active',
                actions: [assign((ctx, event) => ({ value: event.newValue }))]
              }
            }
          },
          active: {
            on: {
              RESET: {
                target: 'idle',
                actions: [assign({ value: 'reset' })]
              }
            }
          }
        }
      });

      machine.subscribe(subscriber);
      
      // First transition
      machine.send('UPDATE', { newValue: 'updated' });
      
      expect(subscriber).toHaveBeenCalledWith({
        previousState: {
          state: 'idle',
          context: { value: 'initial' }
        },
        nextState: {
          state: 'active',
          context: { value: 'updated' }
        },
        event: { type: 'UPDATE', newValue: 'updated' }
      });
      
      subscriber.mockClear();
      
      // Second transition
      machine.send('RESET');
      
      expect(subscriber).toHaveBeenCalledWith({
        previousState: {
          state: 'active',
          context: { value: 'updated' }
        },
        nextState: {
          state: 'idle',
          context: { value: 'reset' }
        },
        event: { type: 'RESET' }
      });
    });
  });

  describe('Machine context isolation', () => {
    test('should maintain independent context per machine instance', () => {
      const config = {
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              INCREMENT: {
                target: 'idle',
                actions: [assign(ctx => ({ count: ctx.count + 1 }))]
              }
            }
          }
        }
      };

      const machine1 = createMachine(config);
      const machine2 = createMachine(config);


      machine1.send('INCREMENT');
      machine1.send('INCREMENT');

      machine2.send('INCREMENT');

      expect(machine1.context.count).toBe(2);
      expect(machine2.context.count).toBe(1);
    });

    test('should clone context to prevent external mutation', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { nested: { value: 0 } },
        states: {
          idle: {
            on: {
              UPDATE: {
                target: 'idle',
                actions: [assign(ctx => ({
                  nested: { ...ctx.nested, value: ctx.nested.value + 1 }
                }))]
              }
            }
          }
        }
      });

      const contextBefore = machine.context;

      machine.send('UPDATE');
      const contextAfter = machine.context;

      expect(contextBefore).not.toBe(contextAfter);
      expect(contextBefore.nested.value).toBe(0);
      expect(contextAfter.nested.value).toBe(1);

      // Mutating returned context shouldn't affect machine
      contextAfter.nested.value = 999;
      expect(machine.context.nested.value).toBe(1);
    });
  });

  describe('Machine event processing', () => {
    test('should process events sequentially', async () => {
      const processingOrder = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ASYNC1: {
                target: 'idle',
                actions: [async () => {
                  await new Promise(r => setTimeout(r, 50));
                  processingOrder.push('async1');
                }]
              },
              ASYNC2: {
                target: 'idle',
                actions: [async () => {
                  await new Promise(r => setTimeout(r, 25));
                  processingOrder.push('async2');
                }]
              },
              SYNC: {
                target: 'idle',
                actions: [() => processingOrder.push('sync')]
              }
            }
          }
        }
      });


      // Send events in rapid succession
      const promise1 = machine.send('ASYNC1');
      const promise2 = machine.send('ASYNC2');
      const promise3 = machine.send('SYNC');

      await Promise.all([promise1, promise2, promise3]);

      // Should be processed in the order they were sent, not completion time
      expect(processingOrder).toEqual(['async1', 'async2', 'sync']);
    });

    test('should return consistent results from send()', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              INCREMENT: {
                target: 'active',
                actions: [assign(ctx => ({ count: ctx.count + 1 }))]
              }
            }
          },
          active: {}
        }
      });

      const result = await machine.send('INCREMENT');

      expect(result).toEqual({
        state: 'active',
        context: { count: 1 },
        results: expect.any(Array)
      });

      expect(result.context).toEqual(machine.context);
      expect(result.state).toBe(machine.state);
    });

    test('should queue events during async processing', async () => {
      let processingCount = 0;

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              SLOW: {
                target: 'idle',
                actions: [async () => {
                  processingCount++;
                  await new Promise(resolve => setTimeout(resolve, 100));
                  processingCount--;
                }]
              }
            }
          }
        }
      });


      // Send multiple events rapidly
      const promises = [
        machine.send('SLOW'),
        machine.send('SLOW'),
        machine.send('SLOW')
      ];

      // At any given time, only one should be processing
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(processingCount).toBeLessThanOrEqual(1);

      await Promise.all(promises);
      expect(processingCount).toBe(0);
    });
  });

  describe('Machine state management', () => {
    test('should update state correctly through transitions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'step1',
        states: {
          step1: {
            on: { NEXT: 'step2' }
          },
          step2: {
            on: { NEXT: 'step3', BACK: 'step1' }
          },
          step3: {
            on: { BACK: 'step2', FINISH: 'done' }
          },
          done: {}
        }
      });

      expect(machine.state).toBe('step1');

      machine.send('NEXT');
      expect(machine.state).toBe('step2');

      machine.send('NEXT');
      expect(machine.state).toBe('step3');

      machine.send('BACK');
      expect(machine.state).toBe('step2');

      machine.send('BACK');
      expect(machine.state).toBe('step1');

      machine.send('NEXT');
      machine.send('NEXT');
      machine.send('FINISH');
      expect(machine.state).toBe('done');
    });

    test('should handle complex nested state updates', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'app',
        states: {
          app: {
            initial: 'loading',
            states: {
              loading: {
                on: { LOADED: 'main' }
              },
              main: {
                initial: 'dashboard',
                states: {
                  dashboard: {
                    on: { GO_SETTINGS: 'settings' }
                  },
                  settings: {
                    on: { GO_DASHBOARD: 'dashboard' }
                  }
                }
              }
            },
            on: {
              LOGOUT: 'auth'
            }
          },
          auth: {
            on: { LOGIN: 'app' }
          }
        }
      });

      expect(machine.state).toBe('app.loading');

      machine.send('LOADED');
      expect(machine.state).toBe('app.main.dashboard');

      machine.send('GO_SETTINGS');
      expect(machine.state).toBe('app.main.settings');

      machine.send('LOGOUT');
      expect(machine.state).toBe('auth');

      machine.send('LOGIN');
      expect(machine.state).toBe('app.loading');
    });
  });

  describe('Machine error handling', () => {
    test('should handle action errors without breaking machine', async () => {
      const errorAction = () => {
        throw new Error('Action failed');
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ERROR: {
                target: 'idle',
                actions: [errorAction]
              },
              NORMAL: {
                target: 'active'
              }
            }
          },
          active: {}
        }
      });


      await expect(machine.send('ERROR')).rejects.toThrow('Action failed');

      // Machine should still be functional
      machine.send('NORMAL');
      expect(machine.state).toBe('active');
    });

    test('should handle missing states gracefully', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              GO_MISSING: 'nonexistent'
            }
          }
        }
      });


      // Should not throw and should stay in current state
      expect(() => machine.send('GO_MISSING')).not.toThrow();
      expect(machine.state).toBe('idle');
    });
  });
});