/**
 * Build Formats Test Suite
 * Tests that all build formats (CJS, ESM) work correctly and export the same API
 */

const fs = require('fs');
const path = require('path');

describe('Build Formats', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const cjsPath = path.join(distPath, 'cjs', 'index.js');
  const esPath = path.join(distPath, 'es', 'index.js');

  beforeAll(() => {
    // Ensure build files exist
    expect(fs.existsSync(cjsPath)).toBeTruthy();
    expect(fs.existsSync(esPath)).toBeTruthy();
  });

  describe('CommonJS Build', () => {
    let cjsModule;

    beforeAll(() => {
      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(cjsPath)];
      cjsModule = require(cjsPath);
    });

    test('exports createMachine function', () => {
      expect(typeof cjsModule.createMachine).toBe('function');
    });

    test('exports action function', () => {
      expect(typeof cjsModule.action).toBe('function');
    });

    test('createMachine creates valid machine', () => {
      const machine = cjsModule.createMachine('test');
      expect(machine.name).toBe('test');
      expect(typeof machine.state).toBe('function');
      expect(typeof machine.initial).toBe('function');
      expect(typeof machine.start).toBe('function');
    });

    test('action helper works correctly', () => {
      const testAction = cjsModule.action('test', (ctx) => {
        ctx.tested = true;
      });
      expect(testAction.actionName).toBe('test');
      expect(typeof testAction.actionFn).toBe('function');
    });

    test('full workflow functionality', async () => {
      const machine = cjsModule.createMachine('workflow-test');
      const idle = machine.state('idle');
      const active = machine.state('active');
      
      idle.on('START', active);
      machine.initial(idle);
      
      const instance = machine.start();
      expect(instance.current).toBe('idle');
      
      await instance.send('START');
      expect(instance.current).toBe('active');
    });

    test('action execution in workflow', async () => {
      const machine = cjsModule.createMachine('action-test');
      let actionExecuted = false;
      
      const testAction = cjsModule.action('setFlag', (ctx) => {
        actionExecuted = true;
        ctx.flag = true;
      });
      
      const idle = machine.state('idle');
      const active = machine.state('active');
      
      idle.on('START', active, testAction);
      machine.initial(idle);
      
      const instance = machine.start();
      await instance.send('START');
      
      expect(actionExecuted).toBe(true);
      expect(instance.context.flag).toBe(true);
    });
  });

  describe('ES Module Build', () => {
    let esModule;

    beforeAll(async () => {
      // Dynamic import for ES modules
      esModule = await import(esPath);
    });

    test('exports createMachine function', () => {
      expect(typeof esModule.createMachine).toBe('function');
    });

    test('exports action function', () => {
      expect(typeof esModule.action).toBe('function');
    });

    test('createMachine creates valid machine', () => {
      const machine = esModule.createMachine('test');
      expect(machine.name).toBe('test');
      expect(typeof machine.state).toBe('function');
      expect(typeof machine.initial).toBe('function');
      expect(typeof machine.start).toBe('function');
    });

    test('action helper works correctly', () => {
      const testAction = esModule.action('test', (ctx) => {
        ctx.tested = true;
      });
      expect(testAction.actionName).toBe('test');
      expect(typeof testAction.actionFn).toBe('function');
    });

    test('full workflow functionality', async () => {
      const machine = esModule.createMachine('workflow-test');
      const idle = machine.state('idle');
      const active = machine.state('active');
      
      idle.on('START', active);
      machine.initial(idle);
      
      const instance = machine.start();
      expect(instance.current).toBe('idle');
      
      await instance.send('START');
      expect(instance.current).toBe('active');
    });

    test('action execution in workflow', async () => {
      const machine = esModule.createMachine('action-test');
      let actionExecuted = false;
      
      const testAction = esModule.action('setFlag', (ctx) => {
        actionExecuted = true;
        ctx.flag = true;
      });
      
      const idle = machine.state('idle');
      const active = machine.state('active');
      
      idle.on('START', active, testAction);
      machine.initial(idle);
      
      const instance = machine.start();
      await instance.send('START');
      
      expect(actionExecuted).toBe(true);
      expect(instance.context.flag).toBe(true);
    });
  });

  describe('Cross-Format Compatibility', () => {
    let cjsModule, esModule;

    beforeAll(async () => {
      cjsModule = require(cjsPath);
      esModule = await import(esPath);
    });

    test('both formats export same API', () => {
      const cjsKeys = Object.keys(cjsModule).sort();
      const esKeys = Object.keys(esModule).sort();
      expect(cjsKeys).toEqual(esKeys);
    });

    test('both formats create compatible machines', () => {
      const cjsMachine = cjsModule.createMachine('test');
      const esMachine = esModule.createMachine('test');
      
      expect(cjsMachine.name).toBe(esMachine.name);
      expect(typeof cjsMachine.state).toBe(typeof esMachine.state);
      expect(typeof cjsMachine.initial).toBe(typeof esMachine.initial);
      expect(typeof cjsMachine.start).toBe(typeof esMachine.start);
    });

    test('both formats create compatible actions', () => {
      const cjsAction = cjsModule.action('test', () => {});
      const esAction = esModule.action('test', () => {});
      
      expect(cjsAction.actionName).toBe(esAction.actionName);
      expect(typeof cjsAction.actionFn).toBe(typeof esAction.actionFn);
    });

    test('both formats produce same runtime behavior', async () => {
      // Test with CommonJS
      const cjsMachine = cjsModule.createMachine('compat-test');
      const cjsIdle = cjsMachine.state('idle');
      const cjsActive = cjsMachine.state('active');
      cjsIdle.on('START', cjsActive);
      cjsMachine.initial(cjsIdle);
      const cjsInstance = cjsMachine.start();
      await cjsInstance.send('START');
      
      // Test with ES modules
      const esMachine = esModule.createMachine('compat-test');
      const esIdle = esMachine.state('idle');
      const esActive = esMachine.state('active');
      esIdle.on('START', esActive);
      esMachine.initial(esIdle);
      const esInstance = esMachine.start();
      await esInstance.send('START');
      
      // Both should have same behavior
      expect(cjsInstance.current).toBe(esInstance.current);
      expect(cjsInstance.current).toBe('active');
    });
  });

  describe('Package.json Configuration', () => {
    test('dist directories have correct package.json files', () => {
      const cjsPkgPath = path.join(distPath, 'cjs', 'package.json');
      const esPkgPath = path.join(distPath, 'es', 'package.json');
      
      expect(fs.existsSync(cjsPkgPath)).toBeTruthy();
      expect(fs.existsSync(esPkgPath)).toBeTruthy();
      
      const cjsPkg = JSON.parse(fs.readFileSync(cjsPkgPath, 'utf8'));
      const esPkg = JSON.parse(fs.readFileSync(esPkgPath, 'utf8'));
      
      expect(cjsPkg.type).toBe('commonjs');
      expect(esPkg.type).toBe('module');
    });

    test('main package.json has correct exports', () => {
      const mainPkgPath = path.join(__dirname, '..', 'package.json');
      const mainPkg = JSON.parse(fs.readFileSync(mainPkgPath, 'utf8'));
      
      expect(mainPkg.main).toBe('dist/cjs/index.js');
      expect(mainPkg.module).toBe('dist/es/index.js');
      expect(mainPkg.exports).toEqual({
        '.': {
          import: './dist/es/index.js',
          require: './dist/cjs/index.js'
        }
      });
    });
  });

  describe('Build Integrity', () => {
    test('all required files exist in both builds', () => {
      const requiredFiles = [
        'index.js',
        'core/create-machine.js',
        'core/machine.js',
        'core/state.js',
        'core/transition.js',
        'core/history-manager.js',
        'core/circular-buffer.js',
        'actions/action.js',
        'instance/instance.js'
      ];

      requiredFiles.forEach(file => {
        const cjsFile = path.join(distPath, 'cjs', file);
        const esFile = path.join(distPath, 'es', file);
        
        expect(fs.existsSync(cjsFile)).toBeTruthy();
        expect(fs.existsSync(esFile)).toBeTruthy();
      });
    });

    test('build files are not empty', () => {
      const buildFiles = [
        path.join(distPath, 'cjs', 'index.js'),
        path.join(distPath, 'es', 'index.js')
      ];

      buildFiles.forEach(file => {
        const stats = fs.statSync(file);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });
});