/**
 * Integration tests for TypeScript declarations
 * Tests that the type definitions work correctly with actual JavaScript code
 */

const { createMachine, action } = require('../dist/cjs/index.js');
const fs = require('fs');
const path = require('path');

describe('TypeScript Integration Tests', () => {
  
  test('TypeScript declarations file exists', () => {
    const typesPath = path.join(__dirname, '../types/index.d.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
    
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    expect(typesContent).toContain('export declare function createMachine');
    expect(typesContent).toContain('export declare function action');
    expect(typesContent).toContain('export declare class Machine');
    expect(typesContent).toContain('export declare class Instance');
  });

  test('TypeScript declarations are valid (syntax check)', () => {
    const typesPath = path.join(__dirname, '../types/index.d.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    
    // Basic syntax validation
    expect(typesContent).not.toContain('undefined');
    expect(typesContent).not.toContain('syntax error');
    
    // Check for proper export structure
    expect(typesContent).toContain('export declare function');
    expect(typesContent).toContain('export declare class');
    expect(typesContent).toContain('export interface');
    expect(typesContent).toContain('export type');
  });

  test('createMachine function signature matches TypeScript', () => {
    const machine = createMachine('test-machine');
    
    // Test that createMachine returns an object with expected methods
    expect(typeof machine.state).toBe('function');
    expect(typeof machine.initial).toBe('function');
    expect(typeof machine.on).toBe('function');
    expect(typeof machine.start).toBe('function');
    expect(typeof machine.findState).toBe('function');
    expect(typeof machine.getAllStates).toBe('function');
    expect(typeof machine.visualize).toBe('function');
    expect(typeof machine.visualizer).toBe('function');
    
    // Test chaining
    const result = machine.initial(machine.state('idle'));
    expect(result).toBe(machine);
  });

  test('action function signature matches TypeScript', () => {
    const testAction = action('test-action', (ctx) => {
      ctx.value = 'test';
    });
    
    expect(typeof testAction).toBe('function');
    expect(testAction.actionName).toBe('test-action');
    
    // Test async action
    const asyncAction = action('async-action', async (ctx) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { result: 'async' };
    });
    
    expect(typeof asyncAction).toBe('function');
    expect(asyncAction.actionName).toBe('async-action');
  });

  test('Machine API matches TypeScript declarations', () => {
    const machine = createMachine('api-test');
    
    // Test state creation
    const state1 = machine.state('state1');
    const state2 = machine.state('state2');
    
    expect(typeof state1.id).toBe('string');
    expect(state1.id).toBe('state1');
    
    // Test initial state
    machine.initial(state1);
    expect(machine.initialState).toBe(state1);
    
    // Test global transitions
    const globalTransition = machine.on('GLOBAL', state2);
    expect(typeof globalTransition.if).toBe('function');
    expect(typeof globalTransition.do).toBe('function');
    expect(typeof globalTransition.doAsync).toBe('function');
    expect(typeof globalTransition.fire).toBe('function');
    
    // Test state finding
    const foundState = machine.findState('state1');
    expect(foundState).toBe(state1);
    
    const notFoundState = machine.findState('nonexistent');
    expect(notFoundState).toBe(null);
  });

  test('State API matches TypeScript declarations', () => {
    const machine = createMachine('state-test');
    const parent = machine.state('parent');
    const child = parent.state('child');
    
    // Test hierarchy
    expect(child.parent).toBe(parent);
    expect(child.path).toBe('parent.child');
    expect(parent.children.has('child')).toBe(true);
    
    // Test initial child
    parent.initial(child);
    expect(parent.initialChild).toBe('child');
    
    // Test actions
    parent.enter((ctx) => { ctx.entered = true; });
    parent.exit((ctx) => { ctx.exited = true; });
    
    expect(parent.entryActions.length).toBe(1);
    expect(parent.exitActions.length).toBe(1);
    
    // Test transitions
    const transition = parent.on('TEST', child);
    expect(parent.transitions.has('TEST')).toBe(true);
    expect(parent.getTransitions('TEST')).toContain(transition);
  });

  test('Instance API matches TypeScript declarations', () => {
    const machine = createMachine('instance-test');
    const idle = machine.state('idle');
    const active = machine.state('active');
    
    idle.on('START', active);
    machine.initial(idle);
    
    const instance = machine.start({ count: 0 });
    
    // Test properties
    expect(instance.machine).toBe(machine);
    expect(typeof instance.context).toBe('object');
    expect(instance.context.count).toBe(0);
    expect(instance.current).toBe('idle');
    
    // Test methods
    expect(typeof instance.send).toBe('function');
    expect(typeof instance.subscribe).toBe('function');
    expect(typeof instance.history).toBe('function');
    expect(typeof instance.rollback).toBe('function');
    expect(typeof instance.visualize).toBe('function');
    expect(typeof instance.visualizer).toBe('function');
    
    // Test history interface
    const history = instance.history();
    expect(Array.isArray(history.entries)).toBe(true);
    expect(typeof history.size).toBe('number');
    expect(typeof history.maxSize).toBe('number');
  });

  test('Transition API matches TypeScript declarations', async () => {
    const machine = createMachine('transition-test');
    const from = machine.state('from');
    const to = machine.state('to');
    
    const transition = from.on('TEST', to);
    
    // Test method chaining
    const chainResult = transition
      .if((ctx) => ctx.ready === true)
      .do((ctx) => { ctx.processed = true; })
      .doAsync(async (ctx) => { 
        await new Promise(resolve => setTimeout(resolve, 1));
        return { async: true };
      })
      .fire((ctx) => { ctx.fired = true; });
    
    expect(chainResult).toBe(transition);
    
    // Test guard
    expect(transition.canTake({ ready: true }, { type: 'TEST' })).toBe(true);
    expect(transition.canTake({ ready: false }, { type: 'TEST' })).toBe(false);
    
    // Test action execution
    const context = { ready: true };
    const result = await transition.executeBlockingActions(context, { type: 'TEST' });
    
    expect(context.processed).toBe(true);
    expect(result.async).toBe(true);
  });

  test('History functionality matches TypeScript declarations', async () => {
    const machine = createMachine('history-test');
    const state1 = machine.state('state1');
    const state2 = machine.state('state2');
    
    state1.on('NEXT', state2);
    state2.on('BACK', state1);
    machine.initial(state1);
    
    const instance = machine.start({ step: 0 }, {
      history: { maxSize: 10, enableCompression: false }
    });
    
    // Test history interface
    const history = instance.history();
    expect(history.size).toBeGreaterThan(0);
    expect(history.current).toBeTruthy();
    
    // Test state transitions create history
    await instance.send('NEXT');
    const historyAfterTransition = instance.history();
    expect(historyAfterTransition.size).toBeGreaterThan(history.size);
    
    // Test rollback
    const entries = historyAfterTransition.entries;
    if (entries.length > 1) {
      const targetEntry = entries[0];
      const canRollback = historyAfterTransition.canRollback(targetEntry);
      expect(typeof canRollback).toBe('boolean');
      
      if (canRollback) {
        const rollbackResult = await instance.rollback(targetEntry);
        expect(typeof rollbackResult.success).toBe('boolean');
      }
    }
  });

  test('Type exports are available', () => {
    // This test ensures the types can be imported in TypeScript
    // We can't directly test TypeScript types in Jest, but we can verify
    // the structure is correct for tools that consume the types
    
    const typesPath = path.join(__dirname, '../types/index.d.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    
    // Check for key type exports
    expect(typesContent).toContain('export interface BaseContext');
    expect(typesContent).toContain('export interface BaseEvent');
    expect(typesContent).toContain('export interface StateChangeEvent');
    expect(typesContent).toContain('export interface HistoryEntry');
    expect(typesContent).toContain('export interface History');
    expect(typesContent).toContain('export type EventPayload');
    
    // Check for generic support
    expect(typesContent).toContain('<TContext = BaseContext>');
    expect(typesContent).toContain('<TEvent = BaseEvent>');
    
    // Check for default export
    expect(typesContent).toContain('declare const _default');
    expect(typesContent).toContain('export default _default');
  });

  test('Package.json points to correct types file', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    expect(packageJson.types).toBe('dist/types/index.d.ts');
    expect(packageJson.files).toContain('types/');
  });

  test('Build scripts include type generation', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    expect(packageJson.scripts.build).toContain('build:types');
    expect(packageJson.scripts['build:types']).toBeDefined();
    expect(packageJson.scripts['build:types:validate']).toBeDefined();
  });

});