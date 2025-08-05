/**
 * API Exports Test Suite
 * Validates that the source exports the correct API surface for npm users
 */

const path = require('path');

describe('API Exports', () => {
  const srcPath = path.join(__dirname, '..', 'src', 'index.js');

  // Expected API surface
  const EXPECTED_EXPORTS = {
    functions: ['createMachine'],
    types: {
      createMachine: 'function'
    }
  };

  describe('Source Exports (NPM Users)', () => {
    let srcModule;

    beforeAll(() => {
      // Clear require cache
      delete require.cache[require.resolve(srcPath)];
      srcModule = require(srcPath);
    });

    test('exports all expected functions', () => {
      EXPECTED_EXPORTS.functions.forEach(funcName => {
        expect(srcModule).toHaveProperty(funcName);
        expect(typeof srcModule[funcName]).toBe(EXPECTED_EXPORTS.types[funcName]);
      });
    });

    test('does not export unexpected properties', () => {
      const exportedKeys = Object.keys(srcModule);
      const unexpectedKeys = exportedKeys.filter(key =>
        !EXPECTED_EXPORTS.functions.includes(key)
      );

      expect(unexpectedKeys).toEqual([]);
    });




  });

  describe('Full Workflow Integration', () => {
    test('complete state machine workflow works', async () => {
      const srcModule = require(srcPath);

      const machine = srcModule.createMachine('workflow');

      const idle = machine.state('idle');
      const active = machine.state('active');
      const complete = machine.state('complete');

      const startAction = (ctx) => {
        ctx.started = true;
      };

      const finishAction = (ctx) => {
        ctx.finished = true;
      };

      idle.on('START', 'active').do(startAction);
      active.on('FINISH', 'complete').do(finishAction);

      machine.initial(idle);

      const instance = machine.start();
      expect(instance.current).toBe('idle');

      await instance.send('START');
      expect(instance.current).toBe('active');
      expect(instance.context.started).toBe(true);

      await instance.send('FINISH');
      expect(instance.current).toBe('complete');
      expect(instance.context.finished).toBe(true);
    });

    test('error handling works correctly', async () => {
      const srcModule = require(srcPath);

      const machine = srcModule.createMachine('error-test');
      const state1 = machine.state('state1');
      machine.initial(state1);
      const instance = machine.start();

      // Sending event with no valid transition should not throw
      // (based on typical state machine behavior)
      await expect(instance.send('NONEXISTENT')).resolves.not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    test('API has reasonable performance', async () => {
      const srcModule = require(srcPath);

      const machine = srcModule.createMachine('perf-test');
      const s1 = machine.state('s1');
      const s2 = machine.state('s2');

      const testAction = (ctx) => {
        ctx.counter = (ctx.counter || 0) + 1;
      };

      s1.on('TOGGLE', 's2').do(testAction);
      s2.on('TOGGLE', 's1').do(testAction);
      machine.initial(s1);

      const instance = machine.start();

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await instance.send('TOGGLE');
      }

      const end = performance.now();
      const time = end - start;

      // Should complete 100 transitions in reasonable time (under 100ms)
      expect(time).toBeLessThan(100);
      expect(instance.context.counter).toBe(iterations);


    });
  });
});