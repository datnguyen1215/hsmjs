import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  // ES6 Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.mjs',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },

  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },

  // UMD build (unminified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'HSMJS',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },

  // UMD build (minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'HSMJS',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs(),
      terser({
        compress: {
          drop_console: true
        }
      })
    ]
  }
];