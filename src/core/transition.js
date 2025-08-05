/**
 * Transition between states
 */

/**
 * @param {string} event
 * @param {string|Function} target
 * @param {Object|null} source
 * @returns {import('../../types/index.js').Transition}
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
        Promise.resolve(action(context, event)).catch(() => {
          // Silently continue
        })
      }
    },

    resolveTarget(context, event, stateResolver) {
      if (typeof target === 'function') {
        const result = target(context, event)
        if (typeof result === 'string') {
          return stateResolver(result)
        }
        throw new Error(`Dynamic target function must return a string, got ${typeof result}`)
      }

      if (typeof target === 'string') {
        if (target.startsWith('^')) {
          return source.findRelative(target)
        }
        return stateResolver(target)
      }

      throw new Error(`Transition target must be a string or function, got ${typeof target}`)
    }
  }

  return transition
}