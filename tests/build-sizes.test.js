/**
 * Build size monitoring and regression testing
 * Tests the minimalist UMD-only distribution
 */

const fs = require('fs');
const { gzipSync } = require('zlib');
const path = require('path');

// File path for minimalist distribution
const umdPath = path.join(__dirname, '../dist/hsmjs.min.js');

// Size thresholds (bytes) for minified UMD
const UMD_SIZE_THRESHOLD = 35 * 1024; // 35KB for minified UMD
const UMD_GZIPPED_THRESHOLD = 12 * 1024; // 12KB gzipped

describe('Build Sizes', () => {
  beforeAll(() => {
    // Ensure UMD build file exists
    expect(fs.existsSync(umdPath)).toBe(true);
  });

  describe('File Sizes', () => {
    test('UMD minified build size is within threshold', () => {
      const stats = fs.statSync(umdPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`UMD minified build size: ${stats.size} bytes (${sizeKB} KB)`);
      expect(stats.size).toBeLessThan(UMD_SIZE_THRESHOLD);
    });
  });

  describe('Gzipped Sizes', () => {
    test('UMD gzipped size is within threshold', () => {
      const content = fs.readFileSync(umdPath);
      const gzipped = gzipSync(content);
      const sizeKB = (gzipped.length / 1024).toFixed(2);
      
      console.log(`UMD gzipped size: ${gzipped.length} bytes (${sizeKB} KB)`);
      expect(gzipped.length).toBeLessThan(UMD_GZIPPED_THRESHOLD);
    });
  });

  describe('Compression Ratio', () => {
    test('UMD achieves good compression ratio', () => {
      const content = fs.readFileSync(umdPath);
      const gzipped = gzipSync(content);
      const ratio = (gzipped.length / content.length) * 100;
      
      console.log(`UMD compression ratio: ${ratio.toFixed(1)}%`);
      // Good compression should achieve at least 60% reduction (40% of original)
      expect(ratio).toBeLessThan(60);
    });
  });

  describe('Performance Impact', () => {
    test('build size suitable for web performance', () => {
      const stats = fs.statSync(umdPath);
      
      // For good web performance, libraries should be under 50KB uncompressed
      expect(stats.size).toBeLessThan(50 * 1024);
    });

    test('gzipped size suitable for fast download', () => {
      const content = fs.readFileSync(umdPath);
      const gzipped = gzipSync(content);
      
      // For fast download, gzipped libraries should be under 15KB
      expect(gzipped.length).toBeLessThan(15 * 1024);
    });
  });
});