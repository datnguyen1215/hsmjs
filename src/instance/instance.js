/**
 * Instance class representing a running state machine
 * Handles state transitions, actions, and event processing
 */

import { HistoryManager } from '../core/history-manager.js'

export class Instance {
  /**
   * Create a new instance
   * @param {Machine} machine - Machine definition
   * @param {Object} initialContext - Initial context
   * @param {Object} options - Configuration options
   * @param {Object} options.history - History configuration
   */
  constructor(machine, initialContext, options = {}) {
    this.machine = machine
    // Deep clone context to ensure isolation
    this.context = JSON.parse(JSON.stringify(initialContext || {}))
    this.currentState = null
    this.listeners = []

    // Initialize history manager
    this.historyManager = new HistoryManager(options.history)

    // Enter initial state
    const targetState = this._resolveDeepestState(machine.initialState)

    // Enter all ancestor states and the target state
    const ancestors = targetState.getAncestors()
    for (const ancestor of ancestors) {
      this._enterState(ancestor)
    }
    this._enterState(targetState)

    this.currentState = targetState

    // Record initial state in history
    this.historyManager.recordTransition(
      null, // No previous state
      targetState.path,
      this.context,
      'init',
      { initialization: true }
    )
  }

  /**
   * Get current state ID
   * @returns {string} Current state path
   */
  get current() {
    return this.currentState ? this.currentState.path : null
  }

  /**
   * Send event to the machine
   * @param {string} eventName - Event name
   * @param {any} payload - Event payload
   * @returns {Promise<Object>} Action results
   */
  async send(eventName, payload) {
    const event = {
      type: eventName,
      ...payload
    }

    // Find matching transition
    const transition = this._findTransition(eventName, event)

    if (!transition) {
      // No transition found, return empty results
      return {}
    }

    // Execute the transition
    return await this._executeTransition(transition, event)
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Listener function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get history interface with query and navigation methods
   * @returns {Object} History interface
   */
  history() {
    return this.historyManager.getHistory()
  }

  /**
   * Rollback to a specific history entry
   * @param {Object} targetEntry - History entry to rollback to
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(targetEntry) {
    if (!targetEntry || !targetEntry.id) {
      return {
        success: false,
        error: {
          code: 'INVALID_ENTRY',
          message: 'Target entry is required and must have an ID'
        }
      }
    }

    // Validate that entry exists in history
    if (!this.historyManager.canRollback(targetEntry)) {
      return {
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Target entry not found in current history'
        }
      }
    }

    try {
      const fromEntry = this.historyManager.getCurrentEntry()
      const fromState = this.currentState

      // Restore state and context from history entry
      const targetState = this.machine.findState(targetEntry.toState)
      if (!targetState) {
        return {
          success: false,
          error: {
            code: 'STATE_NOT_FOUND',
            message: `State '${targetEntry.toState}' not found in machine definition`
          }
        }
      }

      // Perform rollback transition
      this._performRollback(fromState, targetState, targetEntry)

      // Update context from history
      this.context = JSON.parse(JSON.stringify(targetEntry.context))

      // Record rollback in history
      const stepsBack = this.historyManager.getStepsBack(targetEntry)
      this.historyManager.recordTransition(
        fromState.path,
        targetState.path,
        this.context,
        'rollback',
        {
          rollback: true,
          targetEntryId: targetEntry.id,
          stepsBack
        }
      )

      return {
        success: true,
        fromEntry,
        toEntry: targetEntry,
        stepsBack,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ROLLBACK_FAILED',
          message: error.message,
          details: error
        }
      }
    }
  }

  /**
   * Configure history options
   * @param {Object} options - History configuration options
   */
  configureHistory(options) {
    this.historyManager.configure(options)
  }

  /**
   * Get memory usage information
   * @returns {Object} Memory usage statistics
   */
  getHistoryMemoryUsage() {
    return this.historyManager.getMemoryUsage()
  }

  /**
   * Clear all history (useful for testing or memory management)
   */
  clearHistory() {
    this.historyManager.clear()
  }

  /**
   * Find matching transition for event
   * @private
   */
  _findTransition(eventName, event) {
    // Check current state transitions first
    let transitions = this.currentState.getTransitions(eventName)

    // Check parent states if no transition found
    if (transitions.length === 0) {
      let parent = this.currentState.parent
      while (parent && transitions.length === 0) {
        transitions = parent.getTransitions(eventName)
        parent = parent.parent
      }
    }

    // Check global transitions
    if (transitions.length === 0) {
      transitions = this.machine.globalTransitions.get(eventName) || []
    }

    // Find first transition with passing guards
    for (const transition of transitions) {
      if (transition.canTake(this.context, event)) {
        return transition
      }
    }

    return null
  }

  /**
   * Execute a transition
   * @private
   */
  async _executeTransition(transition, event) {
    const fromState = this.currentState

    try {
      // Execute blocking actions first
      const results = await transition.executeBlockingActions(
        this.context,
        event
      )

      // Resolve target state
      const targetState = transition.resolveTarget(this.context, event, id =>
        this.machine.findState(id)
      )

      if (!targetState) {
        throw new Error(`Target state not found for transition`)
      }

      // Perform state transition
      this._performTransition(fromState, targetState, event)

      // Execute fire actions after transition
      transition.executeFireActions(this.context, event)

      return results
    } catch (error) {
      // Transition failed, stay in current state
      throw error
    }
  }

  /**
   * Perform state transition
   * @private
   */
  _performTransition(fromState, toState, event) {
    const fromStatePath = fromState ? fromState.path : null

    // Exit current state and ancestors
    const exitStates = this._getExitStates(fromState, toState)
    for (const state of exitStates) {
      this._exitState(state, event)
    }

    // Enter target state and ancestors
    const enterStates = this._getEnterStates(fromState, toState)
    for (const state of enterStates) {
      this._enterState(state, event)
    }

    // Update current state
    this.currentState = this._resolveDeepestState(toState)

    // Record transition in history (if not a rollback)
    if (!event.rollback) {
      this.historyManager.recordTransition(
        fromStatePath,
        this.currentState.path,
        this.context,
        event.type,
        {
          timestamp: Date.now(),
          transitionType: 'normal'
        }
      )
    }

    // Notify listeners
    this._notifyListeners({
      from: fromStatePath,
      to: this.currentState.path,
      event: event.type
    })
  }

  /**
   * Perform rollback transition (similar to normal transition but without history recording)
   * @private
   */
  _performRollback(fromState, toState, targetEntry) {
    // Exit current state and ancestors
    const exitStates = this._getExitStates(fromState, toState)
    for (const state of exitStates) {
      this._exitState(state, { type: 'rollback', rollback: true })
    }

    // Enter target state and ancestors
    const enterStates = this._getEnterStates(fromState, toState)
    for (const state of enterStates) {
      this._enterState(state, { type: 'rollback', rollback: true })
    }

    // Update current state
    this.currentState = this._resolveDeepestState(toState)

    // Notify listeners
    this._notifyListeners({
      from: fromState.path,
      to: this.currentState.path,
      event: 'rollback',
      rollback: true,
      targetEntry
    })
  }

  /**
   * Get states to exit during transition
   * @private
   */
  _getExitStates(from, to) {
    const exitStates = []
    let current = from

    // Special case: self-transition
    if (from === to) {
      return [from]
    }

    // Exit states until we find common ancestor
    while (current && !to.isChildOf(current) && current !== to) {
      exitStates.push(current)
      current = current.parent
    }

    return exitStates
  }

  /**
   * Get states to enter during transition
   * @private
   */
  _getEnterStates(from, to) {
    // Special case: self-transition
    if (from === to) {
      return [to]
    }

    const enterStates = []
    const ancestors = to.getAncestors()

    // Find states that need to be entered
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const ancestor = ancestors[i]
      if (!from.isChildOf(ancestor) && from !== ancestor) {
        enterStates.push(ancestor)
      }
    }

    enterStates.push(to)
    return enterStates
  }

  /**
   * Enter a state
   * @private
   */
  _enterState(state, event) {
    // Execute entry actions
    for (const action of state.entryActions) {
      try {
        action(this.context, event)
      } catch (error) {
        console.error('Entry action error:', error)
      }
    }
  }

  /**
   * Exit a state
   * @private
   */
  _exitState(state, event) {
    // Execute exit actions
    for (const action of state.exitActions) {
      try {
        action(this.context, event)
      } catch (error) {
        console.error('Exit action error:', error)
      }
    }
  }

  /**
   * Resolve deepest state considering initial states
   * @private
   */
  _resolveDeepestState(state) {
    let current = state

    // Traverse to deepest initial state
    while (current.initialChild) {
      const child = current.children.get(current.initialChild)
      if (!child) break
      current = child
    }

    return current
  }

  /**
   * Notify all listeners
   * @private
   */
  _notifyListeners(event) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Listener error:', error)
      }
    }
  }
}
