import { createStateNode } from './State.js';
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
    }
  };
};