/**
 * Build Sizes Test Suite
 * Validates minified sizes and monitors size regressions
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

describe('Build Sizes', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const cjsPath = path.join(distPath, 'cjs', 'index.js');
  const esPath = path.join(distPath, 'es', 'index.js');
  
  // Size thresholds (in bytes) - adjust these based on actual optimized sizes
  const SIZE_THRESHOLDS = {
    cjs: {
      raw: 1000,      // Raw CJS build should be under 1KB
      gzipped: 500    // Gzipped should be under 500 bytes
    },
    es: {
      raw: 500,       // Raw ES build should be under 500 bytes
      gzipped: 300    // Gzipped should be under 300 bytes
    }
  };

  describe('File Sizes', () => {
    test('CommonJS build size is within threshold', () => {
      const stats = fs.statSync(cjsPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`CJS build size: ${stats.size} bytes (${sizeKB} KB)`);
      expect(stats.size).toBeLessThanOrEqual(SIZE_THRESHOLDS.cjs.raw);
    });

    test('ES module build size is within threshold', () => {
      const stats = fs.statSync(esPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`ES build size: ${stats.size} bytes (${sizeKB} KB)`);
      expect(stats.size).toBeLessThanOrEqual(SIZE_THRESHOLDS.es.raw);
    });

    test('ES build is smaller than CJS build', () => {
      const cjsStats = fs.statSync(cjsPath);
      const esStats = fs.statSync(esPath);
      
      expect(esStats.size).toBeLessThan(cjsStats.size);
    });
  });

  describe('Gzipped Sizes', () => {
    test('CommonJS gzipped size is within threshold', () => {
      const content = fs.readFileSync(cjsPath);
      const gzipped = gzipSync(content);
      const sizeKB = (gzipped.length / 1024).toFixed(2);
      
      console.log(`CJS gzipped size: ${gzipped.length} bytes (${sizeKB} KB)`);
      expect(gzipped.length).toBeLessThanOrEqual(SIZE_THRESHOLDS.cjs.gzipped);
    });

    test('ES module gzipped size is within threshold', () => {
      const content = fs.readFileSync(esPath);
      const gzipped = gzipSync(content);
      const sizeKB = (gzipped.length / 1024).toFixed(2);
      
      console.log(`ES gzipped size: ${gzipped.length} bytes (${sizeKB} KB)`);
      expect(gzipped.length).toBeLessThanOrEqual(SIZE_THRESHOLDS.es.gzipped);
    });

    test('gzipped ES build is smaller than gzipped CJS build', () => {
      const cjsContent = fs.readFileSync(cjsPath);
      const esContent = fs.readFileSync(esPath);
      const cjsGzipped = gzipSync(cjsContent);
      const esGzipped = gzipSync(esContent);
      
      expect(esGzipped.length).toBeLessThan(cjsGzipped.length);
    });
  });

  describe('Compression Ratios', () => {
    test('CommonJS achieves good compression ratio', () => {
      const content = fs.readFileSync(cjsPath);
      const gzipped = gzipSync(content);
      const ratio = (gzipped.length / content.length) * 100;
      
      console.log(`CJS compression ratio: ${ratio.toFixed(1)}%`);
      // Good compression should achieve at least 60% reduction (40% of original)
      expect(ratio).toBeLessThan(60);
    });

    test('ES module achieves good compression ratio', () => {
      const content = fs.readFileSync(esPath);
      const gzipped = gzipSync(content);
      const ratio = (gzipped.length / content.length) * 100;
      
      console.log(`ES compression ratio: ${ratio.toFixed(1)}%`);
      // Good compression should achieve at least 60% reduction (40% of original)
      expect(ratio).toBeLessThan(60);
    });
  });

  describe('Individual Module Sizes', () => {
    const coreModules = [
      'core/create-machine.js',
      'core/machine.js',
      'core/state.js',
      'core/transition.js',
      'core/history-manager.js',
      'core/circular-buffer.js',
      'actions/action.js',
      'instance/instance.js'
    ];

    test.each(coreModules)('module %s is reasonably sized', (module) => {
      const cjsModulePath = path.join(distPath, 'cjs', module);
      const esModulePath = path.join(distPath, 'es', module);
      
      const cjsStats = fs.statSync(cjsModulePath);
      const esStats = fs.statSync(esModulePath);
      
      // Individual modules should be under 5KB each
      expect(cjsStats.size).toBeLessThan(5 * 1024);
      expect(esStats.size).toBeLessThan(5 * 1024);
      
      console.log(`${module}: CJS=${cjsStats.size}b, ES=${esStats.size}b`);
    });
  });

  describe('Total Bundle Size', () => {
    test('total CJS bundle size', () => {
      let totalSize = 0;
      
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            walkDir(filePath);
          } else if (file.endsWith('.js')) {
            totalSize += stats.size;
          }
        });
      };
      
      walkDir(path.join(distPath, 'cjs'));
      const totalKB = (totalSize / 1024).toFixed(2);
      
      console.log(`Total CJS bundle size: ${totalSize} bytes (${totalKB} KB)`);
      // Total bundle should be under 10KB
      expect(totalSize).toBeLessThan(10 * 1024);
    });

    test('total ES bundle size', () => {
      let totalSize = 0;
      
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            walkDir(filePath);
          } else if (file.endsWith('.js')) {
            totalSize += stats.size;
          }
        });
      };
      
      walkDir(path.join(distPath, 'es'));
      const totalKB = (totalSize / 1024).toFixed(2);
      
      console.log(`Total ES bundle size: ${totalSize} bytes (${totalKB} KB)`);
      // Total bundle should be under 8KB
      expect(totalSize).toBeLessThan(8 * 1024);
    });
  });

  describe('Size Regression Protection', () => {
    const BASELINE_SIZES = {
      cjs: {
        index: 448,     // Current CJS index.js size
        total: 5000     // Approximate total CJS bundle size
      },
      es: {
        index: 196,     // Current ES index.js size
        total: 4000     // Approximate total ES bundle size
      }
    };

    test('CJS index.js size regression check', () => {
      const stats = fs.statSync(cjsPath);
      const increase = stats.size - BASELINE_SIZES.cjs.index;
      const percentIncrease = (increase / BASELINE_SIZES.cjs.index) * 100;
      
      console.log(`CJS size change: ${increase > 0 ? '+' : ''}${increase} bytes (${percentIncrease.toFixed(1)}%)`);
      
      // Allow up to 20% size increase
      expect(percentIncrease).toBeLessThan(20);
    });

    test('ES index.js size regression check', () => {
      const stats = fs.statSync(esPath);
      const increase = stats.size - BASELINE_SIZES.es.index;
      const percentIncrease = (increase / BASELINE_SIZES.es.index) * 100;
      
      console.log(`ES size change: ${increase > 0 ? '+' : ''}${increase} bytes (${percentIncrease.toFixed(1)}%)`);
      
      // Allow up to 20% size increase
      expect(percentIncrease).toBeLessThan(20);
    });
  });

  describe('Performance Impact', () => {
    test('build sizes suitable for web performance', () => {
      const cjsStats = fs.statSync(cjsPath);
      const esStats = fs.statSync(esPath);
      
      // For good web performance, libraries should be under 25KB uncompressed
      expect(cjsStats.size).toBeLessThan(25 * 1024);
      expect(esStats.size).toBeLessThan(25 * 1024);
    });

    test('gzipped sizes suitable for fast download', () => {
      const cjsContent = fs.readFileSync(cjsPath);
      const esContent = fs.readFileSync(esPath);
      const cjsGzipped = gzipSync(cjsContent);
      const esGzipped = gzipSync(esContent);
      
      // For fast download, gzipped libraries should be under 10KB
      expect(cjsGzipped.length).toBeLessThan(10 * 1024);
      expect(esGzipped.length).toBeLessThan(10 * 1024);
    });
  });

  describe('Size Comparison with Source', () => {
    test('build is efficiently transformed from source', () => {
      let sourceSize = 0;
      
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            walkDir(filePath);
          } else if (file.endsWith('.js')) {
            sourceSize += stats.size;
          }
        });
      };
      
      walkDir(path.join(__dirname, '..', 'src'));
      
      const cjsStats = fs.statSync(cjsPath);
      const esStats = fs.statSync(esPath);
      
      console.log(`Source size: ${sourceSize} bytes`);
      console.log(`CJS build: ${cjsStats.size} bytes`);
      console.log(`ES build: ${esStats.size} bytes`);
      
      // Build should not be significantly larger than source
      // (allowing for some transformation overhead)
      const maxBuildSize = sourceSize * 1.5; // 50% overhead max
      expect(cjsStats.size).toBeLessThan(maxBuildSize);
      expect(esStats.size).toBeLessThan(sourceSize * 1.2); // ES should be closer to source
    });
  });
});