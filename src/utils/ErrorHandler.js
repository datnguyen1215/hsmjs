import { QueueClearedError } from '../errors/QueueClearedError.js';

/**
 * @param {Error} error
 * @param {string} [context]
 */
export const handleError = (error, context = 'unknown') => {
  // For now, just re-throw - but this provides a centralized place
  // for error handling logic if needed in the future
  if (error?.name === 'QueueClearedError') {
    throw error;
  }
  throw error;
};

/**
 * Creates a safe executor that catches and handles errors
 * @param {Function} fn
 * @param {string} [context]
 * @returns {Function}
 */
export const createSafeExecutor = (fn, context = 'executor') => {
  return (...args) => {
    try {
      const result = fn(...args);
      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result.catch(error => handleError(error, context));
      }
      return result;
    } catch (error) {
      handleError(error, context);
    }
  };
};

/**
 * Wraps a function with error handling
 * @param {Function} fn
 * @param {string} [context]
 * @returns {Function}
 */
export const wrapWithErrorHandling = (fn, context = 'wrapped-function') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
    }
  };
};

/**
 * @param {Error} error
 * @returns {boolean}
 */
export const isQueueClearedError = (error) => {
  return error?.name === 'QueueClearedError';
};

/**
 * @param {string} [message]
 * @returns {Error}
 */
export const createQueueClearedError = (message) => {
  return QueueClearedError(message);
};