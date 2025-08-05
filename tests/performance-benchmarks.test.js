/**
 * Performance Benchmarks Test Suite
 * Measures and validates performance across different build formats
 */

const fs = require('fs');
const path = require('path');

describe('Performance Benchmarks', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const srcPath = path.join(__dirname, '..', 'src', 'index.js');
  const umdPath = path.join(distPath, 'umd', 'hsmjs.min.js');

  // Performance thresholds (in milliseconds)
  // Adjusted for CI environment which can be 2-3x slower than local development
  const PERFORMANCE_THRESHOLDS = {
    machineCreation: 20,        // Creating a machine should take < 20ms (CI-friendly)
    stateTransition: 2,         // Single transition should take < 2ms (CI-friendly)
    actionExecution: 1,         // Action execution should take < 1ms (CI-friendly)
    bulkTransitions: 200,       // 1000 transitions should take < 200ms (CI-friendly)
    memoryLeakTest: 100,        // Memory test should complete < 100ms (CI-friendly)
  };

  describe('Source Module Performance', () => {
    let srcModule;

    beforeAll(() => {
      srcModule = require(srcPath);
    });

    test('machine creation performance', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const machine = srcModule.createMachine(`test-${i}`);
        const idle = machine.state('idle');
        const active = machine.state('active');
        idle.on('START', 'active');
        machine.initial(idle);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      // Performance metrics validated silently
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.machineCreation);
    });

    test('state transition performance', async () => {
      const machine = srcModule.createMachine('perf-test');
      const idle = machine.state('idle');
      const active = machine.state('active');

      idle.on('START', 'active');
      active.on('STOP', 'idle');
      machine.initial(idle);

      const instance = machine.start();
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await instance.send(i % 2 === 0 ? 'START' : 'STOP');
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      // Transition performance validated silently
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkTransitions);
    });

    test('action execution performance', async () => {
      const machine = srcModule.createMachine('action-perf');
      let executionCount = 0;

      const perfAction = (ctx) => {
        executionCount++;
        ctx.count = executionCount;
      };

      const idle = machine.state('idle');
      const active = machine.state('active');

      idle.on('START', 'active').do(perfAction);
      active.on('TRIGGER', 'active').do(perfAction);
      machine.initial(idle);

      const instance = machine.start();
      const iterations = 1000;
      const start = performance.now();

      await instance.send('START');
      for (let i = 0; i < iterations - 1; i++) {
        await instance.send('TRIGGER');
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      // Action performance validated silently
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.actionExecution);
      expect(executionCount).toBe(iterations);
    });

    test('complex workflow performance', async () => {
      const machine = srcModule.createMachine('complex-workflow');

      // Create a complex state machine with multiple states and actions
      const states = ['idle', 'loading', 'processing', 'validating', 'complete', 'error'];
      const stateObjects = {};

      states.forEach(stateName => {
        stateObjects[stateName] = machine.state(stateName);
      });

      // Create actions
      const actions = {
        load: (ctx) => { ctx.step = 'loading'; },
        process: (ctx) => { ctx.step = 'processing'; },
        validate: (ctx) => { ctx.step = 'validating'; },
        complete: (ctx) => { ctx.step = 'complete'; },
        error: (ctx) => { ctx.step = 'error'; }
      };

      // Set up transitions
      stateObjects.idle.on('LOAD', 'loading').do(actions.load);
      stateObjects.loading.on('PROCESS', 'processing').do(actions.process);
      stateObjects.processing.on('VALIDATE', 'validating').do(actions.validate);
      stateObjects.validating.on('COMPLETE', 'complete').do(actions.complete);
      stateObjects.validating.on('ERROR', 'error').do(actions.error);
      stateObjects.complete.on('RESET', 'idle');
      stateObjects.error.on('RESET', 'idle');

      machine.initial('idle');

      const instance = machine.start();
      const iterations = 200;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await instance.send('LOAD');
        await instance.send('PROCESS');
        await instance.send('VALIDATE');

        if (i % 10 === 0) {
          await instance.send('ERROR');
        } else {
          await instance.send('COMPLETE');
        }

        await instance.send('RESET');
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      // Workflow performance validated silently
      expect(avgTime).toBeLessThan(5); // Complex workflow should complete in under 5ms
    });

    test('memory usage and garbage collection', () => {
      if (!global.gc) {

        return;
      }

      const initialMemory = process.memoryUsage().heapUsed;
      const machines = [];

      const start = performance.now();

      // Create many machines
      for (let i = 0; i < 1000; i++) {
        const machine = srcModule.createMachine(`memory-test-${i}`);
        const s1 = machine.state('s1');
        const s2 = machine.state('s2');
        s1.on('GO', 's2');
        machine.initial(s1);
        machines.push(machine.start());
      }

      const midMemory = process.memoryUsage().heapUsed;

      // Clear references
      machines.length = 0;
      global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const end = performance.now();

      const peakIncrease = midMemory - initialMemory;
      const finalIncrease = finalMemory - initialMemory;


      expect(end - start).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakTest);
      expect(finalIncrease).toBeLessThan(peakIncrease * 0.5); // Should clean up at least 50%
    });
  });

  describe('UMD Build Performance', () => {
    let umdExists = false;

    beforeAll(() => {
      umdExists = fs.existsSync(umdPath);
      if (!umdExists) {

      }
    });


    test('UMD file size validation', () => {
      if (!umdExists) {

        return;
      }

      const stats = fs.statSync(umdPath);
      const sizeKB = stats.size / 1024;



      // Should be reasonable size for minified UMD
      expect(sizeKB).toBeGreaterThan(10); // At least 10KB
      expect(sizeKB).toBeLessThan(100);   // Less than 100KB
    });
  });

  describe('Source vs UMD Comparison', () => {
    let srcModule;
    let umdExists = false;

    beforeAll(() => {
      srcModule = require(srcPath);
      umdExists = fs.existsSync(umdPath);
      if (!umdExists) {

      }
    });


    test('performance baseline validation', () => {


      const machine = srcModule.createMachine('baseline-test');
      const state1 = machine.state('state1');
      const state2 = machine.state('state2');

      state1.on('GO', 'state2');
      machine.initial(state1);

      const instance = machine.start();

      expect(instance.current).toBe('state1');
      expect(typeof srcModule.createMachine).toBe('function');
    });
  });
});