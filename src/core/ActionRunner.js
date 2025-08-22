import { isAssignAction } from '../actions/assign.js';
import { updateContext } from './ContextUpdater.js';
import { hasAsyncActions } from '../utils/AsyncDetector.js';

/**
 * @typedef {Object} ActionResult
 * @param {string} [name] - Action name if it's a string action
 * @param {any} [value] - Action result value
 */

/**
 * Process object assigners with function properties
 * @param {Object} assigner - The assigner object to process
 * @returns {Function} - A function that evaluates the assigner
 */
const processObjectAssigner = (assigner) => {
  if (typeof assigner !== 'object' || assigner === null || Array.isArray(assigner) || typeof assigner === 'function') {
    return assigner;
  }

  const hasFunctionProps = Object.values(assigner).some(val => typeof val === 'function');
  if (!hasFunctionProps) {
    return assigner;
  }

  // Cache entries to optimize performance
  const entries = Object.entries(assigner);
  return (ctx, evt) => {
    const result = {};
    for (const [key, value] of entries) {
      result[key] = typeof value === 'function' ? value(ctx, evt) : value;
    }
    return result;
  };
};

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
      console.warn(`Action '${action}' not found in registry`);
      return { hasAsync: false, contextUpdate: null, actionResult: { name: action, value: undefined } };
    }

    if (isAssignAction(resolvedAction)) {
      const assigner = processObjectAssigner(resolvedAction.assigner);

      const value = typeof assigner === 'function' ? assigner(context, event) : assigner;
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
 * Execute actions synchronously for async context
 * @param {Array} actionArray - Array of actions to execute
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @param {Object} actionRegistry - Action registry
 * @returns {Object} - Execution result
 */
const executeActionsSyncForAsync = (actionArray, context, event, actionRegistry) => {
  const results = [];
  let currentContext = context;

  for (const action of actionArray) {
    const result = executeSyncActionForAsync(action, currentContext, event, actionRegistry);
    if (result.contextUpdate) {
      currentContext = result.contextUpdate;
    }
    results.push(result.actionResult);
  }

  return { context: currentContext, results };
};

/**
 * Execute actions with async support
 * @param {Array} actionArray - Array of actions to execute
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @param {Object} actionRegistry - Action registry
 * @returns {Promise<Object>} - Execution result
 */
const executeActionsAsync = async (actionArray, context, event, actionRegistry) => {
  const results = [];
  let currentContext = context;

  for (const action of actionArray) {
    const result = await executeActionAsync(action, currentContext, event, actionRegistry);
    if (result.contextUpdate) {
      currentContext = result.contextUpdate;
    }
    results.push(result.actionResult);
  }

  return { context: currentContext, results };
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

  const actionArray = Array.isArray(actions) ? actions : [actions];
  const isAsync = hasAsyncActions(actionArray, actionRegistry);

  return isAsync
    ? await executeActionsAsync(actionArray, context, event, actionRegistry)
    : executeActionsSyncForAsync(actionArray, context, event, actionRegistry);
};

/**
 * Handle assign action for sync execution
 * @param {Object} action - Assign action
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @returns {{contextUpdate: Object, actionResult: ActionResult}}
 */
const handleAssignActionSync = (action, context, event) => {
  const newContext = updateContext(context, action.assigner, event);
  return {
    contextUpdate: newContext,
    actionResult: { value: undefined }
  };
};

/**
 * Handle string action for sync execution
 * @param {string} action - Action name
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @param {Object} actionRegistry - Action registry
 * @returns {{contextUpdate?: Object, actionResult: ActionResult}}
 */
const handleStringActionSync = (action, context, event, actionRegistry) => {
  const resolvedAction = actionRegistry[action];
  if (!resolvedAction) {
    console.warn(`Action '${action}' not found in registry`);
    return { actionResult: { name: action, value: undefined } };
  }

  if (isAssignAction(resolvedAction)) {
    const assigner = processObjectAssigner(resolvedAction.assigner);
    const newContext = updateContext(context, assigner, event);

    if (newContext && typeof newContext.then === 'function') {
      throw new Error(`Async action '${action}' cannot be used in sync context`);
    }

    return {
      contextUpdate: newContext,
      actionResult: { name: action, value: undefined }
    };
  }

  const value = resolvedAction(context, event);
  return { actionResult: { name: action, value } };
};

/**
 * @param {Function|string|Object} action
 * @param {Object} context
 * @param {Object} event
 * @param {Object} actionRegistry
 * @returns {{contextUpdate?: Object, actionResult: ActionResult}}
 */
const executeSyncActionForAsync = (action, context, event, actionRegistry) => {
  if (isAssignAction(action)) {
    return handleAssignActionSync(action, context, event);
  }

  if (typeof action === 'string') {
    return handleStringActionSync(action, context, event, actionRegistry);
  }

  if (typeof action === 'function') {
    const value = action(context, event);
    return { actionResult: { value } };
  }

  return { actionResult: { value: undefined } };
};

/**
 * Handle assign action for async execution
 * @param {Object} action - Assign action
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @returns {Promise<{contextUpdate: Object, actionResult: ActionResult}>}
 */
const handleAssignActionAsync = async (action, context, event) => {
  const newContext = await updateContext(context, action.assigner, event);
  return {
    contextUpdate: newContext,
    actionResult: { value: undefined }
  };
};

/**
 * Handle string action for async execution
 * @param {string} action - Action name
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @param {Object} actionRegistry - Action registry
 * @returns {Promise<{contextUpdate?: Object, actionResult: ActionResult}>}
 */
const handleStringActionAsync = async (action, context, event, actionRegistry) => {
  const resolvedAction = actionRegistry[action];
  if (!resolvedAction) {
    console.warn(`Action '${action}' not found in registry`);
    return { actionResult: { name: action, value: undefined } };
  }

  if (isAssignAction(resolvedAction)) {
    const assigner = processObjectAssigner(resolvedAction.assigner);
    const newContext = await updateContext(context, assigner, event);
    return {
      contextUpdate: newContext,
      actionResult: { name: action, value: undefined }
    };
  }

  const value = await resolvedAction(context, event);
  return { actionResult: { name: action, value } };
};

/**
 * @param {Function|string|Object} action
 * @param {Object} context
 * @param {Object} event
 * @param {Object} actionRegistry
 * @returns {Promise<{contextUpdate?: Object, actionResult: ActionResult}>}
 */
const executeActionAsync = async (action, context, event, actionRegistry) => {
  if (isAssignAction(action)) {
    return await handleAssignActionAsync(action, context, event);
  }

  if (typeof action === 'string') {
    return await handleStringActionAsync(action, context, event, actionRegistry);
  }

  if (typeof action === 'function') {
    const value = await action(context, event);
    return { actionResult: { value } };
  }

  return { actionResult: { value: undefined } };
};