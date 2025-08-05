/**
 * Transition between states
 */

/**
 * @typedef {Object} Transition
 * @property {string} event - The event name
 * @property {string|Object|Function} target - The target state
 * @property {Object|null} source - The source state
 * @property {(guard: Function) => Transition} if - Add guard condition
 * @property {(action: Function) => Transition} do - Add synchronous action
 * @property {(action: Function) => Transition} fire - Add fire-and-forget action
 * @property {(context: Object, event: Object) => boolean} canTake - Check if transition can be taken
 * @property {(context: Object, event: Object) => Promise<Object>} executeBlockingActions - Execute all blocking actions
 * @property {(context: Object, event: Object) => void} executeFireActions - Execute fire-and-forget actions
 * @property {(context: Object, event: Object, stateResolver: Function) => Object|null} resolveTarget - Resolve target state
 */

/**
 * @param {string} event
 * @param {string|Object|Function} target
 * @param {Object|null} source
 * @returns {Transition}
 */
export const createTransition = (event, target, source) => {
  // Private state via closure
  const guards = []
  const actions = []
  const fireActions = []

  // Public interface
  const transition = {
    event,
    target,
    source,

    if(guard) {
      guards.push(guard)
      return transition
    },

    do(action) {
      actions.push(action)
      return transition
    },

    fire(action) {
      fireActions.push(action)
      return transition
    },

    canTake(context, event) {
      return guards.every(guard => {
        try {
          return guard(context, event)
        } catch {
          return false
        }
      })
    },

    async executeBlockingActions(context, event) {
      const results = {}

      for (const action of actions) {
        try {
          const result = await action(context, event)
          if (result !== undefined) {
            Object.assign(results, result)
          }
        } catch (error) {
          throw error
        }
      }

      return results
    },

    executeFireActions(context, event) {
      for (const action of fireActions) {
        Promise.resolve(action(context, event)).catch(error => {
          console.error('Fire action error:', error)
        })
      }
    },

    resolveTarget(context, event, stateResolver) {
      if (typeof target === 'function') {
        const result = target(context, event)
        if (typeof result === 'string') {
          return stateResolver(result)
        }
        return result
      }

      if (typeof target === 'string') {
        if (target.startsWith('^')) {
          return source.findRelative(target)
        }
        return stateResolver(target)
      }

      return target
    }
  }

  return transition
}