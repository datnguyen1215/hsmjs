/**
 * NPM Consumer Integration Test - Jest integration for npm consumer tests
 * Integrates npm consumer tests into the main test suite
 */

const path = require('path');
const { spawn } = require('child_process');
const __dirname = path.dirname(__filename);

describe('NPM Consumer Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  
  // Helper function to run npm consumer tests
  function runNpmConsumerTests() {
    return new Promise((resolve, reject) => {
      const proc = spawn('npm', ['run', 'test:npm-consumers'], {
        cwd: projectRoot,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => stdout += data.toString());
      proc.stderr.on('data', (data) => stderr += data.toString());
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`NPM consumer tests failed with code ${code}: ${stderr || stdout}`));
        }
      });
    });
  }

  describe('Integration Tests', () => {
    test('should run all npm consumer tests successfully', async () => {
      const result = await runNpmConsumerTests();
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('ALL TESTS PASSED!');
      expect(result.stdout).toContain('Tests Passed: 4/4');
      expect(result.stdout).toContain('Success Rate: 100.0%');
    }, 60000); // 60 second timeout for all consumer tests
    
    test('should validate all consumption patterns', async () => {
      const result = await runNpmConsumerTests();
      
      // Check that all consumer types passed
      expect(result.stdout).toContain('✅ PASSED browser-consumer');
      expect(result.stdout).toContain('✅ PASSED cjs-consumer');
      expect(result.stdout).toContain('✅ PASSED esm-consumer');
      expect(result.stdout).toContain('✅ PASSED typescript-consumer');
    }, 60000);
    
    test('should validate package architecture', async () => {
      const result = await runNpmConsumerTests();
      
      // Check architecture validation
      expect(result.stdout).toContain('✅ ESM Export: dist/esm/index.js');
      expect(result.stdout).toContain('✅ CJS Export: dist/cjs/index.js');
      expect(result.stdout).toContain('✅ UMD Export: dist/umd/hsmjs.min.js');
      expect(result.stdout).toContain('✅ TypeScript: dist/types/index.d.ts');
    }, 60000);
  });

  describe('Package.json Exports Validation', () => {
    test('should validate package.json exports configuration', () => {
      const fs = require('fs');
      const packageJsonText = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8');
      const packageJson = JSON.parse(packageJsonText);
      
      // Verify exports field exists and has correct structure
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();
      
      const mainExport = packageJson.exports['.'];
      expect(mainExport.types).toBe('./dist/types/index.d.ts');
      expect(mainExport.import).toBe('./dist/esm/index.js');
      expect(mainExport.require).toBe('./dist/cjs/index.js');
      expect(mainExport.browser).toBe('./dist/umd/hsmjs.min.js');
    });

    test('should validate legacy package.json fields', () => {
      const fs = require('fs');
      const packageJsonText = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8');
      const packageJson = JSON.parse(packageJsonText);
      
      expect(packageJson.main).toBe('dist/cjs/index.js');
      expect(packageJson.module).toBe('dist/esm/index.js');
      expect(packageJson.browser).toBe('dist/umd/hsmjs.min.js');
      expect(packageJson.types).toBe('dist/types/index.d.ts');
    });
  });

  describe('Consumer Compatibility Matrix', () => {
    test('should validate all consumption patterns work', async () => {
      const result = await runNpmConsumerTests();
      
      // Check that all expected consumers are tested and pass
      const expectedConsumers = [
        'browser-consumer',
        'cjs-consumer',
        'esm-consumer', 
        'typescript-consumer'
      ];
      
      expectedConsumers.forEach(consumer => {
        expect(result.stdout).toContain(`✅ PASSED ${consumer}`);
      });
    }, 60000);

    test('should verify dual package hazard mitigation', async () => {
      const result = await runNpmConsumerTests();
      
      // Both ESM and CJS consumers should work with the same package
      expect(result.stdout).toContain('✅ PASSED esm-consumer');
      expect(result.stdout).toContain('✅ PASSED cjs-consumer');
      
      // This validates that the dual package setup correctly serves
      // different formats to different consumers without conflicts
      expect(result.stdout).toContain('📦 Dual ESM/CJS Package Architecture: VALIDATED');
    }, 60000);
  });
});