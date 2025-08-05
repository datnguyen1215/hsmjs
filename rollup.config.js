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

export default {
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
        drop_console: true, // Remove all console statements
        pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.error', 'console.debug'],
        passes: 3,
        inline: true,
        unused: true,
        sequences: true,
        join_vars: true,
        comparisons: true,
        conditionals: true,
        if_return: true,
        evaluate: true,
        reduce_vars: true,
        collapse_vars: true,
        reduce_funcs: true
      },
      mangle: {
        properties: {
          regex: /^_|Private|Internal/, // Mangle internal properties
          reserved: [
            // Public API methods
            'createMachine', 'state', 'initial', 'on', 'start', 'send',
            'subscribe', 'history', 'rollback', 'findState', 'getAllStates',
            'visualizer', 'visualize', 'current', 'context', 'name',
            // State API
            'id', 'path', 'enter', 'exit', 'getTransitions', 'isChildOf',
            'findRelative', 'getAncestors',
            // Transition API
            'if', 'do', 'fire', 'canTake', 'executeBlockingActions',
            'executeFireActions', 'resolveTarget',
            // History API
            'entries', 'size', 'maxSize', 'getByIndex', 'getById',
            'canRollback', 'getStepsBack'
          ]
        },
        reserved: ['HSM', 'createMachine']
      },
      format: {
        comments: function(node, comment) {
          // Keep license banner only
          return comment.value.includes('!');
        },
        semicolons: false,
        shorthand: true,
        braces: false
      }
    })
  ]
};