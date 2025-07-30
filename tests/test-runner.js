#!/usr/bin/env node

/**
 * Comprehensive Test Runner for HSMJS Build Testing
 * Handles Jest tests, browser tests, and ES module validation
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

class TestRunner {
  constructor() {
    this.results = {
      jest: { passed: 0, failed: 0, skipped: 0 },
      browser: { status: 'pending' },
      esModules: { status: 'pending' },
      totalTests: 0,
      startTime: Date.now()
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      debug: '🐛'
    }[level] || 'ℹ️';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runJestTests() {
    this.log('Running Jest test suite...', 'info');
    
    try {
      const result = execSync('npm test', { 
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.log('Jest tests completed successfully', 'success');
      
      // Parse Jest output for statistics
      const lines = result.split('\n');
      const testSummary = lines.find(line => line.includes('Tests:'));
      if (testSummary) {
        const match = testSummary.match(/(\d+) passed/);
        if (match) this.results.jest.passed = parseInt(match[1]);
      }
      
      this.results.jest.status = 'passed';
      return true;
      
    } catch (error) {
      this.log(`Jest tests failed: ${error.message}`, 'error');
      
      // Try to extract test statistics from error output
      const output = error.stdout || error.message;
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      
      if (passedMatch) this.results.jest.passed = parseInt(passedMatch[1]);
      if (failedMatch) this.results.jest.failed = parseInt(failedMatch[1]);
      
      this.results.jest.status = 'failed';
      return false;
    }
  }

  async testESModuleImports() {
    this.log('Testing ES module imports directly...', 'info');
    
    const esTestScript = `
      import { createMachine, action } from './dist/es/index.js';
      
      console.log('✅ ES import successful');
      
      const machine = createMachine('es-test');
      const idle = machine.state('idle');
      const active = machine.state('active');
      
      idle.on('START', active);
      machine.initial(idle);
      
      const instance = machine.start();
      console.log('✅ ES machine creation successful');
      
      await instance.send('START');
      console.log('✅ ES state transition successful');
      
      const testAction = action('test', (ctx) => {
        ctx.tested = true;
      });
      console.log('✅ ES action creation successful');
      
      console.log('🎉 All ES module tests passed!');
    `;

    const testFile = path.join(__dirname, '..', 'es-module-test.mjs');
    
    try {
      fs.writeFileSync(testFile, esTestScript);
      
      const result = execSync(`node ${testFile}`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      });
      
      this.log('ES module tests passed', 'success');
      this.results.esModules.status = 'passed';
      
      // Clean up
      fs.unlinkSync(testFile);
      return true;
      
    } catch (error) {
      this.log(`ES module tests failed: ${error.message}`, 'error');
      this.results.esModules.status = 'failed';
      
      // Clean up
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      return false;
    }
  }

  async validateBrowserTest() {
    this.log('Validating browser test file...', 'info');
    
    const browserTestPath = path.join(__dirname, 'browser', 'umd-test.html');
    
    if (!fs.existsSync(browserTestPath)) {
      this.log('Browser test file not found', 'error');
      this.results.browser.status = 'failed';
      return false;
    }
    
    const content = fs.readFileSync(browserTestPath, 'utf8');
    
    // Check if it contains the required test structure
    const requiredElements = [
      'ES6 modules are supported',
      'import(../../dist/es/index.js)',
      'createMachine',
      'action',
      'test-results',
      'summary'
    ];
    
    const missing = requiredElements.filter(element => !content.includes(element));
    
    if (missing.length > 0) {
      this.log(`Browser test missing elements: ${missing.join(', ')}`, 'error');
      this.results.browser.status = 'failed';
      return false;
    }
    
    this.log('Browser test file validation passed', 'success');
    this.results.browser.status = 'validated';
    
    // Provide instructions for manual testing
    this.log('To test in browser, open: ' + browserTestPath, 'info');
    this.log('Or serve with: npx serve tests/browser', 'info');
    
    return true;
  }

  async runBuildSizeBenchmarks() {
    this.log('Running build size benchmarks...', 'info');
    
    const distPath = path.join(__dirname, '..', 'dist');
    const cjsPath = path.join(distPath, 'cjs', 'index.js');
    const esPath = path.join(distPath, 'es', 'index.js');
    
    if (!fs.existsSync(cjsPath) || !fs.existsSync(esPath)) {
      this.log('Build files not found. Run npm run build first.', 'error');
      return false;
    }
    
    const cjsStats = fs.statSync(cjsPath);
    const esStats = fs.statSync(esPath);
    
    const { gzipSync } = require('zlib');
    const cjsGzipped = gzipSync(fs.readFileSync(cjsPath));
    const esGzipped = gzipSync(fs.readFileSync(esPath));
    
    this.log(`📊 Build Size Report:
      CJS Bundle: ${cjsStats.size} bytes (${(cjsStats.size / 1024).toFixed(2)} KB)
      ES Bundle:  ${esStats.size} bytes (${(esStats.size / 1024).toFixed(2)} KB)
      
      CJS Gzipped: ${cjsGzipped.length} bytes (${(cjsGzipped.length / 1024).toFixed(2)} KB)
      ES Gzipped:  ${esGzipped.length} bytes (${(esGzipped.length / 1024).toFixed(2)} KB)
      
      Compression Ratios:
      CJS: ${((cjsGzipped.length / cjsStats.size) * 100).toFixed(1)}%
      ES:  ${((esGzipped.length / esStats.size) * 100).toFixed(1)}%
    `, 'info');
    
    // Benchmarks
    const benchmarks = {
      cjsUnderLimit: cjsStats.size < 1000,
      esUnderLimit: esStats.size < 500,
      esSmaller: esStats.size < cjsStats.size,
      goodCompression: (cjsGzipped.length / cjsStats.size) < 0.6
    };
    
    const passed = Object.values(benchmarks).filter(Boolean).length;
    const total = Object.keys(benchmarks).length;
    
    this.log(`Size benchmarks: ${passed}/${total} passed`, passed === total ? 'success' : 'warning');
    
    return passed === total;
  }

  async generateReport() {
    const duration = Date.now() - this.results.startTime;
    
    this.log('📋 Test Summary Report', 'info');
    this.log('=' * 50, 'info');
    
    this.log(`Jest Tests: ${this.results.jest.status}`, 
      this.results.jest.status === 'passed' ? 'success' : 'error');
    
    if (this.results.jest.passed > 0) {
      this.log(`  - Passed: ${this.results.jest.passed}`, 'success');
    }
    if (this.results.jest.failed > 0) {
      this.log(`  - Failed: ${this.results.jest.failed}`, 'error');
    }
    
    this.log(`ES Modules: ${this.results.esModules.status}`, 
      this.results.esModules.status === 'passed' ? 'success' : 'error');
    
    this.log(`Browser Tests: ${this.results.browser.status}`, 
      this.results.browser.status === 'validated' ? 'success' : 'warning');
    
    this.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`, 'info');
    
    // Overall status
    const allPassed = this.results.jest.status !== 'failed' && 
                     this.results.esModules.status === 'passed' &&
                     this.results.browser.status === 'validated';
    
    this.log(`Overall Status: ${allPassed ? 'PASSED' : 'FAILED'}`, 
      allPassed ? 'success' : 'error');
    
    return allPassed;
  }

  async run() {
    this.log('🚀 Starting comprehensive test suite', 'info');
    
    const tasks = [
      { name: 'Jest Tests', fn: () => this.runJestTests() },
      { name: 'ES Module Tests', fn: () => this.testESModuleImports() },
      { name: 'Browser Test Validation', fn: () => this.validateBrowserTest() },
      { name: 'Build Size Benchmarks', fn: () => this.runBuildSizeBenchmarks() }
    ];
    
    let allPassed = true;
    
    for (const task of tasks) {
      this.log(`Running ${task.name}...`, 'info');
      
      try {
        const passed = await task.fn();
        if (!passed) allPassed = false;
      } catch (error) {
        this.log(`${task.name} threw error: ${error.message}`, 'error');
        allPassed = false;
      }
    }
    
    return await this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;