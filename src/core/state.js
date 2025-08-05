/**
 * State factory for hierarchical state machines
 */

import { createTransition } from './transition.js'

/**
 * @typedef {Object} State
 * @property {string} id - State identifier
 * @property {State|null} parent - Parent state
 * @property {string} path - Full path from root
 * @property {Map<string, State>} children - Child states
 * @property {Map<string, Array>} transitions - State transitions
 * @property {Array<Function>} entryActions - Entry actions
 * @property {Array<Function>} exitActions - Exit actions
 * @property {string|null} initialChild - Initial child state
 * @property {(id: string) => State} state - Create or get child state
 * @property {(child: State|string) => State} initial - Set initial child state
 * @property {(action: Function) => State} enter - Add entry action
 * @property {(action: Function) => State} exit - Add exit action
 * @property {(event: string, target: string|State|Function) => Transition} on - Create transition
 * @property {(event: string) => Array<Transition>} getTransitions - Get transitions for event
 * @property {(ancestor: State) => boolean} isChildOf - Check if descendant of ancestor
 * @property {(path: string) => State|null} findRelative - Find state by relative path
 * @property {() => Array<State>} getAncestors - Get all ancestor states
 */

/**
 * @param {string} id
 * @param {State|null} [parent=null]
 * @returns {State}
 */
export const createState = (id, parent = null) => {
  if (!id || typeof id !== 'string') {
    throw new Error('State ID is required')
  }

  // Private state via closure
  const children = new Map()
  const transitions = new Map()
  const entryActions = []
  const exitActions = []
  let initialChild = null

  // Public interface
  const state = {
    id,
    parent,
    path: parent ? `${parent.path}.${id}` : id,
    children,
    transitions,
    entryActions,
    exitActions,

    get initialChild() {
      return initialChild
    },

    state(childId) {
      if (!children.has(childId)) {
        const child = createState(childId, state)
        children.set(childId, child)
      }
      return children.get(childId)
    },

    initial(stateOrId) {
      if (typeof stateOrId === 'string') {
        initialChild = stateOrId
      } else {
        initialChild = stateOrId.id
      }
      return state
    },

    enter(action) {
      entryActions.push(action)
      return state
    },

    exit(action) {
      exitActions.push(action)
      return state
    },

    on(event, target) {
      const transition = createTransition(event, target, state)
      if (!transitions.has(event)) {
        transitions.set(event, [])
      }
      transitions.get(event).push(transition)
      return transition
    },

    getTransitions(event) {
      return transitions.get(event) || []
    },

    isChildOf(ancestor) {
      let current = parent
      while (current) {
        if (current === ancestor) return true
        current = current.parent
      }
      return false
    },

    findRelative(path) {
      if (!path.startsWith('^')) {
        return null
      }

      let current = state
      const parts = path.split('.')

      for (const part of parts) {
        if (part === '^') {
          current = current.parent
          if (!current) return null
        } else if (part.match(/^\^+$/)) {
          const levels = part.length
          for (let i = 0; i < levels; i++) {
            current = current.parent
            if (!current) return null
          }
        } else {
          return current.children.get(part) || null
        }
      }

      return current
    },

    getAncestors() {
      const ancestors = []
      let current = parent
      while (current) {
        ancestors.push(current)
        current = current.parent
      }
      return ancestors.reverse()
    }
  }

  return state
}