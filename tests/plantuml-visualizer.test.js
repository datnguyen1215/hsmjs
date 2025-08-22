import { createMachine } from '../src/index.js';
import { generatePlantUML } from '../src/visualizers/plantuml.js';

// Helper function to validate PlantUML syntax
const isValidPlantUMLSyntax = (diagram) => {
  const lines = diagram.split('\n').map(line => line.trim()).filter(line => line);

  // Must start with @startuml and end with @enduml
  if (!lines[0].startsWith('@startuml')) return false;
  if (!lines[lines.length - 1].startsWith('@enduml')) return false;

  // Define valid patterns for PlantUML syntax
  const validPatterns = [
    /^@startuml$/,
    /^@enduml$/,
    /^\[\*\]\s+-->\s+[\w.]+$/,
    /^[\w.]+\s+-->\s+[\w.]+\s*:\s*.+$/,
    /^state\s+[\w.]+\s*:\s*.+$/,
    /^state\s+[\w.]+\s*\{$/,
    /^\}$/
  ];

  // Validate each line matches at least one pattern
  for (const line of lines) {
    const isValid = validPatterns.some(pattern => pattern.test(line));
    if (!isValid) return false;
  }

  return true;
};

// Test data fixtures
const simpleMachine = {
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
        FINISH: 'done'
      }
    },
    done: {}
  }
};

const entryExitMachine = {
  id: 'entryExit',
  initial: 'idle',
  states: {
    idle: {
      entry: ['logEntry'],
      exit: ['logExit'],
      on: {
        START: 'running'
      }
    },
    running: {
      entry: ['startWork'],
      on: {
        FINISH: 'done'
      }
    },
    done: {
      exit: ['cleanup']
    }
  }
};

const nestedMachine = {
  id: 'nested',
  initial: 'parent',
  states: {
    parent: {
      initial: 'child1',
      entry: ['enterParent'],
      exit: ['exitParent'],
      states: {
        child1: {
          entry: ['enterChild1'],
          on: {
            NEXT: 'child2'
          }
        },
        child2: {
          exit: ['exitChild2']
        }
      }
    },
    sibling: {}
  }
};

const guardedMachine = {
  id: 'guarded',
  initial: 'idle',
  states: {
    idle: {
      on: {
        START: [
          { target: 'allowed', cond: 'isAllowed', actions: ['logAllowed'] },
          { target: 'denied', cond: 'isDenied', actions: ['logDenied'] }
        ]
      }
    },
    allowed: {},
    denied: {}
  }
};

const complexMachine = {
  id: 'complex',
  initial: 'idle',
  states: {
    idle: {
      entry: ['initializeSystem'],
      on: {
        START: 'working'
      }
    },
    working: {
      initial: 'processing',
      entry: ['startWorking'],
      exit: ['stopWorking'],
      states: {
        processing: {
          entry: ['beginProcessing'],
          on: {
            PAUSE: 'paused',
            COMPLETE: '#complex.done'
          }
        },
        paused: {
          entry: ['pauseWork'],
          exit: ['resumeWork'],
          on: {
            RESUME: 'processing'
          }
        }
      },
      on: {
        CANCEL: 'idle'
      }
    },
    done: {
      entry: ['finishWork'],
      on: {
        RESET: 'idle'
      }
    }
  }
};

describe('PlantUML Visualizer', () => {
  describe('Basic Visualization', () => {
    test('should generate basic PlantUML diagram', () => {
      const machine = createMachine(simpleMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('@startuml');
      expect(diagram).toContain('@enduml');
      expect(diagram).toContain('[*] --> idle');
      expect(diagram).toContain('idle --> running : START');
      expect(diagram).toContain('running --> done : FINISH');
      expect(isValidPlantUMLSyntax(diagram)).toBe(true);
    });

    test('should handle empty states', () => {
      const machine = createMachine({
        id: 'empty',
        initial: 'alone',
        states: {
          alone: {}
        }
      });
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('@startuml');
      expect(diagram).toContain('@enduml');
      expect(diagram).toContain('[*] --> alone');
      expect(diagram).toBeDefined();
    });
  });

  describe('Entry/Exit Actions Display', () => {
    test('should show entry actions inside state definitions', () => {
      const machine = createMachine(entryExitMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('state idle : entry / logEntry');
      expect(diagram).toContain('state running : entry / startWork');
    });

    test('should show exit actions inside state definitions', () => {
      const machine = createMachine(entryExitMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('state idle : entry / logEntry\\nexit / logExit');
      expect(diagram).toContain('state done : exit / cleanup');
    });

    test('should handle multiple entry and exit actions', () => {
      const multiActionMachine = {
        id: 'multiAction',
        initial: 'state1',
        states: {
          state1: {
            entry: ['action1', 'action2'],
            exit: ['exitAction1', 'exitAction2'],
            on: {
              NEXT: 'state2'
            }
          },
          state2: {}
        }
      };

      const machine = createMachine(multiActionMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('state state1 : entry / action1, action2\\nexit / exitAction1, exitAction2');
    });
  });

  describe('Nested States', () => {
    test('should handle nested states with entry/exit actions', () => {
      const machine = createMachine(nestedMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('state parent : entry / enterParent\\nexit / exitParent');
      expect(diagram).toContain('state parent {');
      expect(diagram).toContain('[*] --> child1');
      expect(diagram).toContain('state child1 : entry / enterChild1');
      expect(diagram).toContain('state child2 : exit / exitChild2');
      expect(diagram).toContain('child1 --> child2 : NEXT');
      expect(diagram).toContain('}');
    });

    test('should handle deeply nested states', () => {
      const deeplyNestedMachine = {
        id: 'deep',
        initial: 'level1',
        states: {
          level1: {
            initial: 'level2',
            entry: ['enterLevel1'],
            states: {
              level2: {
                initial: 'level3',
                entry: ['enterLevel2'],
                states: {
                  level3: {
                    entry: ['enterLevel3']
                  }
                }
              }
            }
          }
        }
      };

      const machine = createMachine(deeplyNestedMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('state level1 : entry / enterLevel1');
      expect(diagram).toContain('state level1 {');
      expect(diagram).toContain('state level2 : entry / enterLevel2');
      expect(diagram).toContain('state level2 {');
      expect(diagram).toContain('state level3 : entry / enterLevel3');
      expect(diagram).toMatch(/\s+\}\s+\}/); // Two closing braces
    });
  });

  describe('Guards and Actions in Transitions', () => {
    test('should show guards in transition labels', () => {
      const machine = createMachine(guardedMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('idle --> allowed : START [isAllowed] / logAllowed');
      expect(diagram).toContain('idle --> denied : START [isDenied] / logDenied');
    });

    test('should handle transitions with only guards', () => {
      const guardOnlyMachine = {
        id: 'guardOnly',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: [
                { target: 'allowed', cond: 'isAllowed' },
                { target: 'denied' }
              ]
            }
          },
          allowed: {},
          denied: {}
        }
      };

      const machine = createMachine(guardOnlyMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('idle --> allowed : START [isAllowed]');
      expect(diagram).toContain('idle --> denied : START');
    });

    test('should handle transitions with only actions', () => {
      const actionOnlyMachine = {
        id: 'actionOnly',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: { target: 'running', actions: ['startAction'] }
            }
          },
          running: {}
        }
      };

      const machine = createMachine(actionOnlyMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('idle --> running : START / startAction');
    });

    test('should handle function guards and actions', () => {
      const functionMachine = {
        id: 'function',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: {
                target: 'running',
                cond: () => true,
                actions: [() => console.log('action')]
              }
            }
          },
          running: {}
        }
      };

      const machine = createMachine(functionMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('idle --> running : START [cond] / action');
    });
  });

  describe('Edge Cases', () => {
    test('should skip wildcard events', () => {
      const wildcardMachine = {
        id: 'wildcard',
        initial: 'idle',
        states: {
          idle: {
            on: {
              '*': 'any',
              SPECIFIC: 'specific'
            }
          },
          any: {},
          specific: {}
        }
      };

      const machine = createMachine(wildcardMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).not.toContain('idle --> any : *');
      expect(diagram).toContain('idle --> specific : SPECIFIC');
    });

    test('should handle ID references', () => {
      const machine = createMachine(complexMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      // Should clean up ID references to just state names
      expect(diagram).toContain('processing --> done : COMPLETE');
      expect(diagram).not.toContain('#complex.done');
    });

    test('should handle self-transitions', () => {
      const selfTransitionMachine = {
        id: 'self',
        initial: 'state1',
        states: {
          state1: {
            entry: ['selfEntry'],
            on: {
              SELF: 'state1',
              NEXT: 'state2'
            }
          },
          state2: {}
        }
      };

      const machine = createMachine(selfTransitionMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('state state1 : entry / selfEntry');
      expect(diagram).toContain('state1 --> state1 : SELF');
      expect(diagram).toContain('state1 --> state2 : NEXT');
    });

    test('should handle multiple transitions for same event', () => {
      const machine = createMachine(guardedMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      // Should show both transitions for START event
      expect(diagram).toContain('idle --> allowed : START [isAllowed] / logAllowed');
      expect(diagram).toContain('idle --> denied : START [isDenied] / logDenied');
    });

    test('should handle malformed ID references gracefully', () => {
      const malformedMachine = {
        id: 'malformed',
        initial: 'idle',
        states: {
          idle: {
            on: {
              BAD1: '#',
              BAD2: '#.',
              BAD3: '#..state',
              GOOD: '#malformed.done'
            }
          },
          done: {}
        }
      };

      const machine = createMachine(malformedMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      // Should only contain the good transition
      expect(diagram).toContain('idle --> done : GOOD');
      expect(diagram).not.toContain('BAD1');
      expect(diagram).not.toContain('BAD2');
      expect(diagram).not.toContain('BAD3');
    });
  });

  describe('Error Handling', () => {
    test('should throw for missing config', () => {
      expect(() => {
        generatePlantUML(null);
      }).toThrow('Config parameter is required and must be an object');
    });

    test('should validate config structure', () => {
      expect(() => createMachine({
        id: 'invalid'
        // Missing initial and states
      })).toThrow();
    });
  });

  describe('Integration with Machine', () => {
    test('should work with machine visualize method', () => {
      const machine = createMachine(simpleMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      expect(diagram).toContain('@startuml');
      expect(diagram).toContain('@enduml');
      expect(isValidPlantUMLSyntax(diagram)).toBe(true);
    });

    test('should handle complex machine with all features', () => {
      const machine = createMachine(complexMachine);
      const diagram = machine.visualize({ type: 'plantuml' });

      // Check initial state
      expect(diagram).toContain('[*] --> idle');

      // Check entry actions
      expect(diagram).toContain('state idle : entry / initializeSystem');
      expect(diagram).toContain('state working : entry / startWorking\\nexit / stopWorking');

      // Check nested states
      expect(diagram).toContain('state working {');
      expect(diagram).toContain('[*] --> processing');

      // Check transitions
      expect(diagram).toContain('idle --> working : START');
      expect(diagram).toContain('processing --> done : COMPLETE');

      expect(isValidPlantUMLSyntax(diagram)).toBe(true);
    });
  });
});