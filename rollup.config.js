import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * 
 * @license ${pkg.license}
 * @author ${pkg.author}
 * @repository ${pkg.repository.url}
 */`;

// Common plugins for all builds
const commonPlugins = [
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
    presets: [
      ['@babel/preset-env', {
        targets: {
          browsers: ['> 1%', 'last 2 versions', 'IE >= 11']
        },
        modules: false
      }]
    ]
  })
];

export default [
  // UMD Development Build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/umd/hsmjs.js',
      format: 'umd',
      name: 'HSM',
      banner,
      sourcemap: true
    },
    plugins: commonPlugins
  },
  
  // UMD Production Build (Minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/umd/hsmjs.min.js',
      format: 'umd',
      name: 'HSM',
      banner,
      sourcemap: true
    },
    plugins: [
      ...commonPlugins,
      terser({
        compress: {
          dead_code: true,
          drop_debugger: true,
          drop_console: false, // Keep console for debugging
          pure_funcs: ['console.debug'], // Remove debug calls only
          passes: 2
        },
        mangle: {
          properties: false, // Don't mangle property names for API stability
          reserved: ['HSM', 'StateMachine', 'State', 'Transition'] // Preserve public API names
        },
        format: {
          comments: function(node, comment) {
            // Keep license banner
            return comment.value.includes('!');
          }
        }
      })
    ]
  },
  
  // ES Module Build (for bundlers)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/esm/hsmjs.esm.js',
      format: 'esm',
      banner,
      sourcemap: true
    },
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', {
            targets: {
              esmodules: true
            },
            modules: false
          }]
        ]
      })
    ]
  },
  
  // ES Module Minified Build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/esm/hsmjs.esm.min.js',
      format: 'esm',
      banner,
      sourcemap: true
    },
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', {
            targets: {
              esmodules: true
            },
            modules: false
          }]
        ]
      }),
      terser({
        compress: {
          dead_code: true,
          drop_debugger: true,
          drop_console: false,
          pure_funcs: ['console.debug'],
          passes: 2
        },
        mangle: {
          properties: false,
          reserved: ['HSM', 'StateMachine', 'State', 'Transition']
        },
        format: {
          comments: function(node, comment) {
            return comment.value.includes('!');
          }
        }
      })
    ]
  }
];