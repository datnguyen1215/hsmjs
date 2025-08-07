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
  const machineConfig = config;
  const machineOptions = options;
  const id = config.id;
  const initial = config.initial;
  const rootNode = createStateNode(config.id, {
    initial: config.initial,
    states: config.states
  });
  const actions = options.actions || {};
  const guards = options.guards || {};

  // Runtime state (previously in MachineService)
  let _context = cloneContext(config.context || {});
  const eventEmitter = createEventEmitter();
  const queueManager = createQueueManager();

  // Helper functions use the imported modules
  const getStateNodeForPath = (statePath) => getStateNode(rootNode, statePath);








  // Create event processing functions that update our local state
  const processEvent = (event) => {
    const result = processEventSync(event, state, _context, rootNode, guards, actions, executeActionsSync);
    if (!result.wasAsync) {
      // Update local state from result
      state = result.value.state;
      _context = result.value.context;
      // Notify subscribers after state update
      notifySubscribers();
    }
    return result;
  };

  const processEventAsyncHandler = async (event) => {
    const result = await processEventAsync(event, state, _context, rootNode, guards, actions);
    // Update local state from result
    state = result.state;
    _context = result.context;
    // Notify subscribers after state update
    notifySubscribers();
    return result;
  };

  // Initialize queue event processors
  const { processNextQueuedEventSync, processNextQueuedEvent } = queueManager.createEventProcessor(processEvent, processEventAsyncHandler);

  const notifySubscribers = () => {
    const snapshot = {
      state,
      context: cloneContext(_context)
    };
    eventEmitter.notify(snapshot);
  };

  // Initialize with initial state, handling nested initial states
  let state = initializeState(rootNode, initial);

  // Execute initial entry actions
  const initialNode = getStateNodeForPath(state);
  if (initialNode && initialNode.entry.length > 0) {
    const result = executeActionsSync(initialNode.entry, _context, {}, actions);
    _context = result.context;
  }

  // Public API
  return {
    get config() { return machineConfig; },
    get options() { return machineOptions; },
    get id() { return id; },
    get initial() { return initial; },
    get rootNode() { return rootNode; },
    get actions() { return actions; },
    get guards() { return guards; },
    get state() { return state; },
    get context() { return cloneContext(_context); },
    get isTransitioning() { return queueManager.getIsTransitioning(); },
    get eventQueue() { return queueManager.eventQueue; },

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
          return processEventAsyncHandler(event).then(asyncResult => {
            queueManager.setIsTransitioning(false);
            // Process next queued event asynchronously
            setTimeout(() => processNextQueuedEvent(), 0);
            return asyncResult;
          }).catch(error => {
            queueManager.setIsTransitioning(false);
            // Process next queued event asynchronously
            setTimeout(() => processNextQueuedEvent(), 0);
            throw error;
          });
        } else {
          queueManager.setIsTransitioning(false);
          // Process next queued event synchronously
          setTimeout(() => processNextQueuedEventSync(), 0);
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

    // Expose for compatibility
    getStateNode: getStateNodeForPath,
    processEventSync: processEvent,
    processEventAsync: processEventAsyncHandler,
    executeActionsSync: (actionsList, context, event) => executeActionsSync(actionsList, context, event, actions),
    processNextQueuedEventSync,
    processNextQueuedEvent,
    initializeState: (parentNode, initialKey) => initializeState(parentNode, initialKey),
    getStatePath,
    notifySubscribers
  };
};