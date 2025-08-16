import { createStateNode, findStateNode } from './State.js';
import { cloneContext } from './ContextCloner.js';
import { getStateNode, initializeState, getStatePath } from './StateNavigator.js';
import { createEventEmitter } from '../utils/EventEmitter.js';
import { createQueueManager } from './QueueManager.js';
import { processEventSync, processEventAsync } from './EventProcessor.js';
import { executeActionsSync } from './ActionRunner.js';

/**
 * Creates a machine instance
 * @param {Object} config
 * @param {Object} [options]
 * @returns {Object}
 */
export const Machine = (config, options = {}) => {
  // Private state
  const rootNode = createStateNode(config.id, {
    initial: config.initial,
    states: config.states
  });
  const actions = options.actions || {};
  const guards = options.guards || {};
  const historySize = options.historySize || 50;

  // Runtime state (previously in MachineService)
  let _context = cloneContext(config.context || {});
  const eventEmitter = createEventEmitter();
  const queueManager = createQueueManager();
  const _stateHistory = [];

  // Only track last event for notifications
  let _lastEvent = null;

  const pushToHistory = () => {
    _stateHistory.push({
      state,
      context: cloneContext(_context)
    });
    // Keep only the last historySize entries
    if (_stateHistory.length > historySize) {
      _stateHistory.splice(0, _stateHistory.length - historySize);
    }
  };

  const applyStateUpdate = (newState, newContext) => {
    state = newState;
    _context = newContext;
    pushToHistory();
    notifySubscribers();
  };

  const scheduleNextEvent = (isAsync) => {
    setTimeout(() => isAsync ? processNextQueuedEvent() : processNextQueuedEventSync(), 0);
  };

  // Create event processing functions that update our local state
  const processEvent = (event) => {
    _lastEvent = event;

    const result = processEventSync(event, state, _context, rootNode, guards, actions, executeActionsSync);
    if (!result.wasAsync) {
      applyStateUpdate(result.value.state, result.value.context);
    }
    return result;
  };

  const processEventAsyncHandler = async (event) => {
    _lastEvent = event;

    const result = await processEventAsync(event, state, _context, rootNode, guards, actions);
    applyStateUpdate(result.state, result.context);
    return result;
  };

  // Initialize queue event processors
  const { processNextQueuedEventSync, processNextQueuedEvent } = queueManager.createEventProcessor(processEvent, processEventAsyncHandler);

  const notifySubscribers = () => {
    // Get previous state from history
    const previousSnapshot = _stateHistory.length > 1
      ? _stateHistory[_stateHistory.length - 2]
      : { state: config.initial, context: cloneContext(config.context || {}) };
    const currentSnapshot = _stateHistory[_stateHistory.length - 1];

    const transition = {
      previousState: previousSnapshot,
      nextState: currentSnapshot,
      event: _lastEvent
    };
    eventEmitter.notify(transition);
  };

  // Initialize with initial state, handling nested initial states
  let state = initializeState(rootNode, config.initial);

  // Execute initial entry actions
  const initialNode = getStateNode(rootNode, state);
  if (initialNode && initialNode.entry.length > 0) {
    const result = executeActionsSync(initialNode.entry, _context, {}, actions);
    _context = result.context;
  }

  // Store initial state in history
  pushToHistory();

  // Helper functions for validation
  const normalizeTransitions = (transition) => {
    return Array.isArray(transition) ? transition : [transition];
  };

  const forEachChildState = (node, statePath, callback) => {
    if (node.states) {
      for (const [childKey, childNode] of Object.entries(node.states)) {
        const childPath = statePath ? `${statePath}.${childKey}` : childKey;
        callback(childNode, childPath);
      }
    }
  };

  // Validation helper functions
  /**
   * @returns {{errors: Array, warnings: Array}}
   */
  const validateStateTransitions = () => {
    const errors = [];
    const warnings = [];

    const checkTransitions = (node, statePath) => {
      // Check all transitions for this state
      if (node.on) {
        for (const [event, transition] of Object.entries(node.on)) {
          const transitions = normalizeTransitions(transition);

          for (const trans of transitions) {
            const normalizedTrans = typeof trans === 'string'
              ? { target: trans }
              : trans;

            if (normalizedTrans && normalizedTrans.target) {
              // Check if target state exists
              // For relative paths, search from the current node's parent (for sibling states)
              // For absolute paths or ID refs, search from root
              let searchNode = node;
              const target = normalizedTrans.target;

              if (target.startsWith('#')) {
                // ID reference - search from root
                searchNode = rootNode;
              } else if (!target.includes('.')) {
                // Simple relative reference - search from parent for siblings
                searchNode = node.parent || rootNode;
              } else {
                // Complex path - search from root
                searchNode = rootNode;
              }

              const targetNode = findStateNode(searchNode, target);
              if (!targetNode) {
                errors.push({
                  type: 'INVALID_TARGET',
                  state: statePath,
                  event: event,
                  target: normalizedTrans.target
                });
              }
            }
          }
        }
      }

      // Recursively check child states
      forEachChildState(node, statePath, checkTransitions);
    };

    checkTransitions(rootNode, '');
    return { errors, warnings };
  };

  /**
   * @returns {Array}
   */
  const validateGuardReferences = () => {
    const errors = [];

    const checkGuards = (node, statePath) => {
      if (node.on) {
        for (const [event, transition] of Object.entries(node.on)) {
          const transitions = normalizeTransitions(transition);

          for (const trans of transitions) {
            if (trans && typeof trans === 'object' && trans.cond) {
              const guard = trans.cond;

              // Check string guard references
              if (typeof guard === 'string') {
                const guardName = guard.startsWith('!') ? guard.slice(1) : guard;
                if (!guards[guardName]) {
                  errors.push({
                    type: 'MISSING_GUARD',
                    guard: guardName,
                    state: statePath,
                    event: event
                  });
                }
              }
            }
          }
        }
      }

      // Recursively check child states
      forEachChildState(node, statePath, checkGuards);
    };

    checkGuards(rootNode, '');
    return errors;
  };

  /**
   * @returns {Array}
   */
  const validateActionReferences = () => {
    const errors = [];

    const checkActions = (node, statePath) => {
      // Check entry and exit actions
      const checkActionList = (actionList, actionType) => {
        for (const action of actionList) {
          if (typeof action === 'string' && !actions[action]) {
            errors.push({
              type: 'MISSING_ACTION',
              action: action,
              state: statePath,
              actionType: actionType
            });
          }
        }
      };

      if (node.entry && node.entry.length > 0) {
        checkActionList(node.entry, 'entry');
      }

      if (node.exit && node.exit.length > 0) {
        checkActionList(node.exit, 'exit');
      }

      // Check transition actions
      if (node.on) {
        for (const [event, transition] of Object.entries(node.on)) {
          const transitions = normalizeTransitions(transition);

          for (const trans of transitions) {
            if (trans && typeof trans === 'object' && trans.actions) {
              const transActions = Array.isArray(trans.actions) ? trans.actions : [trans.actions];
              for (const action of transActions) {
                if (typeof action === 'string' && !actions[action]) {
                  errors.push({
                    type: 'MISSING_ACTION',
                    action: action,
                    state: statePath,
                    event: event
                  });
                }
              }
            }
          }
        }
      }

      // Recursively check child states
      forEachChildState(node, statePath, checkActions);
    };

    checkActions(rootNode, '');
    return errors;
  };

  /**
   * @returns {Array}
   */
  const validateNestedStates = () => {
    const errors = [];

    const checkNestedInitial = (node, statePath) => {
      // Check if compound state has valid initial state
      if (node.states && Object.keys(node.states).length > 0 && node.initial) {
        if (!node.states[node.initial]) {
          errors.push({
            type: 'INVALID_INITIAL',
            state: statePath,
            initial: node.initial
          });
        }
      }

      // Recursively check child states
      forEachChildState(node, statePath, checkNestedInitial);
    };

    checkNestedInitial(rootNode, '');
    return errors;
  };

  /**
   * @returns {Array}
   */
  const validateStateReachability = () => {
    const warnings = [];
    const reachableStates = new Set();

    // Mark initial state and its children as reachable
    const markReachable = (statePath) => {
      reachableStates.add(statePath);
      const node = getStateNode(rootNode, statePath);
      if (node && node.states) {
        for (const childKey of Object.keys(node.states)) {
          const childPath = statePath ? `${statePath}.${childKey}` : childKey;
          markReachable(childPath);
        }
      }
    };

    // Start with initial state
    markReachable(config.initial);

    // Find all states that are targets of transitions
    const findTransitionTargets = (node) => {
      if (node.on) {
        for (const transition of Object.values(node.on)) {
          const transitions = normalizeTransitions(transition);
          for (const trans of transitions) {
            const target = typeof trans === 'string' ? trans : trans?.target;
            if (target) {
              // Resolve the target to get the actual state path
              const targetNode = findStateNode(rootNode, target);
              if (targetNode) {
                // Extract state path from node id
                const statePath = targetNode.id.replace(/^[^.]*\./, '');
                markReachable(statePath);
              }
            }
          }
        }
      }

      // Check child states
      if (node.states) {
        for (const childNode of Object.values(node.states)) {
          findTransitionTargets(childNode);
        }
      }
    };

    findTransitionTargets(rootNode);

    // Check for unreachable states
    const checkUnreachable = (node, statePath) => {
      if (statePath && !reachableStates.has(statePath)) {
        warnings.push({
          type: 'UNREACHABLE_STATE',
          state: statePath
        });
      }

      forEachChildState(node, statePath, checkUnreachable);
    };

    checkUnreachable(rootNode, '');

    // Check for empty states (states with no transitions, actions, or children)
    const checkEmpty = (node, statePath) => {
      const hasTransitions = node.on && Object.keys(node.on).length > 0;
      const hasActions = (node.entry && node.entry.length > 0) || (node.exit && node.exit.length > 0);
      const hasChildren = node.states && Object.keys(node.states).length > 0;

      if (statePath && !hasTransitions && !hasActions && !hasChildren) {
        warnings.push({
          type: 'EMPTY_STATE',
          state: statePath
        });
      }

      forEachChildState(node, statePath, checkEmpty);
    };

    checkEmpty(rootNode, '');

    return warnings;
  };

  // Public API
  return {
    get config() { return config; },
    get options() { return options; },
    get id() { return config.id; },
    get initial() { return config.initial; },
    get rootNode() { return rootNode; },
    get actions() { return actions; },
    get guards() { return guards; },
    get state() { return state; },
    get context() { return cloneContext(_context); },
    get isTransitioning() { return queueManager.getIsTransitioning(); },
    get eventQueue() { return queueManager.eventQueue; },
    get historySize() { return _stateHistory.length; },
    get history() { return [..._stateHistory]; },
    get snapshot() {
      // Return the last history entry as the current snapshot
      return _stateHistory[_stateHistory.length - 1] || { state, context: cloneContext(_context) };
    },

    /**
     * @param {string} eventType
     * @param {Object} [payload]
     * @returns {Promise<{state: string, context: Object, results: Array}>}
     */
    send(eventType, payload = {}) {
      const event = { type: eventType, ...payload };

      // Queue event if currently transitioning
      if (queueManager.getIsTransitioning()) {
        return new Promise((resolve, reject) => {
          queueManager.enqueue(event, resolve, reject);
        });
      }

      queueManager.setIsTransitioning(true);

      try {
        // Try synchronous execution first
        const result = processEvent(event);

        if (result.wasAsync) {
          // Switch to async processing
          return processEventAsyncHandler(event).finally(() => {
            queueManager.setIsTransitioning(false);
            scheduleNextEvent(true);
          });
        } else {
          queueManager.setIsTransitioning(false);
          // Process next queued event synchronously
          scheduleNextEvent(false);
          return Promise.resolve(result.value);
        }
      } catch (error) {
        queueManager.setIsTransitioning(false);
        return Promise.reject(error);
      }
    },

    /**
     * Clear all queued events
     * @returns {number} Number of events cleared
     */
    clearQueue() {
      return queueManager.clearQueue();
    },

    /**
     * Send event with priority (clears queue and processes immediately)
     * @param {string} eventType
     * @param {Object} [payload]
     * @returns {Promise<{state: string, context: Object, results: Array}>}
     */
    sendPriority(eventType, payload = {}) {
      // Clear the current queue first, rejecting all pending events
      this.clearQueue();

      // Then send the priority event normally
      return this.send(eventType, payload);
    },

    /**
     * @param {string|Object} stateValue
     * @returns {boolean}
     */
    matches(stateValue) {
      if (typeof stateValue === 'string') {
        // Check exact match
        if (state === stateValue) {
          return true;
        }
        // Check if current state is a descendant
        if (state.startsWith(stateValue + '.')) {
          return true;
        }
        return false;
      }

      // Handle nested object notation
      if (typeof stateValue === 'object' && stateValue !== null) {
        const currentParts = state.split('.');

        const checkNested = (obj, level = 0) => {
          if (level >= currentParts.length) return false;

          for (const key in obj) {
            if (currentParts[level] !== key) {
              continue;
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              return checkNested(obj[key], level + 1);
            }
            if (typeof obj[key] === 'string') {
              return currentParts.slice(level + 1).join('.') === obj[key] ||
                     currentParts.slice(level + 1).join('.').startsWith(obj[key] + '.');
            }
            return level === currentParts.length - 1;
          }
          return false;
        };

        return checkNested(stateValue);
      }

      return false;
    },

    /**
     * @param {Function} callback
     * @returns {Function}
     */
    subscribe(callback) {
      return eventEmitter.subscribe(callback);
    },

    /**
     * Restore machine to a specific snapshot state.
     * Note: This does NOT execute entry/exit actions.
     * @param {Object} snapshot - Object with state and context properties
     * @returns {Promise<{state: string, context: Object}>}
     */
    restore(snapshot) {
      // Validate snapshot parameter
      if (!snapshot || typeof snapshot !== 'object') {
        return Promise.reject(new Error('Snapshot must be an object'));
      }
      if (!snapshot.hasOwnProperty('state') || !snapshot.hasOwnProperty('context')) {
        return Promise.reject(new Error('Snapshot must have state and context properties'));
      }

      // Validate that the state exists in the machine definition
      const stateNode = getStateNode(rootNode, snapshot.state);
      if (!stateNode) {
        return Promise.reject(new Error(`Invalid state in snapshot: ${snapshot.state}`));
      }

      _lastEvent = { type: 'RESTORE' };

      // Restore state and context from snapshot
      state = snapshot.state;
      _context = cloneContext(snapshot.context);

      // Clear any queued events
      queueManager.clearQueue();

      // Push to history
      pushToHistory();

      // Notify subscribers
      notifySubscribers();

      return Promise.resolve({ state, context: cloneContext(_context) });
    },

    /**
     * Validates the machine configuration and structure.
     * Checks for invalid transitions, missing guards/actions, unreachable states, etc.
     * @returns {{valid: boolean, errors: Array, warnings: Array}}
     */
    validate() {
      const errors = [];
      const warnings = [];

      // Run all validation checks
      const transitionValidation = validateStateTransitions();
      errors.push(...transitionValidation.errors);
      warnings.push(...transitionValidation.warnings);

      const guardErrors = validateGuardReferences();
      errors.push(...guardErrors);

      const actionErrors = validateActionReferences();
      errors.push(...actionErrors);

      const nestedErrors = validateNestedStates();
      errors.push(...nestedErrors);

      const reachabilityWarnings = validateStateReachability();
      warnings.push(...reachabilityWarnings);

      return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
      };
    }
  };
};