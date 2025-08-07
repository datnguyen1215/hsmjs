/**
 * Creates an error for cleared queue events
 * @param {string} [message]
 * @returns {Error}
 */
export const QueueClearedError = (message = 'Event was cancelled due to queue being cleared') => {
  const error = new Error(message);
  error.name = 'QueueClearedError';
  return error;
};