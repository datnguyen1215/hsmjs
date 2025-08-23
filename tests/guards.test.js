import { createMachine, assign } from '../src/index.js';

describe('Guards', () => {
  describe('Basic guard functionality', () => {
    test('should respect guard conditions', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              CONDITIONAL: {
                target: 'active',
                cond: ({ context }) => context.count > 5
              }
            }
          },
          active: {}
        }
      });

      machine.send('CONDITIONAL');
      expect(machine.state).toBe('idle');

      // Update context first, then test guard
      const machine2 = createMachine({
        id: 'test2',
        initial: 'idle',
        context: { count: 10 },
        states: {
          idle: {
            on: {
              CONDITIONAL: {
                target: 'active',
                cond: ({ context }) => context.count > 5
              }
            }
          },
          active: {}
        }
      });

      machine2.send('CONDITIONAL');
      expect(machine2.state).toBe('active');
    });

    test('should pass context and event to guard functions', () => {
      const guardFn = jest.fn().mockReturnValue(true);

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { value: 'test' },
        states: {
          idle: {
            on: {
              EVENT: {
                target: 'active',
                cond: guardFn
              }
            }
          },
          active: {}
        }
      });

      machine.send('EVENT', { data: 'payload' });

      expect(guardFn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ value: 'test' }),
          event: expect.objectContaining({ type: 'EVENT', data: 'payload' }),
          machine: expect.any(Object)
        })
      );
    });

    test('should allow transition when no guard is specified', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              GO: 'active'
            }
          },
          active: {}
        }
      });

      machine.send('GO');
      expect(machine.state).toBe('active');
    });
  });

  describe('Multiple guards', () => {
    test('should evaluate guards in order and use first passing guard', () => {
      const guard1 = jest.fn().mockReturnValue(false);
      const guard2 = jest.fn().mockReturnValue(true);
      const guard3 = jest.fn().mockReturnValue(true);

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: [
                { target: 'state1', cond: guard1 },
                { target: 'state2', cond: guard2 },
                { target: 'state3', cond: guard3 }
              ]
            }
          },
          state1: {},
          state2: {},
          state3: {}
        }
      });

      machine.send('EVENT');

      expect(guard1).toHaveBeenCalled();
      expect(guard2).toHaveBeenCalled();
      expect(guard3).not.toHaveBeenCalled();
      expect(machine.state).toBe('state2');
    });

    test('should stay in current state if no guards pass', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: [
                { target: 'state1', cond: () => false },
                { target: 'state2', cond: () => false }
              ]
            }
          },
          state1: {},
          state2: {}
        }
      });

      machine.send('EVENT');
      expect(machine.state).toBe('idle');
    });
  });

  describe('Guard error handling', () => {
    test('should handle guard function errors gracefully', () => {
      const errorGuard = () => {
        throw new Error('Guard error');
      };

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ERROR: {
                target: 'active',
                cond: errorGuard
              }
            }
          },
          active: {}
        }
      });


      // Should not throw and should stay in current state
      expect(() => machine.send('ERROR')).not.toThrow();
      expect(machine.state).toBe('idle');
    });

    test('should continue with next guard if previous guard throws', () => {
      const errorGuard = () => {
        throw new Error('Guard error');
      };
      const validGuard = jest.fn().mockReturnValue(true);

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: [
                { target: 'error', cond: errorGuard },
                { target: 'success', cond: validGuard }
              ]
            }
          },
          error: {},
          success: {}
        }
      });

      machine.send('EVENT');

      expect(validGuard).toHaveBeenCalled();
      expect(machine.state).toBe('success');
    });
  });

  describe('String guard references', () => {
    test('should resolve string guards from guards map', () => {
      const guardFn = jest.fn().mockReturnValue(true);

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: {
                target: 'active',
                cond: 'myGuard'
              }
            }
          },
          active: {}
        }
      }, {
        guards: {
          myGuard: guardFn
        }
      });

      machine.send('EVENT');

      expect(guardFn).toHaveBeenCalled();
      expect(machine.state).toBe('active');
    });

    test('should handle missing string guard references', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: {
                target: 'active',
                cond: 'nonexistentGuard'
              }
            }
          },
          active: {}
        }
      });

      machine.send('EVENT');

      // Should stay in current state when guard is not found
      expect(machine.state).toBe('idle');
    });
  });

  describe('Complex guard scenarios', () => {
    test('should work with context-dependent guards', () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { permissions: ['read'] },
        states: {
          idle: {
            on: {
              WRITE: {
                target: 'writing',
                cond: ({ context }) => context.permissions.includes('write')
              },
              READ: {
                target: 'reading',
                cond: ({ context }) => context.permissions.includes('read')
              }
            }
          },
          writing: {},
          reading: {}
        }
      });

      machine.send('WRITE');
      expect(machine.state).toBe('idle'); // No write permission

      machine.send('READ');
      expect(machine.state).toBe('reading'); // Has read permission
    });

    test('should work with event payload guards', () => {
      const config = {
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              PROCESS: [
                {
                  target: 'priority',
                  cond: ({ context, event }) => event.priority === 'high'
                },
                {
                  target: 'normal',
                  cond: ({ context, event }) => event.priority === 'normal'
                },
                { target: 'low' } // Default case with no guard
              ]
            }
          },
          priority: {},
          normal: {},
          low: {}
        }
      };

      const machine = createMachine(config);
      machine.send('PROCESS', { priority: 'high' });
      expect(machine.state).toBe('priority');

      const machine2 = createMachine(config);
      machine2.send('PROCESS', { priority: 'normal' });
      expect(machine2.state).toBe('normal');

      const machine3 = createMachine(config);
      machine3.send('PROCESS', { priority: 'low' });
      expect(machine3.state).toBe('low');
    });

    test('should combine with actions properly', () => {
      let actionExecuted = false;

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { allowed: true },
        states: {
          idle: {
            on: {
              ACTION: {
                target: 'done',
                cond: ({ context }) => context.allowed,
                actions: [() => { actionExecuted = true; }]
              }
            }
          },
          done: {}
        }
      });

      machine.send('ACTION');

      expect(machine.state).toBe('done');
      expect(actionExecuted).toBe(true);
    });

    test('should not execute actions if guard fails', () => {
      let actionExecuted = false;

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { allowed: false },
        states: {
          idle: {
            on: {
              ACTION: {
                target: 'done',
                cond: ({ context }) => context.allowed,
                actions: [() => { actionExecuted = true; }]
              }
            }
          },
          done: {}
        }
      });

      machine.send('ACTION');

      expect(machine.state).toBe('idle');
      expect(actionExecuted).toBe(false);
    });
  });

  describe('Nested state guards', () => {
    test('should work with guards in nested states', () => {
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
                    cond: ({ context }) => context.level >= 2
                  }
                }
              },
              child2: {}
            }
          }
        }
      });

      expect(machine.state).toBe('parent.child1');

      machine.send('NEXT');
      expect(machine.state).toBe('parent.child1'); // Guard should fail

      // Test with different context
      const machine2 = createMachine({
        id: 'test',
        initial: 'parent',
        context: { level: 3 },
        states: {
          parent: {
            initial: 'child1',
            states: {
              child1: {
                on: {
                  NEXT: {
                    target: 'child2',
                    cond: ({ context }) => context.level >= 2
                  }
                }
              },
              child2: {}
            }
          }
        }
      });

      machine2.send('NEXT');
      expect(machine2.state).toBe('parent.child2');
    });
  });
});