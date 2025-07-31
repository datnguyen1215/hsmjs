#!/usr/bin/env node

/**
 * NPM Consumer Test Runner - Automated testing for dual ESM/CJS package architecture
 * Simulates npm install and tests all consumption patterns
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NPMConsumerTestRunner {
  constructor() {
    // Navigate from tests/npm-consumers/ to project root
    this.testDir = __dirname;
    this.projectRoot = path.resolve(__dirname, '../..');
    this.consumers = ['esm-consumer', 'cjs-consumer', 'typescript-consumer'];
    this.results = {};
    this.startTime = performance.now();
  }

  log(message, type = 'info') {
    // Completely silent - no output during execution
  }

  async execAsync(command, cwd = this.projectRoot, options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', command], {
        cwd,
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.stderr.on('data', (data) => stderr += data.toString());
      }

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });
    });
  }

  async checkPrerequisites() {
    this.log('🔍 Checking Prerequisites', 'progress');
    
    // Check if dist directory exists
    const distPath = path.join(this.projectRoot, 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('dist/ directory not found. Run "npm run build" first.');
    }

    // Check required dist formats
    const requiredPaths = [
      'dist/cjs/index.js',
      'dist/esm/index.js', 
      'dist/umd/hsmjs.min.js',
      'dist/types/index.d.ts'
    ];

    for (const reqPath of requiredPaths) {
      const fullPath = path.join(this.projectRoot, reqPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Required build artifact missing: ${reqPath}`);
      }
    }

    this.log('✅ All prerequisites met', 'success');
  }

  async setupConsumerEnvironments() {
    this.log('🏗️ Setting up Consumer Environments', 'progress');
    
    for (const consumer of this.consumers) {
      const consumerPath = path.join(this.testDir, consumer);
      
      try {
        // Create node_modules directory if it doesn't exist
        const nodeModulesPath = path.join(consumerPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          fs.mkdirSync(nodeModulesPath, { recursive: true });
        }

        // Create package directory
        const packagePath = path.join(nodeModulesPath, '@datnguyen1215');
        if (!fs.existsSync(packagePath)) {
          fs.mkdirSync(packagePath, { recursive: true });
        }

        // Create symlink to project root (simulates npm install)
        const linkPath = path.join(packagePath, 'hsmjs');
        if (fs.existsSync(linkPath)) {
          fs.unlinkSync(linkPath);
        }
        
        fs.symlinkSync(this.projectRoot, linkPath, 'dir');
        
        this.log(`  📦 Linked package for ${consumer}`, 'success');
        
      } catch (error) {
        this.log(`  ❌ Failed to setup ${consumer}: ${error.message}`, 'error');
        throw error;
      }
    }
  }

  async runESMConsumerTest() {
    this.log('🔄 Running ESM Consumer Test', 'progress');
    const startTime = performance.now();
    
    try {
      const consumerPath = path.join(this.testDir, 'esm-consumer');
      const result = await this.execAsync('npm test', consumerPath, { silent: true });
      
      const duration = performance.now() - startTime;
      this.results['esm-consumer'] = {
        passed: true,
        duration,
        output: result.stdout
      };
      
      this.log(`✅ ESM Consumer Test passed (${duration.toFixed(2)}ms)`, 'success');
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results['esm-consumer'] = {
        passed: false,
        duration,
        error: error.message
      };
      
      this.log(`❌ ESM Consumer Test failed: ${error.message}`, 'error');
    }
  }

  async runCJSConsumerTest() {
    this.log('🔄 Running CJS Consumer Test', 'progress');
    const startTime = performance.now();
    
    try {
      const consumerPath = path.join(this.testDir, 'cjs-consumer');
      const result = await this.execAsync('npm test', consumerPath, { silent: true });
      
      const duration = performance.now() - startTime;
      this.results['cjs-consumer'] = {
        passed: true,
        duration,
        output: result.stdout
      };
      
      this.log(`✅ CJS Consumer Test passed (${duration.toFixed(2)}ms)`, 'success');
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results['cjs-consumer'] = {
        passed: false,
        duration,
        error: error.message
      };
      
      this.log(`❌ CJS Consumer Test failed: ${error.message}`, 'error');
    }
  }

  async runTypeScriptConsumerTest() {
    this.log('🔄 Running TypeScript Consumer Test', 'progress');
    const startTime = performance.now();
    
    try {
      const consumerPath = path.join(this.testDir, 'typescript-consumer');
      
      // First check if TypeScript and ts-node are available
      try {
        await this.execAsync('npx tsc --version', consumerPath, { silent: true });
      } catch (error) {
        // Install dependencies if needed
        this.log('  📦 Installing TypeScript dependencies...', 'progress');
        await this.execAsync('npm install', consumerPath, { silent: true });
      }
      
      const result = await this.execAsync('npm run test:compile && npm run test:run', consumerPath, { silent: true });
      
      const duration = performance.now() - startTime;
      this.results['typescript-consumer'] = {
        passed: true,
        duration,
        output: result.stdout
      };
      
      this.log(`✅ TypeScript Consumer Test passed (${duration.toFixed(2)}ms)`, 'success');
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results['typescript-consumer'] = {
        passed: false,
        duration,
        error: error.message
      };
      
      this.log(`❌ TypeScript Consumer Test failed: ${error.message}`, 'error');
    }
  }

  async runBrowserConsumerTest() {
    this.log('🔄 Running Browser Consumer Test', 'progress');
    const startTime = performance.now();
    
    try {
      // For browser tests, we'll validate the HTML file exists and UMD is loadable
      const browserPath = path.join(this.testDir, 'browser-consumer');
      const htmlPath = path.join(browserPath, 'index.html');
      const jsPath = path.join(browserPath, 'browser-test.js');
      const umdPath = path.join(this.projectRoot, 'dist/umd/hsmjs.min.js');
      
      // Check files exist
      if (!fs.existsSync(htmlPath)) {
        throw new Error('Browser test HTML file not found');
      }
      if (!fs.existsSync(jsPath)) {
        throw new Error('Browser test JS file not found');
      }
      if (!fs.existsSync(umdPath)) {
        throw new Error('UMD build not found');
      }
      
      // Check UMD file can be loaded (basic syntax check)
      const umdContent = fs.readFileSync(umdPath, 'utf8');
      if (!umdContent.includes('function') || !umdContent.includes('HSM')) {
        throw new Error('UMD build appears invalid');
      }
      
      const duration = performance.now() - startTime;
      this.results['browser-consumer'] = {
        passed: true,
        duration,
        output: 'Browser test files validated successfully'
      };
      
      this.log(`✅ Browser Consumer Test validated (${duration.toFixed(2)}ms)`, 'success');
      this.log('  🌐 To run browser test: open tests/npm-consumers/browser-consumer/index.html', 'info');
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results['browser-consumer'] = {
        passed: false,
        duration,
        error: error.message
      };
      
      this.log(`❌ Browser Consumer Test failed: ${error.message}`, 'error');
    }
  }

  async cleanupEnvironments() {
    this.log('🧹 Cleaning up test environments', 'progress');
    
    for (const consumer of this.consumers) {
      try {
        const nodeModulesPath = path.join(this.testDir, consumer, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
          // Remove symlinks safely
          const packagePath = path.join(nodeModulesPath, '@datnguyen1215', 'hsmjs');
          if (fs.existsSync(packagePath)) {
            fs.unlinkSync(packagePath);
          }
        }
      } catch (error) {
        this.log(`  ⚠️ Cleanup warning for ${consumer}: ${error.message}`, 'warning');
      }
    }
  }

  generateReport() {
    const totalTime = performance.now() - this.startTime;
    const allTests = Object.values(this.results);
    const passedTests = allTests.filter(test => test.passed);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 NPM Consumer Test Results Summary');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 Overall Results:`);
    console.log(`  Tests Passed: ${passedTests.length}/${allTests.length}`);
    console.log(`  Success Rate: ${((passedTests.length / allTests.length) * 100).toFixed(1)}%`);
    console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
    
    console.log(`\n📋 Individual Test Results:`);
    Object.entries(this.results).forEach(([testName, result]) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      const time = `(${result.duration.toFixed(2)}ms)`;
      console.log(`  ${status} ${testName.padEnd(20)} ${time}`);
      
      if (!result.passed && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    console.log(`\n🏗️ Package Architecture Validation:`);
    console.log(`  ✅ ESM Export: dist/esm/index.js`);
    console.log(`  ✅ CJS Export: dist/cjs/index.js`);
    console.log(`  ✅ UMD Export: dist/umd/hsmjs.min.js`);
    console.log(`  ✅ TypeScript: dist/types/index.d.ts`);
    
    console.log(`\n📦 Consumer Compatibility Matrix:`);
    console.log(`  Format    | Import Method        | Status`);
    console.log(`  ----------|---------------------|--------`);
    Object.entries(this.results).forEach(([consumer, result]) => {
      const format = consumer.replace('-consumer', '').toUpperCase().padEnd(8);
      const method = {
        'esm': 'import { }',
        'cjs': 'require()',
        'typescript': 'import (typed)',
        'browser': '<script>'
      }[consumer.replace('-consumer', '')] || 'unknown';
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${format} | ${method.padEnd(19)} | ${status}`);
    });
    
    const allPassed = allTests.every(test => test.passed);
    console.log(`\n🎉 ${allPassed ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED!'}`);
    console.log(`📦 Dual ESM/CJS Package Architecture: ${allPassed ? 'VALIDATED' : 'NEEDS FIXES'}`);
    console.log('='.repeat(80) + '\n');
    
    return allPassed;
  }

  async run() {
    try {
      this.log('🚀 Starting NPM Consumer Test Suite', 'progress');
      
      await this.checkPrerequisites();
      await this.setupConsumerEnvironments();
      
      // Run all consumer tests in parallel for speed
      await Promise.all([
        this.runESMConsumerTest(),
        this.runCJSConsumerTest(),
        this.runTypeScriptConsumerTest(),
        this.runBrowserConsumerTest()
      ]);
      
      const allPassed = this.generateReport();
      
      await this.cleanupEnvironments();
      
      process.exit(allPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const args = process.argv.slice(2);
  const runner = new NPMConsumerTestRunner();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NPM Consumer Test Runner

Usage: node test-runner.js [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output
  --cleanup      Only run cleanup (remove test environments)

Examples:
  node test-runner.js              # Run all consumer tests
  node test-runner.js --verbose    # Run with detailed output
  node test-runner.js --cleanup    # Clean up test environments
    `);
    process.exit(0);
  }
  
  if (args.includes('--cleanup')) {
    runner.cleanupEnvironments().then(() => {
      console.log('✅ Cleanup completed');
      process.exit(0);
    }).catch(error => {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    });
  } else {
    runner.run();
  }
}

export default NPMConsumerTestRunner;