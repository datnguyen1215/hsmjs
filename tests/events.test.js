import { createMachine, assign } from '../src/index.js';

describe('Events', () => {
  describe('Basic event handling', () => {
    test('should handle simple events', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'active',
              STOP: 'stopped'
            }
          },
          active: {
            on: {
              PAUSE: 'paused',
              STOP: 'stopped'
            }
          },
          paused: {
            on: {
              RESUME: 'active',
              STOP: 'stopped'
            }
          },
          stopped: {}
        }
      });

      expect(machine.state).toBe('idle');

      machine.send('START');
      expect(machine.state).toBe('active');

      machine.send('PAUSE');
      expect(machine.state).toBe('paused');

      machine.send('RESUME');
      expect(machine.state).toBe('active');

      machine.send('STOP');
      expect(machine.state).toBe('stopped');
    });

    test('should ignore events not handled by current state', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'active'
            }
          },
          active: {}
        }
      });

      expect(machine.state).toBe('idle');

      machine.send('UNKNOWN_EVENT');
      expect(machine.state).toBe('idle');

      machine.send('START');
      expect(machine.state).toBe('active');

      machine.send('ANOTHER_UNKNOWN');
      expect(machine.state).toBe('active');
    });
  });

  describe('Event payloads', () => {
    test('should pass event payload to actions', () => {
      const actionFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              SEND_DATA: {
                target: 'idle',
                actions: [actionFn]
              }
            }
          }
        }
      });

      machine.send('SEND_DATA', { value: 42, message: 'test' });

      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object), // context
        expect.objectContaining({
          type: 'SEND_DATA',
          value: 42,
          message: 'test'
        })
      );
    });

    test('should use event payload in context updates', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: null, count: 0 },
        states: {
          idle: {
            on: {
              SET_VALUE: {
                target: 'idle',
                actions: [assign((context, event) => ({
                  value: event.value,
                  count: context.count + 1
                }))]
              }
            }
          }
        }
      });

      machine.send('SET_VALUE', { value: 'hello' });

      expect(machine.context.value).toBe('hello');
      expect(machine.context.count).toBe(1);

      machine.send('SET_VALUE', { value: 'world' });
      expect(machine.context.value).toBe('world');
      expect(machine.context.count).toBe(2);
    });

    test('should pass event payload to guards', () => {
      const guardFn = jest.fn().mockReturnValue(true);

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              CONDITIONAL: {
                target: 'active',
                cond: guardFn
              }
            }
          },
          active: {}
        }
      });

      machine.send('CONDITIONAL', { allowed: true, reason: 'test' });

      expect(guardFn).toHaveBeenCalledWith(
        expect.any(Object), // context
        expect.objectContaining({
          type: 'CONDITIONAL',
          allowed: true,
          reason: 'test'
        })
      );
    });
  });

  describe('Self-transitions', () => {
    test('should handle self-transitions as internal transitions', () => {
      const entryAction = jest.fn();
      const exitAction = jest.fn();
      const transitionAction = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'active',
        states: {
          active: {
            entry: [entryAction],
            exit: [exitAction],
            on: {
              REFRESH: {
                target: 'active',
                actions: [transitionAction]
              }
            }
          }
        }
      });

      expect(entryAction).toHaveBeenCalledTimes(1);

      entryAction.mockClear();
      exitAction.mockClear();

      machine.send('REFRESH');

      // Self-transitions should not trigger exit/entry actions
      expect(exitAction).not.toHaveBeenCalled();
      expect(transitionAction).toHaveBeenCalledTimes(1);
      expect(entryAction).not.toHaveBeenCalled();
      expect(machine.state).toBe('active');
    });

    test('should handle internal transitions', () => {
      const entryAction = jest.fn();
      const exitAction = jest.fn();
      const internalAction = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'active',
        states: {
          active: {
            entry: [entryAction],
            exit: [exitAction],
            on: {
              INTERNAL: {
                actions: [internalAction]
                // No target means internal transition
              }
            }
          }
        }
      });

      expect(entryAction).toHaveBeenCalledTimes(1);

      entryAction.mockClear();
      exitAction.mockClear();

      machine.send('INTERNAL');

      expect(exitAction).not.toHaveBeenCalled();
      expect(entryAction).not.toHaveBeenCalled();
      expect(internalAction).toHaveBeenCalledTimes(1);
      expect(machine.state).toBe('active');
    });

    test('should handle real transitions between different states', () => {
      const exitIdle = jest.fn();
      const entryActive = jest.fn();
      const exitActive = jest.fn();
      const entryIdle = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            entry: [entryIdle],
            exit: [exitIdle],
            on: {
              START: 'active'
            }
          },
          active: {
            entry: [entryActive],
            exit: [exitActive],
            on: {
              STOP: 'idle'
            }
          }
        }
      });

      expect(entryIdle).toHaveBeenCalledTimes(1);

      entryIdle.mockClear();

      // Transition from idle to active
      machine.send('START');
      expect(exitIdle).toHaveBeenCalledTimes(1);
      expect(entryActive).toHaveBeenCalledTimes(1);
      expect(machine.state).toBe('active');

      // Transition from active back to idle
      machine.send('STOP');
      expect(exitActive).toHaveBeenCalledTimes(1);
      expect(entryIdle).toHaveBeenCalledTimes(1);
      expect(machine.state).toBe('idle');
    });
  });

  describe('Event queuing', () => {
    test('should queue events during transitions', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              SLOW: {
                target: 'processing',
                actions: [async () => {
                  await new Promise(resolve => setTimeout(resolve, 50));
                }]
              }
            }
          },
          processing: {
            on: {
              COMPLETE: 'done'
            }
          },
          done: {}
        }
      });


      // Send events in rapid succession
      const promise1 = machine.send('SLOW');
      const promise2 = machine.send('COMPLETE'); // Should be queued

      await promise1;
      expect(machine.state).toBe('processing');

      await promise2;
      expect(machine.state).toBe('done');
    });
  });

  describe('Nested state events', () => {
    test('should handle events in nested states', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child1',
            states: {
              child1: {
                on: {
                  NEXT: 'child2'
                }
              },
              child2: {
                on: {
                  BACK: 'child1'
                }
              }
            },
            on: {
              EXIT: 'sibling'
            }
          },
          sibling: {}
        }
      });

      expect(machine.state).toBe('parent.child1');

      machine.send('NEXT');
      expect(machine.state).toBe('parent.child2');

      machine.send('BACK');
      expect(machine.state).toBe('parent.child1');

      machine.send('EXIT');
      expect(machine.state).toBe('sibling');
    });

    test('should bubble events to parent states', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child',
            states: {
              child: {
                // Child doesn't handle ESCAPE
              }
            },
            on: {
              ESCAPE: 'sibling' // Parent handles ESCAPE
            }
          },
          sibling: {}
        }
      });

      expect(machine.state).toBe('parent.child');

      machine.send('ESCAPE'); // Should bubble up to parent
      expect(machine.state).toBe('sibling');
    });
  });

  describe('Wildcard events', () => {
    test('should handle wildcard events', () => {
      const wildcardAction = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'active',
              '*': {
                actions: [wildcardAction]
              }
            }
          },
          active: {}
        }
      });

      machine.send('UNKNOWN_EVENT');
      expect(wildcardAction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'UNKNOWN_EVENT' })
      );
      expect(machine.state).toBe('idle');

      wildcardAction.mockClear();

      machine.send('START');
      expect(wildcardAction).not.toHaveBeenCalled();
      expect(machine.state).toBe('active');
    });
  });

  describe('Multiple event handlers', () => {
    test('should handle multiple transitions for same event', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { priority: 'normal' },
        states: {
          idle: {
            on: {
              PROCESS: [
                {
                  target: 'urgent',
                  cond: (context) => context.priority === 'urgent'
                },
                {
                  target: 'normal',
                  cond: (context) => context.priority === 'normal'
                },
                {
                  target: 'low'
                }
              ]
            }
          },
          urgent: {},
          normal: {},
          low: {}
        }
      });

      machine.send('PROCESS');
      expect(machine.state).toBe('normal');
    });
  });

  describe('Event validation', () => {
    test('should handle events with null/undefined payloads', () => {
      const actionFn = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
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

      machine.send('EVENT', null);
      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'EVENT' })
      );

      actionFn.mockClear();

      machine.send('EVENT', undefined);
      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'EVENT' })
      );

      actionFn.mockClear();

      machine.send('EVENT');
      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'EVENT' })
      );
    });

    test('should handle events with complex payloads', () => {
      const actionFn = jest.fn();
      const complexPayload = {
        nested: { data: 'value' },
        array: [1, 2, 3],
        func: () => 'test',
        date: new Date(),
        regex: /test/g
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              COMPLEX: {
                target: 'idle',
                actions: [actionFn]
              }
            }
          }
        }
      });

      machine.send('COMPLEX', complexPayload);

      expect(actionFn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'COMPLEX',
          ...complexPayload
        })
      );
    });
  });

  describe('Event history', () => {
    test('should maintain event order in sequential processing', async () => {
      const eventOrder = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT1: {
                target: 'idle',
                actions: [() => eventOrder.push('event1')]
              },
              EVENT2: {
                target: 'idle',
                actions: [() => eventOrder.push('event2')]
              },
              EVENT3: {
                target: 'idle',
                actions: [() => eventOrder.push('event3')]
              }
            }
          }
        }
      });


      await machine.send('EVENT1');
      await machine.send('EVENT2');
      await machine.send('EVENT3');

      expect(eventOrder).toEqual(['event1', 'event2', 'event3']);
    });
  });
});