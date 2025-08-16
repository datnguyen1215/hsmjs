import { createMachine, assign } from '../src/index.js';

describe('Machine Validation', () => {
  describe('Valid configurations', () => {
    test('should validate a simple valid machine', () => {
      const machine = createMachine({
        id: 'simple',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'running'
            }
          },
          running: {
            on: {
              STOP: 'idle'
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate a machine with nested states', () => {
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
              child2: {
                on: { BACK: 'child1' }
              }
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate a machine with guards and actions', () => {
      const machine = createMachine({
        id: 'withGuardsAndActions',
        initial: 'idle',
        states: {
          idle: {
            entry: ['logEntry'],
            exit: ['logExit'],
            on: {
              START: {
                target: 'running',
                cond: 'canStart',
                actions: ['startAction']
              }
            }
          },
          running: {}
        }
      }, {
        guards: {
          canStart: () => true
        },
        actions: {
          logEntry: () => {},
          logExit: () => {},
          startAction: () => {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid transition targets', () => {
    test('should detect invalid transition target', () => {
      const machine = createMachine({
        id: 'invalidTarget',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'nonexistent'
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_TARGET',
          state: 'idle',
          event: 'START',
          target: 'nonexistent'
        })
      );
    });

    test('should detect invalid nested transition target', () => {
      const machine = createMachine({
        id: 'invalidNestedTarget',
        initial: 'parent',
        states: {
          parent: {
            initial: 'child',
            states: {
              child: {
                on: {
                  GO: 'parent.nonexistent'
                }
              }
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_TARGET',
          state: 'parent.child',
          event: 'GO',
          target: 'parent.nonexistent'
        })
      );
    });

    test('should handle array of transitions', () => {
      const machine = createMachine({
        id: 'arrayTransitions',
        initial: 'idle',
        states: {
          idle: {
            on: {
              EVENT: [
                { target: 'valid', cond: () => true },
                { target: 'invalid' }
              ]
            }
          },
          valid: {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_TARGET',
          target: 'invalid'
        })
      );
    });
  });

  describe('Missing guards', () => {
    test('should detect missing guard reference', () => {
      const machine = createMachine({
        id: 'missingGuard',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: {
                target: 'running',
                cond: 'nonexistentGuard'
              }
            }
          },
          running: {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_GUARD',
          guard: 'nonexistentGuard',
          state: 'idle',
          event: 'START'
        })
      );
    });

    test('should handle negated guards', () => {
      const machine = createMachine({
        id: 'negatedGuard',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: {
                target: 'running',
                cond: '!missingGuard'
              }
            }
          },
          running: {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_GUARD',
          guard: 'missingGuard'
        })
      );
    });

    test('should not error on function guards', () => {
      const machine = createMachine({
        id: 'functionGuard',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: {
                target: 'running',
                cond: (ctx) => ctx.canStart
              }
            }
          },
          running: {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Missing actions', () => {
    test('should detect missing action in entry', () => {
      const machine = createMachine({
        id: 'missingEntryAction',
        initial: 'idle',
        states: {
          idle: {
            entry: ['nonexistentAction']
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_ACTION',
          action: 'nonexistentAction',
          state: 'idle',
          actionType: 'entry'
        })
      );
    });

    test('should detect missing action in exit', () => {
      const machine = createMachine({
        id: 'missingExitAction',
        initial: 'idle',
        states: {
          idle: {
            exit: ['missingExit'],
            on: { LEAVE: 'done' }
          },
          done: {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_ACTION',
          action: 'missingExit',
          state: 'idle',
          actionType: 'exit'
        })
      );
    });

    test('should detect missing action in transition', () => {
      const machine = createMachine({
        id: 'missingTransitionAction',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: {
                target: 'running',
                actions: ['missingAction']
              }
            }
          },
          running: {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_ACTION',
          action: 'missingAction',
          state: 'idle',
          event: 'START'
        })
      );
    });

    test('should not error on function actions', () => {
      const machine = createMachine({
        id: 'functionActions',
        initial: 'idle',
        states: {
          idle: {
            entry: [(ctx) => console.log('entry')],
            exit: [() => console.log('exit')],
            on: {
              START: {
                target: 'running',
                actions: [(ctx, event) => console.log('transition')]
              }
            }
          },
          running: {}
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should not error on assign actions', () => {
      const machine = createMachine({
        id: 'assignActions',
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            entry: [assign({ count: 1 })],
            on: {
              INCREMENT: {
                target: 'idle',
                actions: [assign({ count: (ctx) => ctx.count + 1 })]
              }
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid nested initial states', () => {
    test('should detect invalid initial state in nested state', () => {
      const machine = createMachine({
        id: 'invalidNestedInitial',
        initial: 'parent',
        states: {
          parent: {
            initial: 'nonexistentChild',
            states: {
              child1: {},
              child2: {}
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_INITIAL',
          state: 'parent',
          initial: 'nonexistentChild'
        })
      );
    });
  });

  describe('State reachability warnings', () => {
    test('should warn about unreachable states', () => {
      const machine = createMachine({
        id: 'unreachable',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'running'
            }
          },
          running: {
            on: {
              STOP: 'idle'
            }
          },
          orphaned: {
            // No transitions lead to this state
            on: {
              EXIT: 'idle'
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true); // Warnings don't affect validity
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'UNREACHABLE_STATE',
          state: 'orphaned'
        })
      );
    });

    test('should warn about empty states', () => {
      const machine = createMachine({
        id: 'emptyStates',
        initial: 'idle',
        states: {
          idle: {
            on: { GO: 'empty' }
          },
          empty: {
            // No transitions, no actions, no children
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'EMPTY_STATE',
          state: 'empty'
        })
      );
    });

    test('should not warn about states with only entry/exit actions', () => {
      const machine = createMachine({
        id: 'statesWithActions',
        initial: 'idle',
        states: {
          idle: {
            on: { GO: 'hasActions' }
          },
          hasActions: {
            entry: [() => console.log('entry')],
            exit: [() => console.log('exit')]
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(true);
      const emptyWarnings = result.warnings.filter(w => w.type === 'EMPTY_STATE');
      expect(emptyWarnings).toHaveLength(0);
    });
  });

  describe('Complex validation scenarios', () => {
    test('should validate complex machine with multiple issues', () => {
      const machine = createMachine({
        id: 'complex',
        initial: 'idle',
        context: { data: null },
        states: {
          idle: {
            entry: ['missingEntry'],
            on: {
              FETCH: {
                target: 'loading',
                cond: 'canFetch'
              }
            }
          },
          loading: {
            on: {
              SUCCESS: {
                target: 'success',
                actions: ['handleSuccess']
              },
              ERROR: 'nonexistent'
            }
          },
          success: {
            on: {
              RESET: 'idle'
            }
          },
          orphaned: {
            entry: ['orphanedAction']
          }
        }
      }, {
        guards: {
          // canFetch is missing
        },
        actions: {
          handleSuccess: () => {}
          // missingEntry and orphanedAction are missing
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);

      // Check for various errors
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_ACTION',
          action: 'missingEntry'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_GUARD',
          guard: 'canFetch'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_TARGET',
          target: 'nonexistent'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_ACTION',
          action: 'orphanedAction'
        })
      );

      // Check for warnings
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'UNREACHABLE_STATE',
          state: 'orphaned'
        })
      );
    });

    test('should handle ID references in transitions', () => {
      const machine = createMachine({
        id: 'withIdRefs',
        initial: 'parent',
        states: {
          parent: {
            id: 'parentId',
            initial: 'child',
            states: {
              child: {
                on: {
                  RESET: '#withIdRefs.parent',
                  INVALID: '#nonexistentId'
                }
              }
            }
          }
        }
      });

      const result = machine.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_TARGET',
          target: '#nonexistentId'
        })
      );
    });
  });
});