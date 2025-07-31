#!/usr/bin/env node

/**
 * Test Package Exports for @datnguyen1215/hsmjs
 * Tests the package.json exports field configuration
 */

const fs = require('fs');
const path = require('path');

console.log('=== Testing Package Exports Configuration ===\n');

async function testPackageExports() {
    try {
        // Test 1: Verify package.json exports field
        console.log('1. Testing package.json exports configuration...');
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        
        if (packageJson.exports) {
            console.log('✅ Exports field exists');
            console.log('   Exports configuration:');
            console.log('   ', JSON.stringify(packageJson.exports, null, 4));
        } else {
            throw new Error('No exports field in package.json');
        }

        // Test 2: Verify dist files exist
        console.log('\n2. Testing distribution files exist...');
        const distPaths = [
            './dist/cjs/index.js',
            './dist/esm/index.js', 
            './dist/umd/hsmjs.min.js',
            './dist/types/index.d.ts'
        ];

        for (const distPath of distPaths) {
            if (fs.existsSync(distPath)) {
                const stats = fs.statSync(distPath);
                console.log(`✅ ${distPath} exists (${Math.round(stats.size / 1024)}KB)`);
            } else {
                throw new Error(`Missing distribution file: ${distPath}`);
            }
        }

        // Test 3: Verify package.json files in dist directories
        console.log('\n3. Testing package.json files in dist directories...');
        const cjsPkg = path.join('./dist/cjs/package.json');
        const esmPkg = path.join('./dist/esm/package.json');

        if (fs.existsSync(cjsPkg)) {
            const cjsContent = JSON.parse(fs.readFileSync(cjsPkg, 'utf8'));
            console.log('✅ CJS package.json exists:', cjsContent);
        } else {
            console.log('⚠️  CJS package.json missing');
        }

        if (fs.existsSync(esmPkg)) {
            const esmContent = JSON.parse(fs.readFileSync(esmPkg, 'utf8'));
            console.log('✅ ESM package.json exists:', esmContent);
        } else {
            console.log('⚠️  ESM package.json missing');
        }

        // Test 4: Test main entry points
        console.log('\n4. Testing main entry points...');
        console.log('   main:', packageJson.main);
        console.log('   module:', packageJson.module);
        console.log('   browser:', packageJson.browser);
        console.log('   types:', packageJson.types);

        // Verify these files exist
        const entryPoints = [
            packageJson.main,
            packageJson.module,
            packageJson.browser,
            packageJson.types
        ].filter(Boolean);

        for (const entry of entryPoints) {
            if (fs.existsSync(entry)) {
                console.log(`✅ ${entry} exists`);
            } else {
                console.log(`❌ ${entry} missing`);
            }
        }

        console.log('\n🎉 Package exports configuration test PASSED!\n');
        return true;

    } catch (error) {
        console.error('❌ Package exports test FAILED:');
        console.error('Error:', error.message);
        return false;
    }
}

// Run the test
testPackageExports().then(success => {
    if (!success) {
        process.exit(1);
    }
});