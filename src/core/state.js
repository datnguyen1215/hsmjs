/**
 * State class representing a state in the state machine
 * Supports hierarchical states, transitions, and lifecycle actions
 */

import { Transition } from './transition.js'

export class State {
  /**
   * Create a new state
   * @param {string} id - State identifier
   * @param {State|null} parent - Parent state for hierarchical states
   */
  constructor(id, parent = null) {
    if (!id || typeof id !== 'string') {
      throw new Error('State ID is required')
    }
    this.id = id
    this.parent = parent
    this.children = new Map()
    this.transitions = new Map()
    this.entryActions = []
    this.exitActions = []
    this.initialChild = null

    // Compute full path
    this.path = parent ? `${parent.path}.${id}` : id
  }

  /**
   * Create or retrieve a child state
   * @param {string} id - Child state identifier
   * @returns {State} Child state
   */
  state(id) {
    if (!this.children.has(id)) {
      const child = new State(id, this)
      this.children.set(id, child)
    }
    return this.children.get(id)
  }

  /**
   * Set initial child state
   * @param {State|string} stateOrId - Initial state or its ID
   * @returns {State} This state for chaining
   */
  initial(stateOrId) {
    if (typeof stateOrId === 'string') {
      this.initialChild = stateOrId
    } else {
      this.initialChild = stateOrId.id
    }
    return this
  }

  /**
   * Add entry action
   * @param {Function} action - Action to execute on entry
   * @returns {State} This state for chaining
   */
  enter(action) {
    this.entryActions.push(action)
    return this
  }

  /**
   * Add exit action
   * @param {Function} action - Action to execute on exit
   * @returns {State} This state for chaining
   */
  exit(action) {
    this.exitActions.push(action)
    return this
  }

  /**
   * Define a transition
   * @param {string} event - Event name
   * @param {State|string|Function} target - Target state
   * @returns {Transition} Transition for configuration
   */
  on(event, target) {
    const transition = new Transition(event, target, this)

    if (!this.transitions.has(event)) {
      this.transitions.set(event, [])
    }
    this.transitions.get(event).push(transition)

    return transition
  }

  /**
   * Get all transitions for an event
   * @param {string} event - Event name
   * @returns {Array} Transitions for the event
   */
  getTransitions(event) {
    return this.transitions.get(event) || []
  }

  /**
   * Check if state is child of another state
   * @param {State} ancestor - Potential ancestor
   * @returns {boolean} True if child of ancestor
   */
  isChildOf(ancestor) {
    let current = this.parent
    while (current) {
      if (current === ancestor) return true
      current = current.parent
    }
    return false
  }

  /**
   * Find a state by relative path
   * @param {string} path - Relative path (e.g., '^', '^^', '^.sibling')
   * @returns {State|null} Found state or null
   */
  findRelative(path) {
    if (!path.startsWith('^')) {
      return null
    }

    let current = this
    const parts = path.split('.')

    // Process parent references
    for (const part of parts) {
      if (part === '^') {
        current = current.parent
        if (!current) return null
      } else if (part.match(/^\^+$/)) {
        // Multiple parent refs like ^^
        const levels = part.length
        for (let i = 0; i < levels; i++) {
          current = current.parent
          if (!current) return null
        }
      } else {
        // Child reference after parent refs
        return current.children.get(part) || null
      }
    }

    return current
  }

  /**
   * Get all ancestor states
   * @returns {Array} Ancestor states from root to immediate parent
   */
  getAncestors() {
    const ancestors = []
    let current = this.parent
    while (current) {
      ancestors.push(current)
      current = current.parent
    }
    return ancestors.reverse()
  }
}
