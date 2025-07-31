/**
 * API Exports Test Suite
 * Validates that the source exports the correct API surface for npm users
 */

const path = require('path');

describe('API Exports', () => {
  const srcPath = path.join(__dirname, '..', 'src', 'index.js');

  // Expected API surface
  const EXPECTED_EXPORTS = {
    functions: ['createMachine', 'action'],
    types: {
      createMachine: 'function',
      action: 'function'
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

    test('createMachine function signature', () => {
      const machine = srcModule.createMachine('test');
      
      // Check machine instance API
      expect(machine).toHaveProperty('name');
      expect(machine).toHaveProperty('state');
      expect(machine).toHaveProperty('initial');
      expect(machine).toHaveProperty('start');
      
      expect(typeof machine.state).toBe('function');
      expect(typeof machine.initial).toBe('function');
      expect(typeof machine.start).toBe('function');
      expect(machine.name).toBe('test');
    });

    test('state object API', () => {
      const machine = srcModule.createMachine('test');
      const state = machine.state('idle');
      
      expect(state).toHaveProperty('id');
      expect(state).toHaveProperty('on');
      expect(typeof state.on).toBe('function');
      expect(state.id).toBe('idle');
    });

    test('machine instance API', () => {
      const machine = srcModule.createMachine('test');
      const idle = machine.state('idle');
      machine.initial(idle);
      
      const instance = machine.start();
      
      expect(instance).toHaveProperty('current');
      expect(instance).toHaveProperty('context');
      expect(instance).toHaveProperty('send');
      
      expect(typeof instance.send).toBe('function');
      expect(typeof instance.context).toBe('object');
      expect(typeof instance.current).toBe('string');
    });

    test('action function signature', () => {
      const testAction = srcModule.action('test', (ctx) => {
        ctx.tested = true;
      });
      
      expect(testAction).toHaveProperty('actionName');
      expect(typeof testAction).toBe('function');
      expect(testAction.actionName).toBe('test');
    });

    test('action function execution', () => {
      const testAction = srcModule.action('test', (ctx, event) => {
        ctx.result = `Action executed with ${event.type}`;
        return ctx.result;
      });

      const mockContext = {};
      const mockEvent = { type: 'TEST_EVENT' };
      
      const result = testAction(mockContext, mockEvent);
      expect(mockContext.result).toBe('Action executed with TEST_EVENT');
    });
  });

  describe('Full Workflow Integration', () => {
    test('complete state machine workflow works', async () => {
      const srcModule = require(srcPath);
      
      const machine = srcModule.createMachine('workflow');
      
      const idle = machine.state('idle');
      const active = machine.state('active');
      const complete = machine.state('complete');
      
      const startAction = srcModule.action('start', (ctx) => {
        ctx.started = true;
      });
      
      const finishAction = srcModule.action('finish', (ctx) => {
        ctx.finished = true;
      });
      
      idle.on('START', active).do(startAction);
      active.on('FINISH', complete).do(finishAction);
      
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
      
      const testAction = srcModule.action('perf', (ctx) => {
        ctx.counter = (ctx.counter || 0) + 1;
      });
      
      s1.on('TOGGLE', s2).do(testAction);
      s2.on('TOGGLE', s1).do(testAction);
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