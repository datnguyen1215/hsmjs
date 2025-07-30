/**
 * HistoryManager for tracking state machine transitions with rollback capability
 * Integrates with existing hsmjs architecture
 */

import { CircularBuffer } from './circular-buffer.js'

export class HistoryManager {
  /**
   * Create a new history manager
   * @param {Object} options - Configuration options
   * @param {number} options.maxSize - Maximum history entries (default: 30)
   * @param {boolean} options.enableCompression - Enable context compression (default: false)
   * @param {Array<string>} options.excludeStates - States to exclude from history
   * @param {Function} options.contextSerializer - Custom context serializer
   */
  constructor(options = {}) {
    this.options = {
      maxSize: 30,
      enableCompression: false,
      excludeStates: [],
      contextSerializer: null,
      ...options
    }

    this.buffer = new CircularBuffer(this.options.maxSize)
    this.entryIndex = new Map() // id -> buffer index for O(1) lookup
    this.currentEntryId = null
  }

  /**
   * Record a state transition
   * @param {string} fromState - Previous state
   * @param {string} toState - New state
   * @param {Object} context - State context
   * @param {string} trigger - Event that caused transition
   * @param {Object} metadata - Additional metadata
   * @returns {string} Entry ID
   */
  recordTransition(fromState, toState, context, trigger = null, metadata = {}) {
    // Skip excluded states
    if (this.options.excludeStates.includes(toState)) {
      return null
    }

    const entry = {
      id: this._generateId(),
      timestamp: Date.now(),
      fromState,
      toState,
      context: this._serializeContext(context),
      trigger,
      metadata: {
        ...metadata,
        size: this._estimateSize(context)
      }
    }

    // Add to buffer (may evict oldest entry)
    const evictedEntry = this.buffer.add(entry)

    // Update index
    if (evictedEntry) {
      this.entryIndex.delete(evictedEntry.id)
    }

    // Update index for new entry
    const bufferIndex = this.buffer.getSize() - 1
    this.entryIndex.set(entry.id, bufferIndex)

    this.currentEntryId = entry.id
    return entry.id
  }

  /**
   * Get complete history interface
   * @returns {Object} History interface with query methods
   */
  getHistory() {
    const entries = this.buffer.toArray()

    return {
      entries: [...entries], // Return copy to prevent mutations
      size: this.buffer.getSize(),
      maxSize: this.options.maxSize,
      current: this.getCurrentEntry(),

      // Query methods
      getByIndex: index => this.getByIndex(index),
      getById: id => this.getById(id),
      getRange: (start, end) => this.getRange(start, end),
      find: predicate => this.find(predicate),
      filter: predicate => this.filter(predicate),

      // Navigation methods
      canRollback: targetEntry => this.canRollback(targetEntry),
      getStepsBack: targetEntry => this.getStepsBack(targetEntry),
      getPath: (fromEntry, toEntry) => this.getPath(fromEntry, toEntry)
    }
  }

  /**
   * Get current history entry
   * @returns {Object|null} Current entry
   */
  getCurrentEntry() {
    if (!this.currentEntryId) return null
    return this.getById(this.currentEntryId)
  }

  /**
   * Get entry by index (0 = oldest, size-1 = newest)
   * @param {number} index - Index to retrieve
   * @returns {Object|null} History entry
   */
  getByIndex(index) {
    return this.buffer.get(index) || null
  }

  /**
   * Get entry by ID
   * @param {string} id - Entry ID
   * @returns {Object|null} History entry
   */
  getById(id) {
    const entries = this.buffer.toArray()
    return entries.find(entry => entry.id === id) || null
  }

  /**
   * Get range of entries
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Array} Array of entries
   */
  getRange(start, end) {
    const entries = this.buffer.toArray()
    return entries.slice(start, end)
  }

  /**
   * Find entry by predicate
   * @param {Function} predicate - Test function
   * @returns {Object|null} First matching entry
   */
  find(predicate) {
    return this.buffer.find(predicate) || null
  }

  /**
   * Filter entries by predicate
   * @param {Function} predicate - Test function
   * @returns {Array} Matching entries
   */
  filter(predicate) {
    return this.buffer.filter(predicate)
  }

  /**
   * Check if rollback to target entry is possible
   * @param {Object} targetEntry - Target history entry
   * @returns {boolean} True if rollback is possible
   */
  canRollback(targetEntry) {
    if (!targetEntry || !targetEntry.id) return false
    return this.getById(targetEntry.id) !== null
  }

  /**
   * Get number of steps back to target entry
   * @param {Object} targetEntry - Target history entry
   * @returns {number} Number of steps back, -1 if not found
   */
  getStepsBack(targetEntry) {
    if (!this.canRollback(targetEntry)) return -1

    const entries = this.buffer.toArray()
    const currentIndex = entries.findIndex(e => e.id === this.currentEntryId)
    const targetIndex = entries.findIndex(e => e.id === targetEntry.id)

    if (currentIndex === -1 || targetIndex === -1) return -1
    return currentIndex - targetIndex
  }

  /**
   * Get path between two entries
   * @param {Object} fromEntry - Starting entry
   * @param {Object} toEntry - Ending entry
   * @returns {Array} Path of entries
   */
  getPath(fromEntry, toEntry) {
    const entries = this.buffer.toArray()
    const fromIndex = entries.findIndex(e => e.id === fromEntry.id)
    const toIndex = entries.findIndex(e => e.id === toEntry.id)

    if (fromIndex === -1 || toIndex === -1) return []

    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex) + 1
    return entries.slice(start, end)
  }

  /**
   * Get memory usage information
   * @returns {Object} Memory usage stats
   */
  getMemoryUsage() {
    const entries = this.buffer.toArray()
    let totalSize = 0
    let entryCount = entries.length

    entries.forEach(entry => {
      totalSize += entry.metadata?.size || 0
    })

    return {
      totalSize,
      entryCount,
      averageSize: entryCount > 0 ? totalSize / entryCount : 0,
      maxSize: this.options.maxSize,
      utilization: this.buffer.getStats().utilization
    }
  }

  /**
   * Clear all history
   */
  clear() {
    this.buffer.clear()
    this.entryIndex.clear()
    this.currentEntryId = null
  }

  /**
   * Configure history options
   * @param {Object} newOptions - New configuration
   */
  configure(newOptions) {
    const oldMaxSize = this.options.maxSize
    this.options = { ...this.options, ...newOptions }

    // If maxSize changed, create new buffer
    if (this.options.maxSize !== oldMaxSize) {
      const oldEntries = this.buffer.toArray()
      this.buffer = new CircularBuffer(this.options.maxSize)
      this.entryIndex.clear()

      // Re-add entries up to new limit
      const entriesToKeep = oldEntries.slice(-this.options.maxSize)
      entriesToKeep.forEach((entry, index) => {
        this.buffer.add(entry)
        this.entryIndex.set(entry.id, index)
      })
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate unique entry ID
   * @returns {string} Unique ID
   * @private
   */
  _generateId() {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Serialize context for storage
   * @param {Object} context - Context to serialize
   * @returns {any} Serialized context
   * @private
   */
  _serializeContext(context) {
    if (this.options.contextSerializer) {
      return this.options.contextSerializer(context)
    }

    try {
      // Deep clone to prevent mutations
      return JSON.parse(JSON.stringify(context))
    } catch (error) {
      // If serialization fails, store error marker
      return { __serialization_error: error.message }
    }
  }

  /**
   * Estimate size of context object
   * @param {Object} context - Context to measure
   * @returns {number} Estimated size in bytes
   * @private
   */
  _estimateSize(context) {
    try {
      return JSON.stringify(context).length * 2 // Rough estimate: 2 bytes per char
    } catch {
      return 0
    }
  }
}
