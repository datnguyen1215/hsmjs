/**
 * Simplified state machine implementation combining machine definition and instance
 */

import { createState } from './state.js'
import { createTransition } from './transition.js'
import { createHistoryManager } from './history.js'
import { createVisualizer } from './visualizer.js'

/**
 * @param {string} name
 * @returns {import('../../types/index.js').Machine}
 */
export const createMachine = (name) => {
  // Private state via closure
  const rootState = createState('_root')
  const listeners = []
  let initialState = null
  let context = {}
  let currentState = null
  let historyManager = null
  let started = false

  // Private methods
  const resolveDeepestState = (state) => {
    let current = state

    while (current.initialChild) {
      const child = current.children.get(current.initialChild)
      if (!child) break
      current = child
    }

    return current
  }

  const enterState = (state, event) => {
    for (const action of state.entryActions) {
      try {
        action(context, event)
      } catch (error) {
        // Silently continue
      }
    }
  }

  const exitState = (state, event) => {
    for (const action of state.exitActions) {
      try {
        action(context, event)
      } catch (error) {
        // Silently continue
      }
    }
  }

  const getExitStates = (from, to) => {
    if (!from) return []
    if (from === to) return [from]

    const exitStates = []
    let current = from

    while (current && !to.isChildOf(current) && current !== to) {
      exitStates.push(current)
      current = current.parent
    }

    return exitStates
  }

  const getEnterStates = (from, to) => {
    if (from === to) return [to]

    const enterStates = []
    const ancestors = to.getAncestors()

    for (let i = ancestors.length - 1; i >= 0; i--) {
      const ancestor = ancestors[i]
      if (!from || (!from.isChildOf(ancestor) && from !== ancestor)) {
        enterStates.push(ancestor)
      }
    }

    enterStates.push(to)
    return enterStates
  }

  const notifyListeners = (event) => {
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        // Silently continue
      }
    }
  }

  const performTransition = (fromState, toState, event) => {
    const fromPath = fromState ? fromState.path : null

    // Exit states
    const exitStates = getExitStates(fromState, toState)
    for (const state of exitStates) {
      exitState(state, event)
    }

    // Enter states
    const enterStates = getEnterStates(fromState, toState)
    for (const state of enterStates) {
      enterState(state, event)
    }

    // Update current state
    currentState = resolveDeepestState(toState)

    // Record transition
    if (!event.rollback && historyManager) {
      historyManager.recordTransition(
        fromPath,
        currentState.path,
        context,
        event.type,
        { timestamp: Date.now() }
      )
    }

    // Notify listeners
    notifyListeners({
      from: fromPath,
      to: currentState.path,
      event: event.type
    })
  }

  const findTransition = (eventName, event) => {
    // Check current state
    let transitions = currentState.getTransitions(eventName)

    // Check parent states
    if (transitions.length === 0) {
      let parent = currentState.parent
      while (parent && transitions.length === 0) {
        transitions = parent.getTransitions(eventName)
        parent = parent.parent
      }
    }

    // Check global transitions from root state
    if (transitions.length === 0) {
      transitions = rootState.getTransitions(eventName)
    }

    // Find first transition with passing guards
    for (const transition of transitions) {
      if (transition.canTake(context, event)) {
        return transition
      }
    }

    return null
  }

  const executeTransition = async (transition, event) => {
    const fromState = currentState

    // Execute blocking actions
    const results = await transition.executeBlockingActions(context, event)

    // Resolve target state
    const targetState = transition.resolveTarget(
      context,
      event,
      id => {
        // First try direct lookup
        let found = machine.findState(id)
        if (found) return found

        // If not found and source state exists, try relative to source
        if (transition.source && transition.source.parent) {
          // Try as sibling
          const sibling = transition.source.parent.children.get(id)
          if (sibling) return sibling

          // Try with parent path prefix
          const parentPath = transition.source.parent.path
          found = machine.findState(`${parentPath}.${id}`)
          if (found) return found
        }

        return null
      }
    )

    if (!targetState) {
      throw new Error('Target state not found')
    }

    // Perform transition
    performTransition(fromState, targetState, event)

    // Execute fire actions
    transition.executeFireActions(context, event)

    return results
  }

  // Public interface
  const machine = {
    name,
    rootState,

    get initialState() {
      return initialState
    },

    get context() {
      return context
    },

    get currentState() {
      return currentState
    },

    get current() {
      return currentState ? currentState.path : null
    },

    // === Machine Definition Methods ===

    state(id) {
      if (!id || typeof id !== 'string') {
        throw new Error('State ID is required')
      }

      if (rootState.children.has(id)) {
        throw new Error(`State '${id}' already exists`)
      }

      return rootState.state(id)
    },

    initial(stateOrId) {
      if (!stateOrId) {
        throw new Error('Initial state is required')
      }

      rootState.initial(stateOrId)

      // Keep track of the initial state for the machine
      if (typeof stateOrId === 'string') {
        initialState = machine.findState(stateOrId)
      } else {
        initialState = stateOrId
      }

      return machine
    },

    on(event, target) {
      if (typeof target !== 'string' && typeof target !== 'function') {
        throw new Error(`State transition target must be a string or function, got ${typeof target}`)
      }
      return rootState.on(event, target)
    },

    enter(action) {
      rootState.enter(action)
      return machine
    },

    exit(action) {
      rootState.exit(action)
      return machine
    },

    // === Instance Methods ===

    start(initialContext = {}, options = {}) {
      if (started) {
        throw new Error('Machine already started')
      }

      if (!rootState.initialChild) {
        throw new Error('No initial state defined')
      }

      // Get the actual initial state from rootState
      if (!initialState) {
        initialState = rootState.children.get(rootState.initialChild)
      }

      context = JSON.parse(JSON.stringify(initialContext))
      historyManager = createHistoryManager(options.history)

      // Enter initial state
      const targetState = resolveDeepestState(initialState)
      const ancestors = targetState.getAncestors()

      for (const ancestor of ancestors) {
        enterState(ancestor)
      }
      enterState(targetState)

      currentState = targetState
      started = true

      // Record initial state
      historyManager.recordTransition(
        null,
        targetState.path,
        context,
        'init',
        { initialization: true }
      )

      return machine
    },

    async send(eventName, payload) {
      if (!started) {
        throw new Error('Machine not started. Call start() first.')
      }

      const event = { type: eventName, ...payload }
      const transition = findTransition(eventName, event)

      if (!transition) {
        return {}
      }

      return await executeTransition(transition, event)
    },

    subscribe(listener) {
      listeners.push(listener)
      return () => {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    },

    history() {
      return historyManager ? historyManager.getHistory() : null
    },

    async rollback(targetEntry) {
      if (!targetEntry || !targetEntry.id) {
        return { success: false, error: 'Invalid entry' }
      }

      if (!historyManager.canRollback(targetEntry)) {
        return { success: false, error: 'Entry not found' }
      }

      const fromState = currentState
      const targetState = machine.findState(targetEntry.toState)

      if (!targetState) {
        return { success: false, error: 'State not found' }
      }

      // Perform rollback
      performTransition(fromState, targetState, { type: 'rollback', rollback: true })
      context = JSON.parse(JSON.stringify(targetEntry.context))

      const stepsBack = historyManager.getStepsBack(targetEntry)
      historyManager.recordTransition(
        fromState.path,
        targetState.path,
        context,
        'rollback',
        { rollback: true, targetEntryId: targetEntry.id, stepsBack }
      )

      return { success: true, stepsBack }
    },

    visualizer() {
      const visualizer = createVisualizer(machine)
      return visualizer.getInterface()
    },

    validate() {
      const errors = []

      // Check for initial state
      if (!rootState.initialChild) {
        errors.push('No initial state defined')
      }

      // Get all states
      const allStates = machine.getAllStates()
      const stateMap = new Map()

      // Build state map for quick lookup
      for (const state of allStates) {
        stateMap.set(state.path, state)
      }

      // Check all transitions for valid targets
      for (const state of allStates) {
        for (const transitions of state.transitions.values()) {
          for (const transition of transitions) {
            if (typeof transition.target === 'string') {
              // Try to resolve the target
              let targetPath = transition.target

              // Handle relative paths
              if (targetPath.startsWith('^')) {
                const relativeState = state.findRelative(targetPath)
                if (!relativeState) {
                  errors.push(`State '${state.path}' has invalid relative transition target: '${targetPath}'`)
                }
              } else {
                // Try absolute path first
                if (!stateMap.has(targetPath)) {
                  // Try relative to parent
                  if (state.parent) {
                    const siblingPath = `${state.parent.path}.${targetPath}`
                    if (!stateMap.has(siblingPath) && !stateMap.has(targetPath)) {
                      errors.push(`State '${state.path}' has invalid transition target: '${targetPath}'`)
                    }
                  } else if (!stateMap.has(targetPath)) {
                    errors.push(`State '${state.path}' has invalid transition target: '${targetPath}'`)
                  }
                }
              }
            }
          }
        }
      }

      // Check for unreachable states (excluding root state children as they're reachable)
      const reachableStates = new Set()

      // Mark initial state and its children as reachable
      if (rootState.initialChild) {
        const initial = rootState.children.get(rootState.initialChild)
        if (initial) {
          const markReachable = (state) => {
            reachableStates.add(state.path)
            for (const child of state.children.values()) {
              markReachable(child)
            }
          }
          markReachable(initial)
        }
      }

      // Mark all states that can be reached via transitions
      for (const state of allStates) {
        for (const transitions of state.transitions.values()) {
          for (const transition of transitions) {
            if (typeof transition.target === 'string') {
              let targetPath = transition.target

              // Resolve relative paths
              if (targetPath.startsWith('^')) {
                const relativeState = state.findRelative(targetPath)
                if (relativeState) {
                  reachableStates.add(relativeState.path)
                }
              } else {
                // Check absolute path
                if (stateMap.has(targetPath)) {
                  reachableStates.add(targetPath)
                } else if (state.parent) {
                  // Check sibling path
                  const siblingPath = `${state.parent.path}.${targetPath}`
                  if (stateMap.has(siblingPath)) {
                    reachableStates.add(siblingPath)
                  }
                }
              }
            }
          }
        }
      }

      // Check root state transitions (global transitions)
      for (const transitions of rootState.transitions.values()) {
        for (const transition of transitions) {
          if (typeof transition.target === 'string') {
            if (stateMap.has(transition.target)) {
              reachableStates.add(transition.target)
            }
          }
        }
      }

      // Find unreachable states
      for (const state of allStates) {
        if (!reachableStates.has(state.path)) {
          errors.push(`State '${state.path}' is unreachable`)
        }
      }

      return {
        valid: errors.length === 0,
        errors
      }
    },

    // === Utility Methods ===

    findState(id) {
      if (rootState.children.has(id)) {
        return rootState.children.get(id)
      }

      // Check nested states
      const parts = id.split('.')
      let current = rootState.children.get(parts[0])

      if (!current) return null

      for (let i = 1; i < parts.length; i++) {
        current = current.children.get(parts[i])
        if (!current) return null
      }

      return current
    },

    getAllStates() {
      const allStates = []

      const collectStates = state => {
        allStates.push(state)
        for (const child of state.children.values()) {
          collectStates(child)
        }
      }

      for (const state of rootState.children.values()) {
        collectStates(state)
      }

      return allStates
    }
  }

  return machine
}