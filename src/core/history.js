/**
 * History management for state machines with array storage
 */

/**
 * @param {Object} [options={}]
 * @param {number} [options.maxSize=30]
 * @param {Array<string>} [options.excludeStates=[]]
 * @returns {Object}
 */
export const createHistoryManager = (options = {}) => {
  // Private state via closure
  const opts = {
    maxSize: 30,
    excludeStates: [],
    ...options
  }
  const entries = []
  let currentId = null

  // Private methods
  const generateId = () => {
    return `h_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const cloneContext = (context) => {
    try {
      return JSON.parse(JSON.stringify(context))
    } catch (error) {
      return { __error: error.message }
    }
  }

  // Public interface
  const manager = {
    recordTransition(fromState, toState, context, trigger = null, metadata = {}) {
      if (opts.excludeStates.includes(toState)) {
        return null
      }

      const entry = {
        id: generateId(),
        timestamp: Date.now(),
        fromState,
        toState,
        context: cloneContext(context),
        trigger,
        metadata
      }

      entries.push(entry)
      if (entries.length > opts.maxSize) {
        entries.shift()
      }
      currentId = entry.id
      return entry.id
    },

    getHistory() {
      return {
        entries: [...entries],
        size: entries.length,
        maxSize: opts.maxSize,
        current: manager.getCurrentEntry(),

        // Query methods
        getByIndex: index => manager.getByIndex(index),
        getById: id => manager.getById(id),

        // Navigation
        canRollback: entry => manager.canRollback(entry),
        getStepsBack: entry => manager.getStepsBack(entry)
      }
    },

    getCurrentEntry() {
      if (!currentId) return null
      return manager.getById(currentId)
    },

    getByIndex(index) {
      return entries[index] || null
    },

    getById(id) {
      return entries.find(entry => entry.id === id) || null
    },

    canRollback(targetEntry) {
      if (!targetEntry || !targetEntry.id) return false
      return manager.getById(targetEntry.id) !== null
    },

    getStepsBack(targetEntry) {
      if (!manager.canRollback(targetEntry)) return -1

      const currentIndex = entries.findIndex(e => e.id === currentId)
      const targetIndex = entries.findIndex(e => e.id === targetEntry.id)

      if (currentIndex === -1 || targetIndex === -1) return -1
      return currentIndex - targetIndex
    },

    clear() {
      entries.length = 0
      currentId = null
    }
  }

  return manager
}