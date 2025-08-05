/**
 * Consolidated Build Validation Tests
 * Tests file existence, structure, sizes, and regression thresholds
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

// File paths
const srcPath = path.join(__dirname, '../src/index.js');
const umdPath = path.join(__dirname, '../dist/umd/hsmjs.min.js');
const typesPath = path.join(__dirname, '../dist/types/index.d.ts');

// Size thresholds (bytes)
const UMD_SIZE_THRESHOLD = 35 * 1024; // 35KB for minified UMD
const UMD_GZIPPED_THRESHOLD = 12 * 1024; // 12KB gzipped

// Baseline sizes for regression testing
const BASELINE_SIZES = {
  src: {
    raw: 103,       // Actual source size (updated after API simplification)
    gzipped: 151,   // Actual gzipped size
  },
  umd: {
    raw: 30173,     // UMD minified build size (actual)
    gzipped: 8955,  // UMD gzipped size (actual)
  }
};

// Regression thresholds
const REGRESSION_THRESHOLDS = {
  warning: 0.10,    // 10% increase triggers warning
  error: 0.50,      // 50% increase fails test
};

describe('Build Validation', () => {
  describe('File Existence', () => {
    test('UMD build file exists', () => {
      expect(fs.existsSync(umdPath)).toBe(true);
    });

    test('TypeScript definitions exist', () => {
      expect(fs.existsSync(typesPath)).toBe(true);
    });

    test('Source map exists', () => {
      const sourceMapPath = umdPath + '.map';
      expect(fs.existsSync(sourceMapPath)).toBe(true);
    });
  });

  describe('UMD Structure and Format', () => {
    test('UMD file has correct structure', () => {
      const content = fs.readFileSync(umdPath, 'utf8');

      // Should contain UMD wrapper (modern format)
      expect(content).toMatch(/!function\s*\([^)]+\)/); // Modern UMD format
      expect(content).toMatch(/typeof\s+exports/);
      expect(content).toMatch(/typeof\s+module/);

      // Should expose HSM as global
      expect(content).toMatch(/HSM\s*=/);
    });

    test('UMD file is minified', () => {
      const content = fs.readFileSync(umdPath, 'utf8');

      // Should not contain unnecessary whitespace
      expect(content.split('\n').length).toBeLessThan(200); // Minified should have limited lines

      // Should not contain comments (except license banner)
      const lines = content.split('\n');
      const commentLines = lines.filter(line => line.trim().startsWith('//') || line.includes('/*'));
      expect(commentLines.length).toBeLessThan(10); // Only license banner allowed
    });
  });

  describe('Size Thresholds', () => {
    test('UMD minified build size is within threshold', () => {
      const stats = fs.statSync(umdPath);
      expect(stats.size).toBeLessThan(UMD_SIZE_THRESHOLD);
    });

    test('UMD gzipped size is within threshold', () => {
      const content = fs.readFileSync(umdPath);
      const gzipped = gzipSync(content);
      expect(gzipped.length).toBeLessThan(UMD_GZIPPED_THRESHOLD);
    });
  });

  describe('Size Regression', () => {
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

    test('Compression efficiency', () => {
      if (!fs.existsSync(umdPath)) {
        return;
      }

      const content = fs.readFileSync(umdPath);
      const gzipped = gzipSync(content);
      const compressionRatio = (content.length / gzipped.length);
      const gzipEfficiency = gzipped.length / content.length;

      // Good compression ratios (higher is better)
      expect(compressionRatio).toBeGreaterThan(2.5);

      // Warn if compression seems poor
      if (compressionRatio < 3) {
        console.warn('⚠️  Compression ratio below optimal');
      }
      if (compressionRatio > 100) {
        console.warn('⚠️  Bundle size seems excessive for source size');
      }

      expect(gzipEfficiency).toBeLessThan(0.5); // Good compression expected
    });
  });

  describe('TypeScript Validation', () => {
    test('TypeScript definitions are valid', () => {
      const content = fs.readFileSync(typesPath, 'utf8');

      // Should contain module declarations
      expect(content).toMatch(/export\s+.*createMachine/);
      expect(content).toMatch(/interface\s+\w+/);

      // Should not be empty
      expect(content.trim().length).toBeGreaterThan(100);
    });
  });
});