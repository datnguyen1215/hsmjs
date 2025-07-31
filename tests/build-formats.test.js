/**
 * Build Format Validation Tests
 * Tests the minimalist UMD-only distribution format
 */

const fs = require('fs');
const path = require('path');

describe('Build Formats', () => {
  const umdPath = path.join(__dirname, '../dist/hsmjs.min.js');

  describe('UMD Build', () => {
    test('UMD file exists', () => {
      expect(fs.existsSync(umdPath)).toBe(true);
    });

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
      expect(content.split('\n').length).toBeLessThan(20); // Minified should be few lines
      
      // Should not contain comments (except license banner)
      const lines = content.split('\n');
      const commentLines = lines.filter(line => line.trim().startsWith('//') || line.includes('/*'));
      expect(commentLines.length).toBeLessThan(10); // Only license banner allowed
    });

    test('UMD file has source map', () => {
      const sourceMapPath = umdPath + '.map';
      expect(fs.existsSync(sourceMapPath)).toBe(true);
      
      const content = fs.readFileSync(umdPath, 'utf8');
      expect(content).toMatch(/\/\/# sourceMappingURL=/);
    });
  });

  describe('Source Files Available', () => {
    test('source directory exists for npm users', () => {
      const srcPath = path.join(__dirname, '../src');
      expect(fs.existsSync(srcPath)).toBe(true);
    });

    test('main entry point exists in source', () => {
      const mainPath = path.join(__dirname, '../src/index.js');
      expect(fs.existsSync(mainPath)).toBe(true);
    });

    test('source files are structured correctly', () => {
      const corePath = path.join(__dirname, '../src/core');
      const actionsPath = path.join(__dirname, '../src/actions');
      const instancePath = path.join(__dirname, '../src/instance');
      
      expect(fs.existsSync(corePath)).toBe(true);
      expect(fs.existsSync(actionsPath)).toBe(true);
      expect(fs.existsSync(instancePath)).toBe(true);
    });
  });

  describe('TypeScript Support', () => {
    test('TypeScript definitions exist', () => {
      const typesPath = path.join(__dirname, '../types/index.d.ts');
      expect(fs.existsSync(typesPath)).toBe(true);
    });

    test('TypeScript definitions are copied to dist', () => {
      const distTypesPath = path.join(__dirname, '../dist/types/index.d.ts');
      expect(fs.existsSync(distTypesPath)).toBe(true);
    });
  });
});