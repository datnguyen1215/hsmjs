export default {
  testEnvironment: 'node',
  testTimeout: 10000,
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  globals: {
    jest: true
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};