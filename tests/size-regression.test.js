/**
 * Size Regression Test Suite
 * Monitors build sizes over time and alerts on significant increases
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

describe('Size Regression Tests', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const cjsPath = path.join(distPath, 'cjs', 'index.js');
  const esPath = path.join(distPath, 'es', 'index.js');

  // Baseline sizes (update these after intentional size changes)
  const BASELINE_SIZES = {
    version: '1.1.4', // Current version
    cjs: {
      raw: 448,       // CJS index.js raw size
      gzipped: 250,   // Estimated gzipped size
    },
    es: {
      raw: 196,       // ES index.js raw size  
      gzipped: 150,   // Estimated gzipped size
    },
    totalBundle: {
      cjs: 8000,      // Total CJS bundle size estimate
      es: 6000,       // Total ES bundle size estimate
    }
  };

  // Acceptable regression thresholds
  const REGRESSION_THRESHOLDS = {
    warning: 0.10,    // 10% increase triggers warning
    error: 0.25,      // 25% increase fails test
  };

  describe('Individual File Regression', () => {
    test('CJS index.js size regression', () => {
      const currentSize = fs.statSync(cjsPath).size;
      const baselineSize = BASELINE_SIZES.cjs.raw;
      const increase = currentSize - baselineSize;
      const percentIncrease = increase / baselineSize;

      console.log(`CJS Size Analysis:
        Baseline: ${baselineSize} bytes
        Current:  ${currentSize} bytes
        Change:   ${increase > 0 ? '+' : ''}${increase} bytes (${(percentIncrease * 100).toFixed(1)}%)
      `);

      // Warning for moderate increases
      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  CJS bundle size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      // Fail for significant increases
      expect(percentIncrease).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });

    test('ES index.js size regression', () => {
      const currentSize = fs.statSync(esPath).size;
      const baselineSize = BASELINE_SIZES.es.raw;
      const increase = currentSize - baselineSize;
      const percentIncrease = increase / baselineSize;

      console.log(`ES Size Analysis:
        Baseline: ${baselineSize} bytes
        Current:  ${currentSize} bytes
        Change:   ${increase > 0 ? '+' : ''}${increase} bytes (${(percentIncrease * 100).toFixed(1)}%)
      `);

      // Warning for moderate increases
      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  ES bundle size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      // Fail for significant increases
      expect(percentIncrease).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });
  });

  describe('Gzipped Size Regression', () => {
    test('CJS gzipped size regression', () => {
      const content = fs.readFileSync(cjsPath);
      const currentGzipped = gzipSync(content).length;
      const baselineGzipped = BASELINE_SIZES.cjs.gzipped;
      const increase = currentGzipped - baselineGzipped;
      const percentIncrease = increase / baselineGzipped;

      console.log(`CJS Gzipped Analysis:
        Baseline: ${baselineGzipped} bytes
        Current:  ${currentGzipped} bytes
        Change:   ${increase > 0 ? '+' : ''}${increase} bytes (${(percentIncrease * 100).toFixed(1)}%)
      `);

      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  CJS gzipped size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      expect(percentIncrease).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });

    test('ES gzipped size regression', () => {
      const content = fs.readFileSync(esPath);
      const currentGzipped = gzipSync(content).length;
      const baselineGzipped = BASELINE_SIZES.es.gzipped;
      const increase = currentGzipped - baselineGzipped;
      const percentIncrease = increase / baselineGzipped;

      console.log(`ES Gzipped Analysis:
        Baseline: ${baselineGzipped} bytes
        Current:  ${currentGzipped} bytes
        Change:   ${increase > 0 ? '+' : ''}${increase} bytes (${(percentIncrease * 100).toFixed(1)}%)
      `);

      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  ES gzipped size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      expect(percentIncrease).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });
  });

  describe('Total Bundle Size Regression', () => {
    function calculateBundleSize(buildDir) {
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
      
      walkDir(buildDir);
      return totalSize;
    }

    test('CJS total bundle size regression', () => {
      const currentSize = calculateBundleSize(path.join(distPath, 'cjs'));
      const baselineSize = BASELINE_SIZES.totalBundle.cjs;
      const increase = currentSize - baselineSize;
      const percentIncrease = increase / baselineSize;

      console.log(`CJS Bundle Analysis:
        Baseline: ${baselineSize} bytes (${(baselineSize / 1024).toFixed(2)} KB)
        Current:  ${currentSize} bytes (${(currentSize / 1024).toFixed(2)} KB)
        Change:   ${increase > 0 ? '+' : ''}${increase} bytes (${(percentIncrease * 100).toFixed(1)}%)
      `);

      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  CJS total bundle size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      expect(percentIncrease).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });

    test('ES total bundle size regression', () => {
      const currentSize = calculateBundleSize(path.join(distPath, 'es'));
      const baselineSize = BASELINE_SIZES.totalBundle.es;
      const increase = currentSize - baselineSize;
      const percentIncrease = increase / baselineSize;

      console.log(`ES Bundle Analysis:
        Baseline: ${baselineSize} bytes (${(baselineSize / 1024).toFixed(2)} KB)
        Current:  ${currentSize} bytes (${(currentSize / 1024).toFixed(2)} KB)
        Change:   ${increase > 0 ? '+' : ''}${increase} bytes (${(percentIncrease * 100).toFixed(1)}%)
      `);

      if (percentIncrease > REGRESSION_THRESHOLDS.warning) {
        console.warn(`⚠️  ES total bundle size increased by ${(percentIncrease * 100).toFixed(1)}%`);
      }

      expect(percentIncrease).toBeLessThan(REGRESSION_THRESHOLDS.error);
    });
  });

  describe('Historical Tracking', () => {
    const historyFile = path.join(__dirname, 'size-history.json');

    test('record current sizes for historical tracking', () => {
      const currentSizes = {
        timestamp: new Date().toISOString(),
        version: require('../package.json').version,
        sizes: {
          cjs: {
            raw: fs.statSync(cjsPath).size,
            gzipped: gzipSync(fs.readFileSync(cjsPath)).length,
          },
          es: {
            raw: fs.statSync(esPath).size,
            gzipped: gzipSync(fs.readFileSync(esPath)).length,
          }
        }
      };

      let history = [];
      if (fs.existsSync(historyFile)) {
        try {
          history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        } catch (e) {
          console.warn('Could not read size history file, starting fresh');
        }
      }

      // Keep only last 50 entries
      history.push(currentSizes);
      if (history.length > 50) {
        history = history.slice(-50);
      }

      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

      console.log(`📊 Recorded size data:
        CJS: ${currentSizes.sizes.cjs.raw}b (${currentSizes.sizes.cjs.gzipped}b gzipped)
        ES:  ${currentSizes.sizes.es.raw}b (${currentSizes.sizes.es.gzipped}b gzipped)
      `);

      expect(currentSizes.sizes.cjs.raw).toBeGreaterThan(0);
      expect(currentSizes.sizes.es.raw).toBeGreaterThan(0);
    });

    test('compare with recent history', () => {
      if (!fs.existsSync(historyFile)) {
        console.log('📊 No size history available yet');
        return;
      }

      const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      if (history.length < 2) {
        console.log('📊 Not enough history for comparison');
        return;
      }

      const current = history[history.length - 1];
      const previous = history[history.length - 2];

      const cjsChange = current.sizes.cjs.raw - previous.sizes.cjs.raw;
      const esChange = current.sizes.es.raw - previous.sizes.es.raw;

      console.log(`📈 Size changes since last run:
        CJS: ${cjsChange > 0 ? '+' : ''}${cjsChange} bytes
        ES:  ${esChange > 0 ? '+' : ''}${esChange} bytes
        Previous version: ${previous.version}
        Current version:  ${current.version}
      `);

      // Test should pass but log warnings for increases
      if (cjsChange > 0) {
        console.warn(`⚠️  CJS size increased by ${cjsChange} bytes since last run`);
      }
      if (esChange > 0) {
        console.warn(`⚠️  ES size increased by ${esChange} bytes since last run`);
      }

      expect(true).toBe(true); // Always pass, just for logging
    });
  });

  describe('Size Efficiency Metrics', () => {
    test('compression efficiency', () => {
      const cjsContent = fs.readFileSync(cjsPath);
      const esContent = fs.readFileSync(esPath);
      
      const cjsGzipped = gzipSync(cjsContent);
      const esGzipped = gzipSync(esContent);
      
      const cjsRatio = (cjsGzipped.length / cjsContent.length) * 100;
      const esRatio = (esGzipped.length / esContent.length) * 100;

      console.log(`🗜️  Compression Ratios:
        CJS: ${cjsRatio.toFixed(1)}% (${100 - cjsRatio.toFixed(1)}% reduction)
        ES:  ${esRatio.toFixed(1)}% (${100 - esRatio.toFixed(1)}% reduction)
      `);

      // Good compression should achieve at least 50% reduction
      expect(cjsRatio).toBeLessThan(60);
      expect(esRatio).toBeLessThan(60);
    });

    test('size per feature estimate', () => {
      // Estimate features based on API surface
      const features = [
        'createMachine',
        'state creation',
        'transitions',
        'actions',
        'context management',
        'async support',
        'history management',
        'instance management'
      ];

      const cjsSize = fs.statSync(cjsPath).size;
      const esSize = fs.statSync(esPath).size;
      
      const cjsBytesPerFeature = cjsSize / features.length;
      const esBytesPerFeature = esSize / features.length;

      console.log(`📊 Size per Feature Estimate:
        CJS: ${cjsBytesPerFeature.toFixed(0)} bytes per feature
        ES:  ${esBytesPerFeature.toFixed(0)} bytes per feature
        Features: ${features.length}
      `);

      // Each feature should cost less than 100 bytes on average
      expect(cjsBytesPerFeature).toBeLessThan(100);
      expect(esBytesPerFeature).toBeLessThan(50);
    });
  });

  describe('Size Alerts', () => {
    test('alert on significant size changes', () => {
      const cjsSize = fs.statSync(cjsPath).size;
      const esSize = fs.statSync(esPath).size;
      
      // Define "small library" thresholds
      const SMALL_LIBRARY_THRESHOLDS = {
        individual: 2 * 1024,    // 2KB per entry point
        total: 15 * 1024,        // 15KB total
        gzipped: 5 * 1024        // 5KB gzipped
      };

      if (cjsSize > SMALL_LIBRARY_THRESHOLDS.individual) {
        console.warn(`🚨 CJS build (${cjsSize}b) exceeds small library threshold (${SMALL_LIBRARY_THRESHOLDS.individual}b)`);
      }

      if (esSize > SMALL_LIBRARY_THRESHOLDS.individual) {
        console.warn(`🚨 ES build (${esSize}b) exceeds small library threshold (${SMALL_LIBRARY_THRESHOLDS.individual}b)`);
      }

      // These are warnings, not failures
      expect(true).toBe(true);
    });
  });
});