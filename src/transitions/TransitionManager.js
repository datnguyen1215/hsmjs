import { findStateNode } from '../core/State.js';

/**
 * @param {Function|string} guard
 * @param {Object} context
 * @param {Object} event
 * @param {Object} guardRegistry
 * @returns {boolean}
 */
export const evaluateGuard = (guard, context, event, guardRegistry = {}) => {
  if (!guard) {
    return true;
  }

  // Handle string guard references
  if (typeof guard === 'string') {
    const isNegated = guard.startsWith('!');
    const guardName = isNegated ? guard.slice(1) : guard;
    const guardFn = guardRegistry[guardName];

    if (!guardFn) {
      // Guard not found in registry
      return false; // Missing guards should fail for safety
    }

    try {
      const result = !!guardFn(context, event);
      return isNegated ? !result : result;
    } catch (error) {
      // Guard evaluation error
      return false;
    }
  }

  // Handle function guards
  if (typeof guard === 'function') {
    try {
      return !!guard(context, event);
    } catch (error) {
      // Guard evaluation error
      return false;
    }
  }

  // Handle complex guard objects (for AND/OR combinations)
  if (typeof guard === 'object' && guard !== null) {
    if (guard.type === 'and') {
      return guard.guards.every(g => evaluateGuard(g, context, event, guardRegistry));
    }
    if (guard.type === 'or') {
      return guard.guards.some(g => evaluateGuard(g, context, event, guardRegistry));
    }
    if (guard.type === 'not') {
      return !evaluateGuard(guard.guard, context, event, guardRegistry);
    }
  }

  return true;
};

/**
 * @param {Array|Object} transitions
 * @param {Object} context
 * @param {Object} event
 * @param {Object} guardRegistry
 * @returns {Object|null}
 */
export const selectTransition = (transitions, context, event, guardRegistry = {}) => {
  if (!transitions) return null;

  // Handle single transition
  if (!Array.isArray(transitions)) {
    const passes = evaluateGuard(transitions.cond, context, event, guardRegistry);
    return passes ? transitions : null;
  }

  // Handle array of transitions
  for (const transition of transitions) {
    const passes = evaluateGuard(transition.cond, context, event, guardRegistry);
    if (passes) {
      return transition;
    }
  }

  return null;
};

/**
 * @typedef {Object} TransitionConfig
 * @property {string} target
 * @property {Function} [cond]
 * @property {Array} [actions]
 */

/**
 * @param {Object} stateNode
 * @param {string} eventType
 * @param {Object} context
 * @param {Object} event
 * @param {Object} guardRegistry
 * @returns {TransitionConfig|null}
 */
export const resolveTransition = (stateNode, eventType, context, event, guardRegistry = {}) => {
  const transitions = stateNode.on[eventType];

  if (!transitions) {
    // Check for wildcard event handler
    if (stateNode.on['*']) {
      const wildcardTransitions = stateNode.on['*'];
      if (typeof wildcardTransitions === 'string') {
        return { target: wildcardTransitions, actions: [] };
      }
      const selected = selectTransition(wildcardTransitions, context, event, guardRegistry);
      if (selected) {
        return normalizeTransition(selected);
      }
    }
    return null;
  }

  // Handle string target
  if (typeof transitions === 'string') {
    return { target: transitions, actions: [] };
  }

  // Handle transition config or array
  const selected = selectTransition(transitions, context, event, guardRegistry);

  if (selected) {
    return normalizeTransition(selected);
  }

  return null;
};

/**
 * @param {string|TransitionConfig} transition
 * @returns {TransitionConfig}
 */
const normalizeTransition = (transition) => {
  if (typeof transition === 'string') {
    return { target: transition, actions: [] };
  }

  const actions = transition.actions || [];

  return {
    target: transition.target,
    actions: Array.isArray(actions) ? actions : [actions],
    cond: transition.cond
  };
};

/**
 * @param {Object} rootNode
 * @param {Object} currentNode
 * @param {string} target
 * @returns {Object|null}
 */
export const resolveTargetNode = (rootNode, currentNode, target) => {
  // Internal transition - no target means stay in current state
  if (target === undefined || target === null) {
    return null;
  }

  // Empty string also means internal transition
  if (target === '') {
    return null;
  }

  // Handle ID references
  if (target.startsWith('#')) {
    return findStateNode(rootNode, target);
  }

  // Try relative path from current node first
  const relative = findStateNode(currentNode, target);
  if (relative) return relative;

  // Search up the hierarchy for the target
  let searchNode = currentNode.parent;
  while (searchNode) {
    // Try to find target from this level
    const found = findStateNode(searchNode, target);
    if (found) return found;

    // Move up one level
    searchNode = searchNode.parent;
  }

  // Finally, try from root
  const fromRoot = findStateNode(rootNode, target);
  if (fromRoot) return fromRoot;

  return null;
};