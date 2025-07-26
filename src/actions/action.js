/**
 * Action utility for creating named actions
 * Provides better debugging and error handling
 */

/**
 * Create a named action
 * @param {string} name - Action name for debugging
 * @param {Function} fn - Action implementation
 * @returns {Function} Named action function
 */
export const action = (name, fn) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Action name is required');
  }
  
  if (typeof fn !== 'function') {
    throw new Error('Action function is required');
  }
  
  // Create wrapper that preserves name
  const namedAction = (...args) => fn(...args);
  
  // Attach name for debugging
  namedAction.actionName = name;
  
  return namedAction;
};