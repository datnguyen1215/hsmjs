import { findStateNode } from '../core/State.js';

/**
 * Evaluate a guard condition with object-based arguments
 * @param {Function|string} guard - Guard function or string reference
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @param {Object} guardRegistry - Registry of named guards
 * @param {Object} machine - Machine reference
 * @returns {boolean} - True if guard passes, false otherwise
 */
export const evaluateGuard = (guard, context, event, guardRegistry = {}, machine) => {
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
      const result = !!guardFn({ context, event, machine });
      return isNegated ? !result : result;
    } catch (error) {
      console.error(`Guard evaluation error for guard '${guardName}':`, error);
      return false;
    }
  }

  // Handle function guards
  if (typeof guard === 'function') {
    try {
      return !!guard({ context, event, machine });
    } catch (error) {
      console.error('Guard function evaluation error:', error);
      return false;
    }
  }

  // Handle complex guard objects (for AND/OR combinations)
  if (typeof guard === 'object' && guard !== null) {
    if (guard.type === 'and') {
      return guard.guards.every(g => evaluateGuard(g, context, event, guardRegistry, machine));
    }
    if (guard.type === 'or') {
      return guard.guards.some(g => evaluateGuard(g, context, event, guardRegistry, machine));
    }
    if (guard.type === 'not') {
      return !evaluateGuard(guard.guard, context, event, guardRegistry, machine);
    }
  }

  return true;
};

/**
 * Select the first valid transition from available options
 * @param {Array|Object} transitions - Single transition or array of transitions
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @param {Object} guardRegistry - Registry of named guards
 * @param {Object} machine - Machine reference
 * @returns {Object|null} - Selected transition or null if none match
 */
export const selectTransition = (transitions, context, event, guardRegistry = {}, machine) => {
  if (!transitions) return null;

  // Handle single transition
  if (!Array.isArray(transitions)) {
    const passes = evaluateGuard(transitions.cond, context, event, guardRegistry, machine);
    return passes ? transitions : null;
  }

  // Handle array of transitions
  for (const transition of transitions) {
    const passes = evaluateGuard(transition.cond, context, event, guardRegistry, machine);
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
 * Resolve a transition from a state node for the given event
 * @param {Object} stateNode - Source state node
 * @param {string} eventType - Type of event to handle
 * @param {Object} context - Current context
 * @param {Object} event - Event object
 * @param {Object} guardRegistry - Registry of named guards
 * @param {Object} machine - Machine reference
 * @returns {TransitionConfig|null} - Resolved transition configuration or null
 */
export const resolveTransition = (stateNode, eventType, context, event, guardRegistry = {}, machine) => {
  const transitions = stateNode.on[eventType];

  if (!transitions) {
    // Check for wildcard event handler
    if (stateNode.on['*']) {
      const wildcardTransitions = stateNode.on['*'];
      if (typeof wildcardTransitions === 'string') {
        return { target: wildcardTransitions, actions: [] };
      }
      const selected = selectTransition(wildcardTransitions, context, event, guardRegistry, machine);
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
  const selected = selectTransition(transitions, context, event, guardRegistry, machine);

  if (selected) {
    return normalizeTransition(selected);
  }

  return null;
};

/**
 * Normalize a transition to standard configuration format
 * @param {string|TransitionConfig} transition - Transition to normalize
 * @returns {TransitionConfig} - Normalized transition with target, actions, and optional cond
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
 * Resolve target node from string reference using hierarchical search
 * @param {Object} rootNode - Root state node
 * @param {Object} currentNode - Current state node for relative resolution
 * @param {string} target - Target state reference (path or ID)
 * @returns {Object|null} - Resolved target state node or null if not found
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