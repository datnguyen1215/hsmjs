/**
 * API Exports Test Suite
 * Validates that each build format exports the correct API surface
 */

const fs = require('fs');
const path = require('path');

describe('API Exports', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const cjsPath = path.join(distPath, 'cjs', 'index.js');
  const esPath = path.join(distPath, 'es', 'index.js');

  // Expected API surface
  const EXPECTED_EXPORTS = {
    functions: ['createMachine', 'action'],
    types: {
      createMachine: 'function',
      action: 'function'
    }
  };

  describe('CommonJS Exports', () => {
    let cjsModule;

    beforeAll(() => {
      // Clear require cache
      delete require.cache[require.resolve(cjsPath)];
      cjsModule = require(cjsPath);
    });

    test('exports all expected functions', () => {
      EXPECTED_EXPORTS.functions.forEach(funcName => {
        expect(cjsModule).toHaveProperty(funcName);
        expect(typeof cjsModule[funcName]).toBe(EXPECTED_EXPORTS.types[funcName]);
      });
    });

    test('does not export unexpected properties', () => {
      const exportedKeys = Object.keys(cjsModule);
      const unexpectedKeys = exportedKeys.filter(key => 
        !EXPECTED_EXPORTS.functions.includes(key)
      );

      expect(unexpectedKeys).toEqual([]);
    });

    test('createMachine function signature', () => {
      const machine = cjsModule.createMachine('test');
      
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
      const machine = cjsModule.createMachine('test');
      const state = machine.state('idle');
      
      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('on');
      expect(typeof state.on).toBe('function');
      expect(state.name).toBe('idle');
    });

    test('machine instance API', () => {
      const machine = cjsModule.createMachine('test');
      const idle = machine.state('idle');
      machine.initial(idle);
      
      const instance = machine.start();
      
      expect(instance).toHaveProperty('current');
      expect(instance).toHaveProperty('context');
      expect(instance).toHaveProperty('send');
      expect(instance).toHaveProperty('stop');
      
      expect(typeof instance.send).toBe('function');
      expect(typeof instance.stop).toBe('function');
      expect(typeof instance.context).toBe('object');
      expect(typeof instance.current).toBe('string');
    });

    test('action function signature', () => {
      const testAction = cjsModule.action('test', (ctx) => {
        ctx.tested = true;
      });
      
      expect(testAction).toHaveProperty('actionName');
      expect(testAction).toHaveProperty('actionFn');
      expect(testAction.actionName).toBe('test');
      expect(typeof testAction.actionFn).toBe('function');
    });

    test('action function execution', () => {
      const testAction = cjsModule.action('test', (ctx, event) => {
        ctx.result = `Action executed with ${event.type}`;
        return ctx.result;
      });

      const mockContext = {};
      const mockEvent = { type: 'TEST_EVENT' };
      
      const result = testAction.actionFn(mockContext, mockEvent);
      expect(mockContext.result).toBe('Action executed with TEST_EVENT');
    });
  });

  describe('ES Module Exports', () => {
    let esModule;

    beforeAll(async () => {
      esModule = await import(esPath);
    });

    test('exports all expected functions', () => {
      EXPECTED_EXPORTS.functions.forEach(funcName => {
        expect(esModule).toHaveProperty(funcName);
        expect(typeof esModule[funcName]).toBe(EXPECTED_EXPORTS.types[funcName]);
      });
    });

    test('does not export unexpected properties', () => {
      const exportedKeys = Object.keys(esModule);
      const unexpectedKeys = exportedKeys.filter(key => 
        !EXPECTED_EXPORTS.functions.includes(key)
      );

      expect(unexpectedKeys).toEqual([]);
    });

    test('createMachine function signature', () => {
      const machine = esModule.createMachine('test');
      
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
      const machine = esModule.createMachine('test');
      const state = machine.state('idle');
      
      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('on');
      expect(typeof state.on).toBe('function');
      expect(state.name).toBe('idle');
    });

    test('machine instance API', () => {
      const machine = esModule.createMachine('test');
      const idle = machine.state('idle');
      machine.initial(idle);
      
      const instance = machine.start();
      
      expect(instance).toHaveProperty('current');
      expect(instance).toHaveProperty('context');
      expect(instance).toHaveProperty('send');
      expect(instance).toHaveProperty('stop');
      
      expect(typeof instance.send).toBe('function');
      expect(typeof instance.stop).toBe('function');
      expect(typeof instance.context).toBe('object');
      expect(typeof instance.current).toBe('string');
    });

    test('action function signature', () => {
      const testAction = esModule.action('test', (ctx) => {
        ctx.tested = true;
      });
      
      expect(testAction).toHaveProperty('actionName');
      expect(testAction).toHaveProperty('actionFn');
      expect(testAction.actionName).toBe('test');
      expect(typeof testAction.actionFn).toBe('function');
    });
  });

  describe('Cross-Format API Consistency', () => {
    let cjsModule, esModule;

    beforeAll(async () => {
      cjsModule = require(cjsPath);
      esModule = await import(esPath);
    });

    test('both formats export identical API surface', () => {
      const cjsKeys = Object.keys(cjsModule).sort();
      const esKeys = Object.keys(esModule).sort();
      
      expect(cjsKeys).toEqual(esKeys);
    });

    test('function signatures are consistent', () => {
      // Test createMachine
      expect(cjsModule.createMachine.length).toBe(esModule.createMachine.length);
      expect(cjsModule.action.length).toBe(esModule.action.length);
    });

    test('createMachine produces consistent API', () => {
      const cjsMachine = cjsModule.createMachine('test');
      const esMachine = esModule.createMachine('test');
      
      const cjsProps = Object.keys(cjsMachine).sort();
      const esProps = Object.keys(esMachine).sort();
      
      expect(cjsProps).toEqual(esProps);
    });

    test('state objects have consistent API', () => {
      const cjsMachine = cjsModule.createMachine('test');
      const esMachine = esModule.createMachine('test');
      
      const cjsState = cjsMachine.state('idle');
      const esState = esMachine.state('idle');
      
      const cjsStateProps = Object.keys(cjsState).sort();
      const esStateProps = Object.keys(esState).sort();
      
      expect(cjsStateProps).toEqual(esStateProps);
    });

    test('machine instances have consistent API', () => {
      const cjsMachine = cjsModule.createMachine('test');
      const esMachine = esModule.createMachine('test');
      
      cjsMachine.initial(cjsMachine.state('idle'));
      esMachine.initial(esMachine.state('idle'));
      
      const cjsInstance = cjsMachine.start();
      const esInstance = esMachine.start();
      
      const cjsInstanceProps = Object.keys(cjsInstance).sort();
      const esInstanceProps = Object.keys(esInstance).sort();
      
      expect(cjsInstanceProps).toEqual(esInstanceProps);
    });

    test('action objects have consistent API', () => {
      const cjsAction = cjsModule.action('test', () => {});
      const esAction = esModule.action('test', () => {});
      
      const cjsActionProps = Object.keys(cjsAction).sort();
      const esActionProps = Object.keys(esAction).sort();
      
      expect(cjsActionProps).toEqual(esActionProps);
    });
  });

  describe('API Behavioral Consistency', () => {
    test('createMachine behaves identically', async () => {
      const runWorkflow = async (createMachine, action) => {
        const machine = createMachine('workflow');
        
        const idle = machine.state('idle');
        const active = machine.state('active');
        const complete = machine.state('complete');
        
        const startAction = action('start', (ctx) => {
          ctx.started = true;
        });
        
        const finishAction = action('finish', (ctx) => {
          ctx.finished = true;
        });
        
        idle.on('START', active, startAction);
        active.on('FINISH', complete, finishAction);
        
        machine.initial(idle);
        
        const instance = machine.start();
        
        await instance.send('START');
        await instance.send('FINISH');
        
        return {
          current: instance.current,
          context: instance.context
        };
      };

      const cjsModule = require(cjsPath);
      const esModule = await import(esPath);
      
      const cjsResult = await runWorkflow(cjsModule.createMachine, cjsModule.action);
      const esResult = await runWorkflow(esModule.createMachine, esModule.action);
      
      expect(cjsResult.current).toBe(esResult.current);
      expect(cjsResult.context).toEqual(esResult.context);
    });

    test('action execution is identical', () => {
      const testActionExecution = (action) => {
        const testAction = action('test', (ctx, event) => {
          ctx.count = (ctx.count || 0) + 1;
          ctx.lastEvent = event.type;
          return `Executed ${event.type}`;
        });

        const context = { count: 0 };
        const event = { type: 'TEST' };
        
        const result = testAction.actionFn(context, event);
        
        return { context, result };
      };

      const cjsModule = require(cjsPath);
      const esModule = esModule;
      
      const cjsResult = testActionExecution(cjsModule.action);
      const esResult = testActionExecution(esModule.action);
      
      expect(cjsResult.context).toEqual(esResult.context);
      expect(cjsResult.result).toEqual(esResult.result);
    });
  });

  describe('Error Handling Consistency', () => {
    test('invalid arguments produce consistent errors', () => {
      const cjsModule = require(cjsPath);
      const esModule = esModule;
      
      // Test invalid machine names
      expect(() => cjsModule.createMachine()).toThrow();
      expect(() => esModule.createMachine()).toThrow();
      
      // Test invalid action parameters
      expect(() => cjsModule.action()).toThrow();
      expect(() => esModule.action()).toThrow();
    });

    test('runtime errors are consistent', async () => {
      const testRuntimeError = async (createMachine) => {
        const machine = createMachine('error-test');
        const state1 = machine.state('state1');
        machine.initial(state1);
        const instance = machine.start();
        
        // Send event to non-existent transition
        try {
          await instance.send('NONEXISTENT');
          return 'no-error';
        } catch (e) {
          return e.constructor.name;
        }
      };

      const cjsModule = require(cjsPath);
      const esModule = esModule;
      
      const cjsError = await testRuntimeError(cjsModule.createMachine);
      const esError = await testRuntimeError(esModule.createMachine);
      
      expect(cjsError).toBe(esError);
    });
  });

  describe('Performance Consistency', () => {
    test('both formats have similar performance characteristics', async () => {
      const measurePerformance = async (createMachine, action) => {
        const machine = createMachine('perf-test');
        const s1 = machine.state('s1');
        const s2 = machine.state('s2');
        
        const testAction = action('perf', (ctx) => {
          ctx.counter = (ctx.counter || 0) + 1;
        });
        
        s1.on('TOGGLE', s2, testAction);
        s2.on('TOGGLE', s1, testAction);
        machine.initial(s1);
        
        const instance = machine.start();
        
        const iterations = 1000;
        const start = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          await instance.send('TOGGLE');
        }
        
        const end = performance.now();
        return end - start;
      };

      const cjsModule = require(cjsPath);
      const esModule = esModule;
      
      const cjsTime = await measurePerformance(cjsModule.createMachine, cjsModule.action);
      const esTime = await measurePerformance(esModule.createMachine, esModule.action);
      
      // Performance should be within 20% of each other
      const ratio = Math.max(cjsTime, esTime) / Math.min(cjsTime, esTime);
      expect(ratio).toBeLessThan(1.2);
      
      console.log(`Performance comparison:
        CJS: ${cjsTime.toFixed(2)}ms
        ES:  ${esTime.toFixed(2)}ms
        Ratio: ${ratio.toFixed(2)}x
      `);
    });
  });
});