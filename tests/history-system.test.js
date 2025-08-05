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

    idle.on('start', 'processing')
    processing.on('finish', 'complete')
    processing.on('fail', 'error')
    complete.on('reset', 'idle')
    error.on('retry', 'processing')
    error.on('reset', 'idle')

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
      // getRange method removed from API
      expect(Array.isArray(history.entries)).toBe(true)
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

    // Range queries test removed - getRange method no longer exists

    it('should support predicate-based queries', () => {
      const history = instance.history()

      const errorEntry = history.entries.find(entry => entry.toState === 'error')
      expect(errorEntry.toState).toBe('error')

      const processingEntries = history.entries.filter(
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
      const processingEntry = history.entries.find(
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
      const errorEntry = history.entries.find(entry => entry.toState === 'error')

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
      expect(result.error).toBe('Entry not found')
      expect(instance.current).toBe('complete') // State unchanged
    })


    it('should record rollback in history', async () => {
      const history = instance.history()
      const processingEntry = history.entries.find(
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
        if (event.event === 'rollback') {
          notificationReceived = true
          rollbackData = event
        }
      })

      const history = instance.history()
      const processingEntry = history.entries.find(
        entry => entry.toState === 'processing'
      )

      await instance.rollback(processingEntry)

      expect(notificationReceived).toBe(true)
      expect(rollbackData.event).toBe('rollback')
      expect(rollbackData.to).toBe('processing')
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
      const startEntry = history.entries.find(entry => entry.trigger === 'start')

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
      const startEntry = history.entries.find(entry => entry.trigger === 'start')
      expect(startEntry.context).toHaveProperty('__error')
    })
  })
})
