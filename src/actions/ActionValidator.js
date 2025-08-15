import { isAssignAction } from './assign.js';
import { isAsyncFunction, detectPromiseInFunction } from '../utils/AsyncDetector.js';

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


