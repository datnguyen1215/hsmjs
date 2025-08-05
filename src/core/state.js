/**
 * State factory for hierarchical state machines
 */

import { createTransition } from './transition.js'

/**
 * @param {string} id
 * @param {import('../../types/index.js').State|null} [parent=null]
 * @returns {import('../../types/index.js').State}
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