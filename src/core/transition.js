/**
 * Transition class representing state transitions
 * Supports guards, synchronous/asynchronous actions, and fire-and-forget actions
 */

export class Transition {
  /**
   * Create a new transition
   * @param {string} event - Event name
   * @param {State|string|Function} target - Target state
   * @param {State} source - Source state
   */
  constructor(event, target, source) {
    this.event = event;
    this.target = target;
    this.source = source;
    this.guards = [];
    this.blockingActions = []; // Combined sync and async actions
    this.fireActions = [];
  }
  
  /**
   * Add guard condition
   * @param {Function} guard - Guard function (ctx, event) => boolean
   * @returns {Transition} This transition for chaining
   */
  if(guard) {
    this.guards.push(guard);
    return this;
  }
  
  /**
   * Add synchronous action
   * @param {Function} action - Action function (ctx, event) => any
   * @returns {Transition} This transition for chaining
   */
  do(action) {
    this.blockingActions.push({ type: 'sync', action });
    return this;
  }
  
  /**
   * Add asynchronous action
   * @param {Function} action - Async action function (ctx, event) => Promise
   * @returns {Transition} This transition for chaining
   */
  doAsync(action) {
    this.blockingActions.push({ type: 'async', action });
    return this;
  }
  
  /**
   * Add fire-and-forget action
   * @param {Function} action - Action to execute without waiting
   * @returns {Transition} This transition for chaining
   */
  fire(action) {
    this.fireActions.push(action);
    return this;
  }
  
  /**
   * Check if transition can be taken
   * @param {Object} context - Machine context
   * @param {Object} event - Event object
   * @returns {boolean} True if all guards pass
   */
  canTake(context, event) {
    return this.guards.every(guard => {
      try {
        return guard(context, event);
      } catch (error) {
        // Treat guard errors as false
        return false;
      }
    });
  }
  
  /**
   * Execute all blocking actions (sync and async)
   * @param {Object} context - Machine context
   * @param {Object} event - Event object
   * @returns {Promise<Object>} Results from actions
   */
  async executeBlockingActions(context, event) {
    const results = {};
    const allResults = [];
    
    // Execute all blocking actions in order
    for (const { type, action } of this.blockingActions) {
      const name = action.actionName || 'anonymous';
      try {
        let result;
        if (type === 'async') {
          result = await action(context, event);
        } else {
          result = action(context, event);
        }
        if (result !== undefined) {
          allResults.push(result);
        }
      } catch (error) {
        error.action = name;
        throw error;
      }
    }
    
    // Merge all results
    for (const result of allResults) {
      Object.assign(results, result);
    }
    
    return results;
  }
  
  /**
   * Execute fire-and-forget actions
   * @param {Object} context - Machine context
   * @param {Object} event - Event object
   */
  executeFireActions(context, event) {
    // Execute all fire actions in order without blocking
    (async () => {
      for (const action of this.fireActions) {
        try {
          await action(context, event);
        } catch (error) {
          // Log but don't throw
          console.error('Fire action error:', error);
        }
      }
    })();
  }
  
  /**
   * Resolve target state
   * @param {Object} context - Machine context
   * @param {Object} event - Event object
   * @param {Function} stateResolver - Function to resolve state IDs
   * @returns {State|null} Resolved target state
   */
  resolveTarget(context, event, stateResolver) {
    if (typeof this.target === 'function') {
      const result = this.target(context, event);
      if (typeof result === 'string') {
        return stateResolver(result);
      }
      return result;
    }
    
    if (typeof this.target === 'string') {
      // Handle parent references
      if (this.target.startsWith('^')) {
        return this.source.findRelative(this.target);
      }
      return stateResolver(this.target);
    }
    
    return this.target;
  }
}