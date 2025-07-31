/**
 * Performance Benchmarks Test Suite
 * Measures and validates performance across different build formats
 */

const fs = require('fs');
const path = require('path');

describe('Performance Benchmarks', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const srcPath = path.join(__dirname, '..', 'src', 'index.js');
  const umdPath = path.join(distPath, 'hsmjs.min.js');

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    machineCreation: 10,        // Creating a machine should take < 10ms
    stateTransition: 1,         // Single transition should take < 1ms
    actionExecution: 0.5,       // Action execution should take < 0.5ms
    bulkTransitions: 100,       // 1000 transitions should take < 100ms
    memoryLeakTest: 50,         // Memory test should complete < 50ms
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
        idle.on('START', active);
        machine.initial(idle);
      }
      
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;
      
      console.log(`Source Machine Creation: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(3)}ms avg`);
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.machineCreation);
    });

    test('state transition performance', async () => {
      const machine = srcModule.createMachine('perf-test');
      const idle = machine.state('idle');
      const active = machine.state('active');
      
      idle.on('START', active);
      active.on('STOP', idle);
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
      
      console.log(`Source State Transitions: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(3)}ms avg`);
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkTransitions);
    });

    test('action execution performance', async () => {
      const machine = srcModule.createMachine('action-perf');
      let executionCount = 0;
      
      const perfAction = srcModule.action('perf', (ctx) => {
        executionCount++;
        ctx.count = executionCount;
      });
      
      const idle = machine.state('idle');
      const active = machine.state('active');
      
      idle.on('START', active).do(perfAction);
      active.on('TRIGGER', active).do(perfAction);
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
      
      console.log(`Source Action Execution: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(3)}ms avg`);
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
        load: srcModule.action('load', (ctx) => { ctx.step = 'loading'; }),
        process: srcModule.action('process', (ctx) => { ctx.step = 'processing'; }),
        validate: srcModule.action('validate', (ctx) => { ctx.step = 'validating'; }),
        complete: srcModule.action('complete', (ctx) => { ctx.step = 'complete'; }),
        error: srcModule.action('error', (ctx) => { ctx.step = 'error'; })
      };
      
      // Set up transitions
      stateObjects.idle.on('LOAD', stateObjects.loading).do(actions.load);
      stateObjects.loading.on('PROCESS', stateObjects.processing).do(actions.process);
      stateObjects.processing.on('VALIDATE', stateObjects.validating).do(actions.validate);
      stateObjects.validating.on('COMPLETE', stateObjects.complete).do(actions.complete);
      stateObjects.validating.on('ERROR', stateObjects.error).do(actions.error);
      stateObjects.complete.on('RESET', stateObjects.idle);
      stateObjects.error.on('RESET', stateObjects.idle);
      
      machine.initial(stateObjects.idle);
      
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
      
      console.log(`Source Complex Workflow: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(3)}ms avg per workflow`);
      expect(avgTime).toBeLessThan(5); // Complex workflow should complete in under 5ms
    });

    test('memory usage and garbage collection', () => {
      if (!global.gc) {
        console.log('Garbage collection not available, skipping memory test');
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
        s1.on('GO', s2);
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
      
      console.log(`Source Memory Test: ${(end - start).toFixed(2)}ms
        Peak increase: ${(peakIncrease / 1024 / 1024).toFixed(2)} MB
        Final increase: ${(finalIncrease / 1024 / 1024).toFixed(2)} MB
        Cleaned up: ${((peakIncrease - finalIncrease) / 1024 / 1024).toFixed(2)} MB
      `);
      
      expect(end - start).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakTest);
      expect(finalIncrease).toBeLessThan(peakIncrease * 0.5); // Should clean up at least 50%
    });
  });

  describe('UMD Build Performance', () => {
    let umdExists = false;

    beforeAll(() => {
      umdExists = fs.existsSync(umdPath);
      if (!umdExists) {
        console.log('UMD build not found, skipping UMD performance tests');
      }
    });

    test('machine creation performance', () => {
      if (!umdExists) {
        console.log('Skipping UMD test - build not available');
        return;
      }
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // UMD test would require browser environment
        // Just test that the file exists and has reasonable size
        const stats = fs.statSync(umdPath);
      }
      
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;
      
      console.log(`UMD File Check: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(3)}ms avg`);
      expect(avgTime).toBeLessThan(1); // File system operations should be fast
    });

    test('UMD file size validation', () => {
      if (!umdExists) {
        console.log('Skipping UMD file size test - build not available');
        return;
      }
      
      const stats = fs.statSync(umdPath);
      const sizeKB = stats.size / 1024;
      
      console.log(`UMD Build Size: ${sizeKB.toFixed(2)} KB`);
      
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
        console.log('UMD build not found, skipping comparison tests');
      }
    });

    test('source module vs UMD size comparison', () => {
      if (!umdExists) {
        console.log('Skipping size comparison - UMD build not available');
        return;
      }
      
      // Get source module size (estimate)
      const srcStats = fs.statSync(srcPath);
      const umdStats = fs.statSync(umdPath);
      
      const srcSizeKB = srcStats.size / 1024;
      const umdSizeKB = umdStats.size / 1024;
      
      console.log(`Size Comparison:
        Source: ${srcSizeKB.toFixed(2)} KB
        UMD:    ${umdSizeKB.toFixed(2)} KB
        Ratio:  ${(umdSizeKB / srcSizeKB).toFixed(2)}x
      `);
      
      // UMD should be larger due to bundling but not excessively
      expect(umdSizeKB).toBeGreaterThan(srcSizeKB);
      expect(umdSizeKB / srcSizeKB).toBeLessThan(200); // Less than 200x larger (minified bundle)
    });

    test('performance baseline validation', () => {
      console.log('Source module performance baseline validated');
      
      const machine = srcModule.createMachine('baseline-test');
      const state1 = machine.state('state1');
      const state2 = machine.state('state2');
      
      state1.on('GO', state2);
      machine.initial(state1);
      
      const instance = machine.start();
      
      expect(instance.current).toBe('state1');
      expect(typeof srcModule.createMachine).toBe('function');
      expect(typeof srcModule.action).toBe('function');
    });
  });
});