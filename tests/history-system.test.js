/**
 * History System Tests
 * Tests for state machine history tracking and rollback functionality
 */

import { createMachine } from '../src/core/create-machine.js'

describe('History System', () => {
  let machine
  let instance

  beforeEach(() => {
    // Create a simple state machine for testing
    machine = createMachine('test-machine')

    const idle = machine.state('idle')
    const processing = machine.state('processing')
    const complete = machine.state('complete')
    const error = machine.state('error')

    idle.on('start', processing)
    processing.on('finish', complete)
    processing.on('fail', error)
    complete.on('reset', idle)
    error.on('retry', processing)
    error.on('reset', idle)

    machine.initial(idle)

    // Start instance with history enabled
    instance = machine.start(
      {
        count: 0,
        data: null
      },
      {
        history: {
          maxSize: 10,
          enableCompression: false
        }
      }
    )
  })

  describe('History Tracking', () => {
    it('should record initial state in history', () => {
      const history = instance.history()

      expect(history.size).toBe(1)
      expect(history.entries[0].toState).toBe('idle')
      expect(history.entries[0].fromState).toBeNull()
      expect(history.entries[0].trigger).toBe('init')
      expect(history.current).toBeDefined()
      expect(history.current.id).toBe(history.entries[0].id)
    })

    it('should record transitions in chronological order', async () => {
      // Perform several transitions
      await instance.send('start')
      instance.context.count = 1
      await instance.send('finish')

      const history = instance.history()

      expect(history.size).toBe(3)
      expect(history.entries[0].toState).toBe('idle') // Initial
      expect(history.entries[1].toState).toBe('processing') // start
      expect(history.entries[2].toState).toBe('complete') // finish

      // Check metadata
      expect(history.entries[1].trigger).toBe('start')
      expect(history.entries[2].trigger).toBe('finish')
    })

    it('should store context with each transition', async () => {
      instance.context.data = 'test'
      await instance.send('start')

      instance.context.count = 42
      instance.context.data = 'processing'
      await instance.send('finish')

      const history = instance.history()

      expect(history.entries[1].context.data).toBe('test')
      expect(history.entries[2].context.count).toBe(42)
      expect(history.entries[2].context.data).toBe('processing')
    })

    it('should respect maxSize configuration', async () => {
      // Configure small history size
      instance.configureHistory({ maxSize: 3 })

      // Perform many transitions
      await instance.send('start')
      await instance.send('finish')
      await instance.send('reset')
      await instance.send('start')
      await instance.send('fail')

      const history = instance.history()

      // Should only keep last 3 entries
      expect(history.size).toBe(3)
      expect(history.maxSize).toBe(3)
    })
  })

  describe('History Query Interface', () => {
    beforeEach(async () => {
      // Set up some history
      await instance.send('start')
      instance.context.step = 1
      await instance.send('fail')
      instance.context.step = 2
      await instance.send('retry')
      instance.context.step = 3
      await instance.send('finish')
    })

    it('should provide query methods', () => {
      const history = instance.history()

      expect(typeof history.getByIndex).toBe('function')
      expect(typeof history.getById).toBe('function')
      expect(typeof history.getRange).toBe('function')
      expect(typeof history.find).toBe('function')
      expect(typeof history.filter).toBe('function')
    })

    it('should support index-based queries', () => {
      const history = instance.history()

      const firstEntry = history.getByIndex(0)
      const lastEntry = history.getByIndex(history.size - 1)

      expect(firstEntry.toState).toBe('idle')
      expect(lastEntry.toState).toBe('complete')
      expect(history.getByIndex(999)).toBeNull()
    })

    it('should support ID-based queries', () => {
      const history = instance.history()
      const firstEntry = history.entries[0]

      const foundEntry = history.getById(firstEntry.id)
      expect(foundEntry.id).toBe(firstEntry.id)
      expect(history.getById('nonexistent')).toBeNull()
    })

    it('should support range queries', () => {
      const history = instance.history()
      const range = history.getRange(1, 3)

      expect(range).toHaveLength(2)
      expect(range[0].toState).toBe('processing')
      expect(range[1].toState).toBe('error')
    })

    it('should support predicate-based queries', () => {
      const history = instance.history()

      const errorEntry = history.find(entry => entry.toState === 'error')
      expect(errorEntry.toState).toBe('error')

      const processingEntries = history.filter(
        entry => entry.toState === 'processing'
      )
      expect(processingEntries).toHaveLength(2) // start and retry
    })
  })

  describe('Rollback Functionality', () => {
    beforeEach(async () => {
      // Create history with multiple transitions
      await instance.send('start')
      instance.context.step = 1
      await instance.send('fail')
      instance.context.step = 2
      await instance.send('retry')
      instance.context.step = 3
      await instance.send('finish')
    })

    it('should successfully rollback to previous state', async () => {
      const history = instance.history()
      const processingEntry = history.find(
        entry => entry.toState === 'processing'
      )

      expect(instance.current).toBe('complete')

      const result = await instance.rollback(processingEntry)

      expect(result.success).toBe(true)
      expect(instance.current).toBe('processing')
      expect(result.stepsBack).toBeGreaterThan(0)
    })

    it('should restore context during rollback', async () => {
      const history = instance.history()
      const errorEntry = history.find(entry => entry.toState === 'error')

      // Current context should be from complete state
      expect(instance.context.step).toBe(3)

      // Rollback to error state
      await instance.rollback(errorEntry)

      // Context should be restored to error state context
      expect(instance.context.step).toBe(1)
    })

    it('should handle invalid rollback attempts', async () => {
      // Test rollback to non-existent entry
      const fakeEntry = { id: 'fake', toState: 'nonexistent' }
      const result = await instance.rollback(fakeEntry)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('ENTRY_NOT_FOUND')
      expect(instance.current).toBe('complete') // State unchanged
    })

    it('should handle rollback to deleted state', async () => {
      const history = instance.history()
      const targetEntry = history.entries[1]

      // Clear history to simulate deleted entry
      instance.clearHistory()

      const result = await instance.rollback(targetEntry)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('ENTRY_NOT_FOUND')
    })

    it('should record rollback in history', async () => {
      const history = instance.history()
      const processingEntry = history.find(
        entry => entry.toState === 'processing'
      )
      const initialSize = history.size

      await instance.rollback(processingEntry)

      const newHistory = instance.history()
      expect(newHistory.size).toBe(initialSize + 1) // New rollback entry added

      const rollbackEntry = newHistory.entries[newHistory.size - 1]
      expect(rollbackEntry.trigger).toBe('rollback')
      expect(rollbackEntry.metadata.rollback).toBe(true)
      expect(rollbackEntry.metadata.targetEntryId).toBe(processingEntry.id)
    })

    it('should notify listeners about rollback events', async () => {
      let notificationReceived = false
      let rollbackData = null

      instance.subscribe(event => {
        if (event.rollback) {
          notificationReceived = true
          rollbackData = event
        }
      })

      const history = instance.history()
      const processingEntry = history.find(
        entry => entry.toState === 'processing'
      )

      await instance.rollback(processingEntry)

      expect(notificationReceived).toBe(true)
      expect(rollbackData.event).toBe('rollback')
      expect(rollbackData.to).toBe('processing')
      expect(rollbackData.targetEntry).toBeDefined()
    })
  })

  describe('Navigation Methods', () => {
    beforeEach(async () => {
      await instance.send('start')
      await instance.send('fail')
      await instance.send('retry')
      await instance.send('finish')
    })

    it('should check rollback feasibility', () => {
      const history = instance.history()
      const validEntry = history.entries[1]
      const invalidEntry = { id: 'fake', toState: 'fake' }

      expect(history.canRollback(validEntry)).toBe(true)
      expect(history.canRollback(invalidEntry)).toBe(false)
      expect(history.canRollback(null)).toBe(false)
    })

    it('should calculate steps back', () => {
      const history = instance.history()
      const firstEntry = history.entries[0]
      const secondEntry = history.entries[1]

      expect(history.getStepsBack(secondEntry)).toBeGreaterThan(0)
      expect(history.getStepsBack(firstEntry)).toBeGreaterThan(0)
      expect(history.getStepsBack({ id: 'fake' })).toBe(-1)
    })

    it('should get path between entries', () => {
      const history = instance.history()
      const firstEntry = history.entries[0]
      const lastEntry = history.entries[history.size - 1]

      const path = history.getPath(firstEntry, lastEntry)
      expect(path.length).toBeGreaterThan(0)
      expect(path[0].id).toBe(firstEntry.id)
      expect(path[path.length - 1].id).toBe(lastEntry.id)
    })
  })

  describe('Memory Management', () => {
    it('should provide memory usage information', () => {
      const usage = instance.getHistoryMemoryUsage()

      expect(usage).toHaveProperty('totalSize')
      expect(usage).toHaveProperty('entryCount')
      expect(usage).toHaveProperty('averageSize')
      expect(usage).toHaveProperty('maxSize')
      expect(usage).toHaveProperty('utilization')

      expect(usage.entryCount).toBe(1) // Initial state
      expect(usage.maxSize).toBe(10) // From configuration
    })

    it('should support history clearing', () => {
      const initialHistory = instance.history()
      expect(initialHistory.size).toBe(1)

      instance.clearHistory()

      const clearedHistory = instance.history()
      expect(clearedHistory.size).toBe(0)
      expect(clearedHistory.entries).toHaveLength(0)
    })

    it('should support configuration updates', () => {
      instance.configureHistory({ maxSize: 5 })

      const history = instance.history()
      expect(history.maxSize).toBe(5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid transitions', async () => {
      // Perform many rapid transitions
      for (let i = 0; i < 20; i++) {
        await instance.send('start')
        await instance.send('finish')
        await instance.send('reset')
      }

      const history = instance.history()
      expect(history.size).toBeLessThanOrEqual(10) // Respects maxSize
      expect(history.entries).toBeDefined()
    })

    it('should handle context mutations', async () => {
      const originalContext = { ...instance.context }

      await instance.send('start')
      instance.context.mutated = 'after'

      const history = instance.history()
      const startEntry = history.find(entry => entry.trigger === 'start')

      // History should store context at time of transition
      expect(startEntry.context).toEqual(originalContext)
      expect(startEntry.context.mutated).toBeUndefined()
    })

    it('should handle circular references in context', async () => {
      // Create circular reference
      instance.context.self = instance.context

      // Should not throw error during transition
      await expect(instance.send('start')).resolves.toBeDefined()

      const history = instance.history()
      expect(history.size).toBe(2) // Should record transition

      // Check that serialization error was handled gracefully
      const startEntry = history.find(entry => entry.trigger === 'start')
      expect(startEntry.context).toHaveProperty('__serialization_error')
    })
  })
})
