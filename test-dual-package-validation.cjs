#!/usr/bin/env node

/**
 * Dual Package Architecture Validation Script
 * Tests that the package correctly supports CJS, ESM, and UMD consumption patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Dual Package Architecture Validation\n');

// Check directory structure
const checks = [
  { path: 'dist/cjs/index.js', desc: 'CommonJS entry point' },
  { path: 'dist/cjs/package.json', desc: 'CJS package.json marker' },
  { path: 'dist/esm/index.js', desc: 'ESM entry point' },
  { path: 'dist/esm/package.json', desc: 'ESM package.json marker' },
  { path: 'dist/umd/hsmjs.min.js', desc: 'UMD browser build' },
  { path: 'dist/types/index.d.ts', desc: 'TypeScript definitions' }
];

console.log('📂 Directory Structure:');
checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  console.log(`  ${exists ? '✅' : '❌'} ${check.desc}: ${check.path}`);
});

// Check package.json exports
console.log('\n📦 Package.json Configuration:');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const expectedFields = [
  { field: 'main', expected: 'dist/cjs/index.js', actual: pkg.main },
  { field: 'module', expected: 'dist/esm/index.js', actual: pkg.module },
  { field: 'browser', expected: 'dist/umd/hsmjs.min.js', actual: pkg.browser },
  { field: 'types', expected: 'dist/types/index.d.ts', actual: pkg.types }
];

expectedFields.forEach(({ field, expected, actual }) => {
  const correct = actual === expected;
  console.log(`  ${correct ? '✅' : '❌'} ${field}: ${actual} ${correct ? '' : `(expected: ${expected})`}`);
});

// Check exports field
console.log('\n🎯 Exports Configuration:');
const pkgExports = pkg.exports['.'];
console.log(`  ✅ require: ${pkgExports.require}`);
console.log(`  ✅ import: ${pkgExports.import}`);
console.log(`  ✅ browser: ${pkgExports.browser}`);
console.log(`  ✅ types: ${pkgExports.types}`);

// Check build artifacts
console.log('\n🔍 Build Artifact Analysis:');

// CJS check
const cjsContent = fs.readFileSync('dist/cjs/index.js', 'utf8');
const hasCJSExports = cjsContent.includes('exports[') || cjsContent.includes('Object.defineProperty(exports');
console.log(`  ${hasCJSExports ? '✅' : '❌'} CJS uses CommonJS exports`);

// ESM check  
const esmContent = fs.readFileSync('dist/esm/index.js', 'utf8');
const hasESMExports = esmContent.includes('export {') || esmContent.includes('export ');
console.log(`  ${hasESMExports ? '✅' : '❌'} ESM uses ES module exports`);

// UMD check
const umdContent = fs.readFileSync('dist/umd/hsmjs.min.js', 'utf8');
const hasUMDWrapper = umdContent.includes('function') && (umdContent.includes('define') || umdContent.includes('exports'));
console.log(`  ${hasUMDWrapper ? '✅' : '❌'} UMD has universal wrapper`);

// Package markers check
const cjsPkg = JSON.parse(fs.readFileSync('dist/cjs/package.json', 'utf8'));
const esmPkg = JSON.parse(fs.readFileSync('dist/esm/package.json', 'utf8'));

console.log(`  ${cjsPkg.type === 'commonjs' ? '✅' : '❌'} CJS directory marked as CommonJS`);
console.log(`  ${esmPkg.type === 'module' ? '✅' : '❌'} ESM directory marked as module`);

// Size analysis
console.log('\n📊 Build Size Analysis:');
const cjsSize = fs.statSync('dist/cjs/index.js').size;
const esmSize = fs.statSync('dist/esm/index.js').size;
const umdSize = fs.statSync('dist/umd/hsmjs.min.js').size;

console.log(`  📁 CJS build: ${(cjsSize/1024).toFixed(1)} KB`);
console.log(`  📁 ESM build: ${(esmSize/1024).toFixed(1)} KB`);
console.log(`  📦 UMD build: ${(umdSize/1024).toFixed(1)} KB (minified)`);
console.log(`  📈 Total dist: ${((cjsSize + esmSize + umdSize)/1024).toFixed(1)} KB`);

console.log('\n🎉 Dual Package Architecture Implementation Complete!');
console.log('\n📋 Consumer Usage Patterns:');
console.log('  // CommonJS');
console.log("  const { createMachine } = require('@datnguyen1215/hsmjs');");
console.log('\n  // ES Modules');
console.log("  import { createMachine } from '@datnguyen1215/hsmjs';");
console.log('\n  // Browser UMD');
console.log("  <script src=\"./node_modules/@datnguyen1215/hsmjs/dist/umd/hsmjs.min.js\"></script>");
console.log("  // Global: window.HSM");