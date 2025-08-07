import { jest } from '@jest/globals';

// Make jest available globally for all tests
globalThis.jest = jest;

// Mock console methods to suppress output during tests
globalThis.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Suppress unhandled rejection warnings for QueueClearedError in tests
if (typeof process !== 'undefined') {
  const originalListeners = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');

  process.on('unhandledRejection', (reason, promise) => {
    // Ignore QueueClearedError - it's expected in tests
    if (reason && reason.name === 'QueueClearedError') {
      return;
    }
    // Re-emit for other errors
    originalListeners.forEach(listener => listener(reason, promise));
  });
}