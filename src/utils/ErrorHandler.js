import { QueueClearedError } from '../errors/QueueClearedError.js';

/**
 * @param {string} [message]
 * @returns {Error}
 */
export const createQueueClearedError = (message) => {
  return QueueClearedError(message);
};