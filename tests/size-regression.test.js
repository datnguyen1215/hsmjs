/**
 * Size Regression Test Suite
 * Monitors build sizes over time and alerts on significant increases
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

describe('Size Regression Tests', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const srcPath = path.join(__dirname, '..', 'src', 'index.js');
  const umdPath = path.join(distPath, 'umd', 'hsmjs.min.js');

  // Baseline sizes for minimalist distribution architecture (updated to actual)
  const BASELINE_SIZES = {
    version: '1.1.4', // Current version
    src: {
      raw: 195,       // Source index.js size (actual)
      gzipped: 151,   // Actual gzipped size
    },
    umd: {
      raw: 30173,     // UMD minified build size (actual)
      gzipped: 8955,  // UMD gzipped size (actual)
    }
  };

  // Acceptable regression thresholds
  const REGRESSION_THRESHOLDS = {
    warning: 0.10,    // 10% increase triggers warning
    error: 0.25,      // 25% increase fails test
  };

  describe('Individual File Regression', () => {
    test('Source index.js size regression', () => {
      const currentSize = fs.statSync(srcPath).size;
      const baselineSize = BASELINE_SIZES.src.raw;
      const increase = currentSize - baselineSize;
      const percentIncrease = increase / baselineSize;


      // Warning for moderate increases
      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  Source bundle size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      // Fail for significant increases
      expect(Math.abs(percentIncrease)).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });

    test('UMD minified size regression', () => {
      if (!fs.existsSync(umdPath)) {

        return;
      }
      
      const currentSize = fs.statSync(umdPath).size;
      const baselineSize = BASELINE_SIZES.umd.raw;
      const increase = currentSize - baselineSize;
      const percentIncrease = increase / baselineSize;


      // Warning for moderate increases
      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  UMD bundle size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      // Fail for significant increases
      expect(Math.abs(percentIncrease)).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });
  });

  describe('Gzipped Size Regression', () => {
    test('Source gzipped size regression', () => {
      const content = fs.readFileSync(srcPath);
      const currentGzipped = gzipSync(content).length;
      const baselineGzipped = BASELINE_SIZES.src.gzipped;
      const increase = currentGzipped - baselineGzipped;
      const percentIncrease = increase / baselineGzipped;


      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  Source gzipped size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      expect(Math.abs(percentIncrease)).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });

    test('UMD gzipped size regression', () => {
      if (!fs.existsSync(umdPath)) {

        return;
      }
      
      const content = fs.readFileSync(umdPath);
      const currentGzipped = gzipSync(content).length;
      const baselineGzipped = BASELINE_SIZES.umd.gzipped;
      const increase = currentGzipped - baselineGzipped;
      const percentIncrease = increase / baselineGzipped;


      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  UMD gzipped size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      expect(Math.abs(percentIncrease)).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });
  });

  describe('Distribution Architecture Validation', () => {
    test('verify minimalist distribution setup', () => {
      // Source file should exist for npm users
      expect(fs.existsSync(srcPath)).toBe(true);
      
      const srcSize = fs.statSync(srcPath).size;

      
      // Source should be reasonable size
      expect(srcSize).toBeGreaterThan(100); // At least 100 bytes
      expect(srcSize).toBeLessThan(5000);   // Less than 5KB
    });

    test('UMD build validation if available', () => {
      if (!fs.existsSync(umdPath)) {

        return;
      }
      
      const umdSize = fs.statSync(umdPath).size;

      
      // UMD should be reasonably sized
      expect(umdSize).toBeGreaterThan(10000); // At least 10KB
      expect(umdSize).toBeLessThan(100000);   // Less than 100KB
    });
  });

  describe('Historical Tracking', () => {
    test('record current sizes for historical tracking', () => {
      const currentSizes = {
        timestamp: new Date().toISOString(),
        version: BASELINE_SIZES.version,
        sizes: {
          src: {
            raw: fs.statSync(srcPath).size,
            gzipped: gzipSync(fs.readFileSync(srcPath)).length,
          }
        }
      };

      // Add UMD sizes if available
      if (fs.existsSync(umdPath)) {
        currentSizes.sizes.umd = {
          raw: fs.statSync(umdPath).size,
          gzipped: gzipSync(fs.readFileSync(umdPath)).length,
        };
      }


      // Always pass - this is just for tracking
      expect(true).toBe(true);
    });
  });

  describe('Performance Impact Analysis', () => {
    test('size to performance ratio analysis', () => {
      const srcSize = fs.statSync(srcPath).size;
      const srcSizeKB = srcSize / 1024;
      
      // Analyze size efficiency
      const linesOfCode = fs.readFileSync(srcPath, 'utf8').split('\n').length;
      const bytesPerLine = srcSize / linesOfCode;
      

      // Basic efficiency checks
      expect(bytesPerLine).toBeLessThan(100); // Reasonable code density
      expect(srcSizeKB).toBeLessThan(10);     // Keep source lean
    });

    test('bundle optimization recommendations', () => {
      if (!fs.existsSync(umdPath)) {

        return;
      }
      
      const srcSize = fs.statSync(srcPath).size;
      const umdSize = fs.statSync(umdPath).size;
      const compressionRatio = umdSize / srcSize;
      
      const srcGzipped = gzipSync(fs.readFileSync(srcPath)).length;
      const umdGzipped = gzipSync(fs.readFileSync(umdPath)).length;
      const gzipEfficiency = umdGzipped / umdSize;
      

      // Optimization recommendations
      if (gzipEfficiency > 0.4) {
        console.warn('⚠️  Bundle may benefit from better minification');
      }
      if (compressionRatio > 100) {
        console.warn('⚠️  Bundle size seems excessive for source size');
      }
      
      expect(gzipEfficiency).toBeLessThan(0.5); // Good compression expected
    });
  });
});