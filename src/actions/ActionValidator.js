import { isAssignAction } from './assign.js';

/**
 * @param {Function} func
 * @returns {boolean}
 */
const isAsyncFunction = (func) => {
  return func.constructor.name === 'AsyncFunction';
};

/**
 * @param {Function} func
 * @returns {boolean}
 */
const detectsPromiseInFunction = (func) => {
  const funcStr = func.toString();
  return funcStr.includes('Promise.reject') ||
         funcStr.includes('Promise.resolve') ||
         funcStr.includes('new Promise');
};

/**
 * @param {Function|string|Object} action
 * @param {Object} actionRegistry
 * @returns {boolean}
 */
export const isValidAction = (action, actionRegistry = {}) => {
  if (!action) return false;

  if (typeof action === 'function') return true;
  if (typeof action === 'string') return true;
  if (isAssignAction(action)) return true;

  return false;
};

/**
 * @param {Array} actions
 * @param {Object} actionRegistry
 * @returns {boolean}
 */
export const validateActions = (actions, actionRegistry = {}) => {
  if (!Array.isArray(actions)) return false;

  return actions.every(action => isValidAction(action, actionRegistry));
};

/**
 * @param {Function|string|Object} action
 * @param {Object} actionRegistry
 * @returns {boolean}
 */
export const validateAction = (action, actionRegistry = {}) => {
  return isValidAction(action, actionRegistry);
};

/**
 * @param {Function|string|Object} action
 * @param {Object} actionRegistry
 * @returns {boolean}
 */
export const detectsAsync = (action, actionRegistry = {}) => {
  if (typeof action === 'function') {
    return isAsyncFunction(action) || detectsPromiseInFunction(action);
  }

  if (isAssignAction(action)) {
    if (typeof action.assigner === 'function') {
      return isAsyncFunction(action.assigner);
    }
    return false;
  }

  if (typeof action === 'string' && actionRegistry[action]) {
    const resolved = actionRegistry[action];

    if (typeof resolved === 'function') {
      return isAsyncFunction(resolved) || detectsPromiseInFunction(resolved);
    }

    if (isAssignAction(resolved)) {
      if (typeof resolved.assigner === 'function') {
        return isAsyncFunction(resolved.assigner);
      }
    }
  }

  return false;
};

/**
 * @param {Array} actions
 * @param {Object} actionRegistry
 * @returns {boolean}
 */
export const hasAsyncAction = (actions, actionRegistry = {}) => {
  if (!Array.isArray(actions)) {
    return detectsAsync(actions, actionRegistry);
  }

  return actions.some(action => detectsAsync(action, actionRegistry));
};