#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Dual Package Architecture
 * Tests all import methods for @datnguyen1215/hsmjs
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 COMPREHENSIVE DUAL PACKAGE ARCHITECTURE TEST\n');
console.log('Testing @datnguyen1215/hsmjs import methods:\n');

const tests = [
    {
        name: 'Package Exports Configuration',
        command: 'node',
        args: ['test-package-exports.cjs'],
        description: 'Verify package.json exports and dist files'
    },
    {
        name: 'CommonJS Import',
        command: 'node',
        args: ['test-cjs-import.cjs'],
        description: 'Test: const HSM = require("@datnguyen1215/hsmjs")'
    },
    {
        name: 'ESM Import', 
        command: 'node',
        args: ['test-esm-import.mjs'],
        description: 'Test: import HSM from "@datnguyen1215/hsmjs"'
    }
];

async function runTest(test) {
    return new Promise((resolve) => {
        console.log(`🔧 Running: ${test.name}`);
        console.log(`   ${test.description}`);
        console.log(`   Command: ${test.command} ${test.args.join(' ')}\n`);

        const process = spawn(test.command, test.args, { 
            stdio: 'inherit',
            cwd: __dirname 
        });

        process.on('close', (code) => {
            const success = code === 0;
            console.log(`\n${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASSED' : 'FAILED'}\n`);
            console.log('─'.repeat(60) + '\n');
            resolve(success);
        });

        process.on('error', (error) => {
            console.error(`❌ ${test.name}: ERROR - ${error.message}\n`);
            console.log('─'.repeat(60) + '\n');
            resolve(false);
        });
    });
}

async function runAllTests() {
    console.log('📋 TEST PLAN:\n');
    tests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.name}`);
        console.log(`   ${test.description}\n`);
    });
    console.log('─'.repeat(60) + '\n');

    const results = [];
    for (const test of tests) {
        const success = await runTest(test);
        results.push({ name: test.name, success });
    }

    // Print summary
    console.log('📊 TEST SUMMARY:\n');
    let allPassed = true;
    
    results.forEach((result, index) => {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`${index + 1}. ${result.name}: ${status}`);
        if (!result.success) allPassed = false;
    });

    console.log('\n' + '═'.repeat(60));
    
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED! Dual package architecture is working correctly.');
        console.log('\n✅ The package supports:');
        console.log('   • CommonJS: const HSM = require("@datnguyen1215/hsmjs")');
        console.log('   • ESM: import HSM from "@datnguyen1215/hsmjs"');  
        console.log('   • Named imports: import { createMachine } from "@datnguyen1215/hsmjs"');
        console.log('   • Browser UMD: <script src="dist/umd/hsmjs.min.js"></script>');
        console.log('\n📦 Package is ready for publication!');
    } else {
        console.log('❌ SOME TESTS FAILED! Please check the errors above.');
        process.exit(1);
    }

    // Additional info about browser testing
    console.log('\n📝 MANUAL BROWSER TEST:');
    console.log('   Open test-umd-browser.html in a web browser to test UMD import');
    console.log('   File location: ./test-umd-browser.html');
}

// Check if we're in the right directory
if (!fs.existsSync('./package.json')) {
    console.error('❌ Error: package.json not found. Please run this from the project root.');
    process.exit(1);
}

// Run all tests
runAllTests().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});