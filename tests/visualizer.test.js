import { createMachine } from '../src/index.js';

// Helper function to validate Mermaid syntax
const isValidMermaidSyntax = (diagram) => {
  const lines = diagram.split('\n').map(line => line.trim()).filter(line => line);

  // Must start with stateDiagram-v2
  if (!lines[0].startsWith('stateDiagram-v2')) return false;

  // Define valid patterns for Mermaid syntax
  const validPatterns = [
    /^stateDiagram-v2$/,
    /^direction\s+(TB|LR|BT|RL)$/,
    /^\[\*\]\s+-->\s+[\w.]+$/,
    /^[\w.]+\s+-->\s+[\w.]+\s*:\s*.+$/,
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

const nestedMachine = {
  id: 'nested',
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
        child2: {}
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
          { target: 'allowed', cond: 'isAllowed' },
          { target: 'denied', cond: 'isDenied' }
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
      on: {
        START: 'working'
      }
    },
    working: {
      initial: 'processing',
      states: {
        processing: {
          on: {
            PAUSE: 'paused',
            COMPLETE: '#complex.done'
          }
        },
        paused: {
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
      on: {
        RESET: 'idle'
      }
    }
  }
};

describe('Machine Visualizer', () => {
  describe('Basic Visualization', () => {
    test('should generate basic Mermaid diagram', () => {
      const machine = createMachine(simpleMachine);
      const diagram = machine.visualize();

      expect(diagram).toContain('stateDiagram-v2');
      expect(diagram).toContain('[*] --> idle');
      expect(diagram).toContain('idle --> running : START');
      expect(diagram).toContain('running --> done : FINISH');
      expect(isValidMermaidSyntax(diagram)).toBe(true);
    });

    test('should handle empty states', () => {
      const machine = createMachine({
        id: 'empty',
        initial: 'alone',
        states: {
          alone: {}
        }
      });
      const diagram = machine.visualize();

      expect(diagram).toContain('stateDiagram-v2');
      expect(diagram).toContain('[*] --> alone');
      // Should not crash with empty state
      expect(diagram).toBeDefined();
    });
  });

  describe('Visualization Options', () => {
    test('should support direction option', () => {
      const machine = createMachine(simpleMachine);
      const diagram = machine.visualize({ direction: 'LR' });

      expect(diagram).toContain('direction LR');
    });

    test('should always show guards when present', () => {
      const machine = createMachine(guardedMachine);
      const diagram = machine.visualize();

      expect(diagram).toContain('START [isAllowed]');
      expect(diagram).toContain('START [isDenied]');
    });
  });

  describe('Nested States', () => {
    test('should handle nested states', () => {
      const machine = createMachine(nestedMachine);
      const diagram = machine.visualize();

      expect(diagram).toContain('state parent {');
      expect(diagram).toContain('[*] --> child1');
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
            states: {
              level2: {
                initial: 'level3',
                states: {
                  level3: {}
                }
              }
            }
          }
        }
      };

      const machine = createMachine(deeplyNestedMachine);
      const diagram = machine.visualize();

      expect(diagram).toContain('state level1 {');
      expect(diagram).toContain('state level2 {');
      expect(diagram).toMatch(/\s+\}\s+\}/); // Two closing braces
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
      const diagram = machine.visualize();

      expect(diagram).not.toContain('idle --> any : *');
      expect(diagram).toContain('idle --> specific : SPECIFIC');
    });

    test('should handle ID references', () => {
      const machine = createMachine(complexMachine);
      const diagram = machine.visualize();

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
            on: {
              SELF: 'state1',
              NEXT: 'state2'
            }
          },
          state2: {}
        }
      };

      const machine = createMachine(selfTransitionMachine);
      const diagram = machine.visualize();

      expect(diagram).toContain('state1 --> state1 : SELF');
      expect(diagram).toContain('state1 --> state2 : NEXT');
    });

    test('should handle multiple transitions for same event', () => {
      const machine = createMachine(guardedMachine);
      const diagram = machine.visualize();

      // Should show both transitions for START event
      expect(diagram).toContain('idle --> allowed : START [isAllowed]');
      expect(diagram).toContain('idle --> denied : START [isDenied]');
    });
  });

  describe('Error Handling', () => {
    test('should default to mermaid type', () => {
      const machine = createMachine(simpleMachine);

      expect(() => machine.visualize()).not.toThrow();
      const diagram = machine.visualize();
      expect(diagram).toContain('stateDiagram-v2');
    });

    test('should throw for unsupported types', () => {
      const machine = createMachine(simpleMachine);

      expect(() => machine.visualize({ type: 'graphviz' })).toThrow(
        'Unsupported visualization type: graphviz'
      );
    });
  });
});