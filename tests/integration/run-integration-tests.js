#!/usr/bin/env node

/**
 * Integration Test Runner for HSMJS
 * This script packages the library and tests both CommonJS and ES6 module formats
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('🚀 Starting HSMJS Integration Tests');
console.log('=====================================');

/**
 * Run a command and handle output
 */
const runCommand = async (command, cwd = projectRoot) => {
  console.log(`Running: ${command}`);
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    if (stderr && !stderr.includes('ExperimentalWarning')) {
      console.warn('Warning:', stderr);
    }
    return { success: true, stdout, stderr };
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error('Error:', error.message);
    if (error.stdout) console.log('Stdout:', error.stdout);
    if (error.stderr) console.log('Stderr:', error.stderr);
    return { success: false, error };
  }
};

/**
 * Install HSMJS package in test directory
 */
const installPackage = async (testDir, packagePath) => {
  console.log(`Installing package in ${testDir}...`);
  const result = await runCommand(`npm install ${packagePath}`, testDir);
  return result.success;
};

/**
 * Run test in specific directory
 */
const runTest = async (testDir, testName) => {
  console.log(`Running ${testName} test...`);
  const result = await runCommand('npm test', testDir);
  if (result.success) {
    console.log(`✅ ${testName} test passed`);
  } else {
    console.log(`❌ ${testName} test failed`);
  }
  return result.success;
};

/**
 * Main test execution
 */
const runIntegrationTests = async () => {
  try {
    // Step 1: Build the package
    console.log('📦 Building package...');
    const buildResult = await runCommand('npm run build');
    if (!buildResult.success) {
      throw new Error('Build failed');
    }
    console.log('✅ Package built successfully');

    // Step 2: Create npm package
    console.log('📦 Creating npm package...');
    const packResult = await runCommand('npm pack');
    if (!packResult.success) {
      throw new Error('npm pack failed');
    }
    console.log('✅ Package created successfully');

    // Find the created .tgz file
    const files = await fs.readdir(projectRoot);
    const tgzFile = files.find(file => file.endsWith('.tgz'));
    if (!tgzFile) {
      throw new Error('Could not find created .tgz file');
    }

    const packagePath = path.resolve(projectRoot, tgzFile);
    console.log(`📦 Package created: ${tgzFile}`);

    // Step 3: Test CommonJS integration
    console.log('\n🧪 Testing CommonJS integration...');
    const commonjsTestDir = path.resolve(__dirname, 'commonjs-test');
    const commonjsSuccess = await installPackage(commonjsTestDir, packagePath);
    if (!commonjsSuccess) {
      throw new Error('Failed to install package in CommonJS test directory');
    }

    const commonjsTestResult = await runTest(commonjsTestDir, 'CommonJS');
    if (!commonjsTestResult) {
      throw new Error('CommonJS integration test failed');
    }

    // Step 4: Test ES6 module integration
    console.log('\n🧪 Testing ES6 module integration...');
    const esmTestDir = path.resolve(__dirname, 'esm-test');
    const esmSuccess = await installPackage(esmTestDir, packagePath);
    if (!esmSuccess) {
      throw new Error('Failed to install package in ES6 test directory');
    }

    const esmTestResult = await runTest(esmTestDir, 'ES6 Module');
    if (!esmTestResult) {
      throw new Error('ES6 module integration test failed');
    }

    // Step 5: Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      await fs.unlink(packagePath);
      console.log('✅ Cleaned up package file');
    } catch (error) {
      console.warn('Warning: Could not clean up package file:', error.message);
    }

    // Clean up node_modules in test directories
    try {
      await fs.rm(path.join(commonjsTestDir, 'node_modules'), { recursive: true, force: true });
      await fs.rm(path.join(esmTestDir, 'node_modules'), { recursive: true, force: true });
      console.log('✅ Cleaned up test node_modules');
    } catch (error) {
      console.warn('Warning: Could not clean up test node_modules:', error.message);
    }

    console.log('\n🎉 All integration tests passed!');
    console.log('=====================================');
    console.log('✅ CommonJS module format works');
    console.log('✅ ES6 module format works');
    console.log('✅ Package can be installed via npm');
    console.log('✅ All exports are accessible');

    return true;
  } catch (error) {
    console.error('\n💥 Integration tests failed!');
    console.error('Error:', error.message);
    console.log('\n=====================================');
    process.exit(1);
  }
};

// Run the tests
runIntegrationTests();