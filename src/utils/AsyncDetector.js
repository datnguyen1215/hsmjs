import { isAssignAction } from '../actions/assign.js';

/**
 * @param {Function} fn
 * @returns {boolean}
 */
const isAsyncFunction = (fn) => {
  return fn.constructor.name === 'AsyncFunction';
};

/**
 * @param {Function} fn
 * @returns {boolean}
 */
const detectPromiseInFunction = (fn) => {
  const funcStr = fn.toString();
  return funcStr.includes('Promise.reject') ||
         funcStr.includes('Promise.resolve') ||
         funcStr.includes('new Promise');
};

/**
 * @param {Array} actionsList
 * @param {Object} actionRegistry
 * @returns {boolean}
 */
export const hasAsyncActions = (actionsList, actionRegistry = {}) => {
  for (const action of actionsList) {
    if (typeof action === 'function') {
      if (isAsyncFunction(action)) {
        return true;
      }
      // Check for Promise-returning functions
      if (detectPromiseInFunction(action)) {
        return true;
      }
    }

    if (action && typeof action === 'object' && action._isAssign) {
      if (typeof action.assigner === 'function' && isAsyncFunction(action.assigner)) {
        return true;
      }
    }

    if (typeof action === 'string' && actionRegistry[action]) {
      const resolved = actionRegistry[action];
      if (typeof resolved === 'function' && isAsyncFunction(resolved)) {
        return true;
      }
      if (resolved && typeof resolved === 'object' && resolved._isAssign) {
        if (typeof resolved.assigner === 'function' && isAsyncFunction(resolved.assigner)) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * @param {Function|string|Object} action
 * @param {Object} actionRegistry
 * @returns {boolean}
 */
export const isActionAsync = (action, actionRegistry = {}) => {
  if (typeof action === 'function') {
    return isAsyncFunction(action) || detectPromiseInFunction(action);
  }

  if (isAssignAction(action)) {
    return typeof action.assigner === 'function' && isAsyncFunction(action.assigner);
  }

  if (typeof action === 'string' && actionRegistry[action]) {
    const resolved = actionRegistry[action];
    if (typeof resolved === 'function') {
      return isAsyncFunction(resolved) || detectPromiseInFunction(resolved);
    }
    if (isAssignAction(resolved)) {
      return typeof resolved.assigner === 'function' && isAsyncFunction(resolved.assigner);
    }
  }

  return false;
};

export { isAsyncFunction, detectPromiseInFunction };