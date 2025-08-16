import { resolveTransition, resolveTargetNode } from '../transitions/TransitionManager.js';
import { getStateNode, initializeState, getStatePath } from './StateNavigator.js';
import { hasAsyncActions } from '../utils/AsyncDetector.js';
import { executeActions } from './ActionRunner.js';

/**
 * @param {Object} event
 * @param {string} currentState
 * @param {Object} rootNode
 * @param {Object} guards
 * @returns {Object|null}
 */
export const findTransition = (event, currentState, rootNode, guards) => {
  const currentStateNode = getStateNode(rootNode, currentState);
  if (!currentStateNode) {
    return null;
  }

  let transition = null;
  let searchNode = currentStateNode;

  while (!transition && searchNode.parent) {
    transition = resolveTransition(searchNode, event.type, event.context, event, guards);
    if (!transition) searchNode = searchNode.parent;
  }

  if (!transition) {
    return null;
  }

  let isInternalTransition = !transition.target;
  const targetNode = isInternalTransition ? null : resolveTargetNode(rootNode, currentStateNode, transition.target);

  if (!isInternalTransition && !targetNode) {
    return null;
  }

  // Check if this is a self-transition (target is the same as current state)
  if (!isInternalTransition && targetNode) {
    const currentPath = getStatePath(currentStateNode);
    const targetPath = getStatePath(targetNode);
    if (currentPath === targetPath) {
      // Treat self-transitions as internal transitions by default
      isInternalTransition = true;
    }
  }

  return {
    currentStateNode,
    transition,
    isInternalTransition,
    targetNode
  };
};

/**
 * @param {Object} currentStateNode
 * @param {Object} transition
 * @param {Object} targetNode
 * @param {boolean} isInternalTransition
 * @returns {Array}
 */
export const collectActionsToExecute = (currentStateNode, transition, targetNode, isInternalTransition) => {
  const actionsToExecute = [];

  if (isInternalTransition) {
    if (transition.actions.length > 0) {
      actionsToExecute.push({ type: 'transition', actions: transition.actions });
    }
  } else {
    if (currentStateNode.exit.length > 0) {
      actionsToExecute.push({ type: 'exit', actions: currentStateNode.exit });
    }
    if (transition.actions.length > 0) {
      actionsToExecute.push({ type: 'transition', actions: transition.actions });
    }
    if (targetNode.entry.length > 0) {
      actionsToExecute.push({ type: 'entry', actions: targetNode.entry });
    }
    // Check for nested initial states
    if (targetNode.initial && targetNode.states) {
      const initialPath = initializeState(targetNode, targetNode.initial);
      const initialPathParts = initialPath.split('.');
      let currentNode = targetNode;

      for (const part of initialPathParts) {
        if (currentNode.states && currentNode.states[part]) {
          currentNode = currentNode.states[part];
          if (currentNode.entry && currentNode.entry.length > 0) {
            actionsToExecute.push({ type: 'nested-entry', actions: currentNode.entry });
          }
        }
      }
    }
  }

  return actionsToExecute;
};

/**
 * @param {Object} event
 * @param {string} currentState
 * @param {Object} currentContext
 * @param {Object} rootNode
 * @param {Object} guards
 * @param {Object} actions
 * @param {Function} executeActionsSync
 * @returns {Object}
 */
export const processEventSync = (event, currentState, currentContext, rootNode, guards, actions, executeActionsSync) => {
  const results = [];
  let state = currentState;
  let _context = currentContext;

  // Find transition and target
  const transitionInfo = findTransition({ ...event, context: _context }, state, rootNode, guards);
  if (!transitionInfo) {
    return {
      wasAsync: false,
      value: { state, context: _context, results }
    };
  }

  const { currentStateNode, transition, isInternalTransition, targetNode } = transitionInfo;

  // Check if any action is async
  let hasAsync = false;

  if (isInternalTransition) {
    hasAsync = hasAsyncActions(transition.actions, actions);
  } else {
    if (targetNode.initial && targetNode.states) {
      const initialNode = targetNode.states[targetNode.initial];
      if (initialNode) {
        hasAsync = hasAsyncActions([
          ...currentStateNode.exit,
          ...transition.actions,
          ...targetNode.entry,
          ...initialNode.entry
        ], actions);
      }
    } else {
      hasAsync = hasAsyncActions([
        ...currentStateNode.exit,
        ...transition.actions,
        ...targetNode.entry
      ], actions);
    }
  }

  if (hasAsync) {
    return {
      wasAsync: true
    };
  }

  // Execute actions in order (sync path)
  if (isInternalTransition) {
    // Internal transition - no exit/entry, just actions
    if (transition.actions.length > 0) {
      const actionResult = executeActionsSync(transition.actions, _context, event, actions);
      _context = actionResult.context;
      results.push(...actionResult.results);
    }
  } else {
    // Exit current state
    if (currentStateNode.exit.length > 0) {
      const exitResult = executeActionsSync(currentStateNode.exit, _context, event, actions);
      _context = exitResult.context;
      results.push(...exitResult.results);
    }

    // Execute transition actions
    if (transition.actions.length > 0) {
      const transitionResult = executeActionsSync(transition.actions, _context, event, actions);
      _context = transitionResult.context;
      results.push(...transitionResult.results);
    }

    // Update state
    state = getStatePath(targetNode);

    // Handle nested initial states
    if (targetNode.initial && targetNode.states) {
      const initialPath = initializeState(targetNode, targetNode.initial);
      const fullPath = state + '.' + initialPath;
      state = fullPath;
    }

    // Enter new state
    if (targetNode.entry.length > 0) {
      const entryResult = executeActionsSync(targetNode.entry, _context, event, actions);
      _context = entryResult.context;
      results.push(...entryResult.results);
    }

    // Execute entry actions for nested initial states
    if (targetNode.initial && targetNode.states) {
      const initialPath = initializeState(targetNode, targetNode.initial);
      const initialPathParts = initialPath.split('.');
      let currentNode = targetNode;

      for (const part of initialPathParts) {
        if (currentNode.states && currentNode.states[part]) {
          currentNode = currentNode.states[part];
          if (currentNode.entry && currentNode.entry.length > 0) {
            const nestedEntryResult = executeActionsSync(currentNode.entry, _context, event, actions);
            _context = nestedEntryResult.context;
            results.push(...nestedEntryResult.results);
          }
        }
      }
    }
  }

  return {
    wasAsync: false,
    value: { state, context: _context, results }
  };
};

/**
 * @param {Object} event
 * @param {string} currentState
 * @param {Object} currentContext
 * @param {Object} rootNode
 * @param {Object} guards
 * @param {Object} actions
 * @returns {Promise<Object>}
 */
export const processEventAsync = async (event, currentState, currentContext, rootNode, guards, actions) => {
  const results = [];
  let state = currentState;
  let _context = currentContext;

  // Get current state node
  const currentStateNode = getStateNode(rootNode, state);
  if (!currentStateNode) {
    return { state, context: _context, results };
  }

  // Find matching transition
  let transition = null;
  let searchNode = currentStateNode;

  while (!transition && searchNode.parent) {
    transition = resolveTransition(searchNode, event.type, _context, event, guards);
    if (!transition) searchNode = searchNode.parent;
  }

  if (!transition) {
    return { state, context: _context, results };
  }

  const isInternalTransition = !transition.target;
  const targetNode = isInternalTransition ? null : resolveTargetNode(rootNode, currentStateNode, transition.target);

  if (!isInternalTransition && !targetNode) {
    return { state, context: _context, results };
  }

  try {
    // Execute actions in order (async path)
    if (isInternalTransition) {
      // Internal transition - no exit/entry, just actions
      if (transition.actions.length > 0) {
        const actionResult = await executeActions(transition.actions, _context, event, {
          actionRegistry: actions
        });
        _context = actionResult.context;
        results.push(...actionResult.results);
      }
    } else {
      // Exit current state
      if (currentStateNode.exit.length > 0) {
        const exitResult = await executeActions(currentStateNode.exit, _context, event, {
          actionRegistry: actions
        });
        _context = exitResult.context;
        results.push(...exitResult.results);
      }

      // Execute transition actions
      if (transition.actions.length > 0) {
        const transitionResult = await executeActions(transition.actions, _context, event, {
          actionRegistry: actions
        });
        _context = transitionResult.context;
        results.push(...transitionResult.results);
      }

      // Update state
      state = getStatePath(targetNode);

      // Handle nested initial states
      if (targetNode.initial && targetNode.states) {
        const initialPath = initializeState(targetNode, targetNode.initial);
        const fullPath = state + '.' + initialPath;
        state = fullPath;
      }

      // Enter new state
      if (targetNode.entry.length > 0) {
        const entryResult = await executeActions(targetNode.entry, _context, event, {
          actionRegistry: actions
        });
        _context = entryResult.context;
        results.push(...entryResult.results);
      }

      // Execute entry actions for nested initial states
      if (targetNode.initial && targetNode.states) {
        const initialPath = initializeState(targetNode, targetNode.initial);
        const initialPathParts = initialPath.split('.');
        let currentNode = targetNode;

        for (const part of initialPathParts) {
          if (currentNode.states && currentNode.states[part]) {
            currentNode = currentNode.states[part];
            if (currentNode.entry && currentNode.entry.length > 0) {
              const nestedEntryResult = await executeActions(currentNode.entry, _context, event, {
                actionRegistry: actions
              });
              _context = nestedEntryResult.context;
              results.push(...nestedEntryResult.results);
            }
          }
        }
      }
    }

    return { state, context: _context, results };
  } catch (error) {
    // Re-throw the error for the caller to handle
    throw error;
  }
};