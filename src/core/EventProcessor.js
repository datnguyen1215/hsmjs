import { resolveTransition, resolveTargetNode } from '../transitions/TransitionManager.js';
import { getStateNode, initializeState, getStatePath } from './StateNavigator.js';
import { hasAsyncActions } from '../utils/AsyncDetector.js';
import { executeActions } from './ActionRunner.js';

/**
 * Find a valid transition for the given event from the current state
 * @param {Object} event - Event object with type and context
 * @param {string} currentState - Current state path
 * @param {Object} rootNode - Root state node
 * @param {Object} guards - Guard registry for condition evaluation
 * @param {Object} machine - Machine reference
 * @returns {Object|null} - Transition info object or null if no valid transition found
 */
export const findTransition = (event, currentState, rootNode, guards, machine) => {
  const currentStateNode = getStateNode(rootNode, currentState);
  if (!currentStateNode) {
    return null;
  }

  let transition = null;
  let searchNode = currentStateNode;

  while (!transition && searchNode.parent) {
    transition = resolveTransition(searchNode, event.type, event.context, event, guards, machine);
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
 * Collect all actions that need to be executed for a transition
 * @param {Object} currentStateNode - Current state node
 * @param {Object} transition - Transition configuration
 * @param {Object} targetNode - Target state node
 * @param {boolean} isInternalTransition - Whether this is an internal transition
 * @returns {Array} - Array of action groups with type and actions properties
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
 * Process event synchronously with immediate action execution
 * @param {Object} event - Event object
 * @param {string} currentState - Current state path
 * @param {Object} currentContext - Current context
 * @param {Object} rootNode - Root state node
 * @param {Object} guards - Guard registry
 * @param {Object} actions - Action registry
 * @param {Function} executeActionsSync - Sync action executor function
 * @param {Object} machine - Machine reference
 * @returns {Object} - Processing result with wasAsync flag and value/state info
 */
export const processEventSync = (event, currentState, currentContext, rootNode, guards, actions, executeActionsSync, machine) => {
  const results = [];
  let state = currentState;
  let _context = currentContext;

  // Find transition and target
  const transitionInfo = findTransition({ ...event, context: _context }, state, rootNode, guards, machine);
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
      const actionResult = executeActionsSync(transition.actions, _context, event, actions, machine);
      _context = actionResult.context;
      results.push(...actionResult.results);
    }
  } else {
    // Exit current state
    if (currentStateNode.exit.length > 0) {
      const exitResult = executeActionsSync(currentStateNode.exit, _context, event, actions, machine);
      _context = exitResult.context;
      results.push(...exitResult.results);
    }

    // Execute transition actions
    if (transition.actions.length > 0) {
      const transitionResult = executeActionsSync(transition.actions, _context, event, actions, machine);
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
      const entryResult = executeActionsSync(targetNode.entry, _context, event, actions, machine);
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
            const nestedEntryResult = executeActionsSync(currentNode.entry, _context, event, actions, machine);
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
 * Process event asynchronously with async action support
 * @param {Object} event - Event object
 * @param {string} currentState - Current state path
 * @param {Object} currentContext - Current context
 * @param {Object} rootNode - Root state node
 * @param {Object} guards - Guard registry
 * @param {Object} actions - Action registry
 * @param {Object} machine - Machine reference
 * @returns {Promise<Object>} - Promise resolving to processing result with state, context, and results
 */
export const processEventAsync = async (event, currentState, currentContext, rootNode, guards, actions, machine) => {
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
    transition = resolveTransition(searchNode, event.type, _context, event, guards, machine);
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
          actionRegistry: actions,
          machine
        });
        _context = actionResult.context;
        results.push(...actionResult.results);
      }
    } else {
      // Exit current state
      if (currentStateNode.exit.length > 0) {
        const exitResult = await executeActions(currentStateNode.exit, _context, event, {
          actionRegistry: actions,
          machine
        });
        _context = exitResult.context;
        results.push(...exitResult.results);
      }

      // Execute transition actions
      if (transition.actions.length > 0) {
        const transitionResult = await executeActions(transition.actions, _context, event, {
          actionRegistry: actions,
          machine
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
          actionRegistry: actions,
          machine
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
                actionRegistry: actions,
                machine
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