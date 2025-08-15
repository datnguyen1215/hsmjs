import { isAssignAction } from '../actions/assign.js';
import { updateContext } from './ContextUpdater.js';
import { hasAsyncActions } from '../utils/AsyncDetector.js';

/**
 * @param {Function|string|Object} action
 * @param {Object} context
 * @param {Object} event
 * @param {Object} actions
 * @param {boolean} [throwOnAsync]
 * @returns {Object}
 */
export const executeSyncAction = (action, context, event, actions = {}, throwOnAsync = false) => {
  let hasAsync = false;
  let actionResult = { value: undefined };

  if (isAssignAction(action)) {
    const assigner = typeof action.assigner === 'function' ? action.assigner : () => action.assigner;
    const value = assigner(context, event);
    return {
      hasAsync: value && typeof value.then === 'function',
      contextUpdate: value && typeof value.then !== 'function' ? value : null,
      actionResult: { value: undefined }
    };
  }

  if (typeof action === 'string') {
    const resolvedAction = actions[action];
    if (!resolvedAction) {
      return { hasAsync: false, contextUpdate: null, actionResult: { name: action, value: undefined } };
    }

    if (isAssignAction(resolvedAction)) {
      const assigner = typeof resolvedAction.assigner === 'function' ? resolvedAction.assigner : () => resolvedAction.assigner;
      const value = assigner(context, event);
      return {
        hasAsync: value && typeof value.then === 'function',
        contextUpdate: value && typeof value.then !== 'function' ? value : null,
        actionResult: { name: action, value: undefined }
      };
    }

    const value = resolvedAction(context, event);
    return { hasAsync: false, contextUpdate: null, actionResult: { name: action, value } };
  }

  if (typeof action === 'function') {
    const value = action(context, event);

    if (value && typeof value.then === 'function') {
      hasAsync = true;
      if (throwOnAsync) {
        throw new Error('Async action detected in sync context');
      }
      return { hasAsync: true, contextUpdate: null, actionResult: { value: undefined } };
    }

    return { hasAsync: false, contextUpdate: null, actionResult: { value } };
  }

  return { hasAsync: false, contextUpdate: null, actionResult };
};

/**
 * @param {Array} actionsList
 * @param {Object} context
 * @param {Object} event
 * @param {Object} actions
 * @returns {Object}
 */
export const executeActionsSync = (actionsList, context, event, actions = {}) => {
  if (!actionsList || actionsList.length === 0) {
    return { hasAsync: false, context, results: [] };
  }

  let updatedContext = context;
  let hasAsync = false;
  const results = [];

  for (const action of actionsList) {
    const result = executeSyncAction(action, updatedContext, event, actions);
    if (result.contextUpdate) {
      updatedContext = updateContext(updatedContext, result.contextUpdate);
    }
    if (result.hasAsync) {
      hasAsync = true;
    }
    results.push(result.actionResult);
  }

  return { hasAsync, context: updatedContext, results };
};

/**
 * @param {Array} actions
 * @param {Object} context
 * @param {Object} event
 * @param {Object} actionRegistry
 * @returns {Promise<Object>}
 */
export const executeActions = async (actions, context, event, actionRegistry = {}) => {
  if (!actions || actions.length === 0) {
    return { context, results: [] };
  }

  const results = [];
  let currentContext = context;

  const actionArray = Array.isArray(actions) ? actions : [actions];

  // Check if all actions are synchronous
  const isAsync = hasAsyncActions(actionArray, actionRegistry);

  if (!isAsync) {
    // Execute all actions synchronously
    for (const action of actionArray) {
      const result = executeSyncActionForAsync(action, currentContext, event, actionRegistry);
      if (result.contextUpdate) {
        currentContext = result.contextUpdate;
      }
      results.push(result.actionResult);
    }
  } else {
    // Execute actions with async support
    for (const action of actionArray) {
      const result = await executeActionAsync(action, currentContext, event, actionRegistry);
      if (result.contextUpdate) {
        currentContext = result.contextUpdate;
      }
      results.push(result.actionResult);
    }
  }

  return { context: currentContext, results };
};

/**
 * @param {Function|string|Object} action
 * @param {Object} context
 * @param {Object} event
 * @param {Object} actionRegistry
 * @returns {{contextUpdate?: Object, actionResult: ActionResult}}
 */
const executeSyncActionForAsync = (action, context, event, actionRegistry) => {
  // Handle assign action
  if (isAssignAction(action)) {
    const newContext = updateContext(context, action.assigner, event);
    return {
      contextUpdate: newContext,
      actionResult: { value: undefined }
    };
  }

  // Handle string action
  if (typeof action === 'string') {
    const resolvedAction = actionRegistry[action];
    if (!resolvedAction) {
      // Action not found in registry
      return { actionResult: { name: action, value: undefined } };
    }

    if (isAssignAction(resolvedAction)) {
      const newContext = updateContext(context, resolvedAction.assigner, event);
      // For sync execution, we don't await promises
      if (newContext && typeof newContext.then === 'function') {
        // Async assigner used in sync context
        return { actionResult: { name: action, value: undefined } };
      }
      return {
        contextUpdate: newContext,
        actionResult: { name: action, value: undefined }
      };
    }

    const value = resolvedAction(context, event);
    return { actionResult: { name: action, value } };
  }

  // Handle function action
  if (typeof action === 'function') {
    const value = action(context, event);
    return { actionResult: { value } };
  }

  return { actionResult: { value: undefined } };
};

/**
 * @param {Function|string|Object} action
 * @param {Object} context
 * @param {Object} event
 * @param {Object} actionRegistry
 * @returns {Promise<{contextUpdate?: Object, actionResult: ActionResult}>}
 */
const executeActionAsync = async (action, context, event, actionRegistry) => {
  // Handle assign action
  if (isAssignAction(action)) {
    const newContext = await updateContext(context, action.assigner, event);
    return {
      contextUpdate: newContext,
      actionResult: { value: undefined }
    };
  }

  // Handle string action
  if (typeof action === 'string') {
    const resolvedAction = actionRegistry[action];
    if (!resolvedAction) {
      // Action not found in registry
      return { actionResult: { name: action, value: undefined } };
    }

    if (isAssignAction(resolvedAction)) {
      const newContext = await updateContext(context, resolvedAction.assigner, event);
      return {
        contextUpdate: newContext,
        actionResult: { name: action, value: undefined }
      };
    }

    const value = await resolvedAction(context, event);
    return { actionResult: { name: action, value } };
  }

  // Handle function action
  if (typeof action === 'function') {
    const value = await action(context, event);
    return { actionResult: { value } };
  }

  return { actionResult: { value: undefined } };
};