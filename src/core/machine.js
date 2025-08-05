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
  const states = new Map()
  const globalTransitions = new Map()
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

    // Check global transitions
    if (transitions.length === 0) {
      transitions = globalTransitions.get(eventName) || []
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
      id => machine.findState(id)
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
    states,
    globalTransitions,

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

      if (states.has(id)) {
        throw new Error(`State '${id}' already exists`)
      }

      const state = createState(id)
      states.set(id, state)
      return state
    },

    initial(stateOrId) {
      if (!stateOrId) {
        throw new Error('Initial state is required')
      }

      if (typeof stateOrId === 'string') {
        const state = machine.findState(stateOrId)
        if (!state) {
          throw new Error(`State '${stateOrId}' not found`)
        }
        initialState = state
      } else {
        // Check if the state belongs to this machine
        if (!states.has(stateOrId.id)) {
          throw new Error(`State '${stateOrId.id}' not found in machine`)
        }
        initialState = stateOrId
      }
      return machine
    },

    on(event, target) {
      if (!globalTransitions.has(event)) {
        globalTransitions.set(event, [])
      }
      const transition = createTransition(event, target, null)
      globalTransitions.get(event).push(transition)
      return transition
    },

    // === Instance Methods ===

    start(initialContext = {}, options = {}) {
      if (started) {
        throw new Error('Machine already started')
      }

      if (!initialState) {
        throw new Error('No initial state defined')
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

    // === Utility Methods ===

    findState(id) {
      if (states.has(id)) {
        return states.get(id)
      }

      // Check nested states
      const parts = id.split('.')
      let current = states.get(parts[0])

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

      for (const state of states.values()) {
        collectStates(state)
      }

      return allStates
    }
  }

  return machine
}