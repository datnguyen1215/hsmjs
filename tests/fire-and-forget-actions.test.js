/**
 * Fire-and-forget action tests
 * Tests the .fire() modifier for non-blocking actions
 */

import { createMachine } from '../src/index.js'

describe('Fire-and-Forget Actions', () => {
  describe('Basic Fire Actions', () => {
    let machine
    let instance
    let idle
    let active
    let fireLog

    beforeEach(() => {
      machine = createMachine('fire-actions')
      idle = machine.state('idle')
      active = machine.state('active')
      fireLog = []

      idle.on('START', active).fire(() => {
        fireLog.push('fired')
      })

      machine.initial(idle)
      instance = machine.start()
    })

    it('should execute fire action', async () => {
      await instance.send('START')
      // Give fire action time to execute
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(fireLog).toEqual(['fired'])
    })

    it('should not block transition', async () => {
      const startTime = Date.now()

      idle.on('SLOW', active).fire(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        fireLog.push('slow-fired')
      })

      await instance.send('SLOW')
      const endTime = Date.now()

      // Transition should complete quickly
      expect(endTime - startTime).toBeLessThan(50)
      expect(instance.current).toBe('active')
    })
  })

  describe('Fire Action Execution Order', () => {
    let machine
    let instance
    let idle
    let active
    let executionLog

    beforeEach(() => {
      machine = createMachine('order')
      idle = machine.state('idle')
      active = machine.state('active')
      executionLog = []

      idle
        .on('GO', active)
        .do(() => {
          executionLog.push('sync1')
        })
        .do(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          executionLog.push('async1')
        })
        .do(() => {
          executionLog.push('sync2')
        })
        .fire(() => {
          executionLog.push('fire1')
        })
        .fire(async () => {
          await new Promise(resolve => setTimeout(resolve, 5))
          executionLog.push('fire2')
        })

      machine.initial(idle)
      instance = machine.start()
    })

    it('should execute fire actions after transition', async () => {
      await instance.send('GO')

      // Initial check - blocking actions should be done, fire1 might have run
      expect(executionLog.slice(0, 3)).toEqual(['sync1', 'async1', 'sync2'])

      // Wait for all fire actions
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(executionLog).toEqual([
        'sync1',
        'async1',
        'sync2',
        'fire1',
        'fire2'
      ])
    })

    it('should transition before fire actions complete', async () => {
      await instance.send('GO')
      expect(instance.current).toBe('active')

      // Async fire action (fire2) should still be running
      expect(executionLog.includes('fire2')).toBe(false)
    })
  })

  describe('Fire Action Error Handling', () => {
    let machine
    let instance
    let idle
    let active
    let errorLog
    let originalError

    beforeEach(() => {
      machine = createMachine('fire-errors')
      idle = machine.state('idle')
      active = machine.state('active')
      errorLog = []

      // Override console.error for testing
      originalError = console.error
      console.error = msg => {
        errorLog.push(msg)
      }

      idle.on('ERROR', active).fire(() => {
        throw new Error('Fire action error')
      })

      idle.on('ASYNC_ERROR', active).fire(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Async fire action error')
      })

      machine.initial(idle)
      instance = machine.start()
    })

    afterEach(() => {
      console.error = originalError
    })

    it('should not affect transition on fire action error', async () => {
      // Synchronous errors in fire actions currently do throw
      try {
        await instance.send('ERROR')
      } catch (error) {
        expect(error.message).toBe('Fire action error')
      }
      // But transition still completes
      expect(instance.current).toBe('active')
    })

    it('should handle synchronous fire action errors', async () => {
      // Synchronous fire action errors currently propagate
      await expect(instance.send('ERROR')).rejects.toThrow('Fire action error')
      // But transition still completes
      expect(instance.current).toBe('active')
    })

    it('should handle async fire action errors', async () => {
      await instance.send('ASYNC_ERROR')
      expect(instance.current).toBe('active')

      // Wait for async error
      await new Promise(resolve => setTimeout(resolve, 20))
      // Errors should be logged but not thrown
    })
  })

  describe('Fire Actions with Context', () => {
    let machine
    let instance
    let idle
    let active
    let contextLog

    beforeEach(() => {
      machine = createMachine('context-fire')
      idle = machine.state('idle')
      active = machine.state('active')
      contextLog = []

      idle
        .on('UPDATE', active)
        .do(ctx => {
          ctx.count = 1
        })
        .fire(ctx => {
          contextLog.push({ count: ctx.count })
          ctx.fireCount = 10
        })
        .fire((ctx, event) => {
          contextLog.push({
            count: ctx.count,
            eventData: event.data
          })
        })

      machine.initial(idle)
      instance = machine.start({ count: 0 })
    })

    it('should access updated context in fire actions', async () => {
      await instance.send('UPDATE', { data: 'test' })

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(contextLog[0]).toEqual({ count: 1 })
      expect(contextLog[1]).toEqual({
        count: 1,
        eventData: 'test'
      })
    })

    it('should allow context modification in fire actions', async () => {
      await instance.send('UPDATE', { data: 'test' })

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(instance.context.fireCount).toBe(10)
    })
  })

  describe('Named Fire Actions', () => {
    let machine
    let instance
    let idle
    let active
    let analyticsLog

    beforeEach(() => {
      machine = createMachine('analytics')
      idle = machine.state('idle')
      active = machine.state('active')
      analyticsLog = []

      const trackEvent = (ctx, event) => {
        analyticsLog.push({
          action: 'trackEvent',
          event: event.type,
          user: ctx.userId
        })
      }

      const logMetrics = async (ctx, event) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        analyticsLog.push({
          action: 'logMetrics',
          metrics: event.metrics
        })
      }

      idle
        .on('PURCHASE', active)
        .do((ctx, event) => {
          ctx.lastPurchase = event.itemId
        })
        .fire(trackEvent)
        .fire(logMetrics)

      machine.initial(idle)
      instance = machine.start({ userId: 'user123' })
    })

    it('should execute named fire actions', async () => {
      await instance.send('PURCHASE', {
        itemId: 'item456',
        metrics: { price: 99.99 }
      })

      await new Promise(resolve => setTimeout(resolve, 20))

      expect(analyticsLog).toHaveLength(2)
      expect(analyticsLog[0]).toEqual({
        action: 'trackEvent',
        event: 'PURCHASE',
        user: 'user123'
      })
      expect(analyticsLog[1]).toEqual({
        action: 'logMetrics',
        metrics: { price: 99.99 }
      })
    })
  })

  describe('Multiple Fire Actions', () => {
    let machine
    let instance
    let idle
    let active
    let fireOrder

    beforeEach(() => {
      machine = createMachine('multi-fire')
      idle = machine.state('idle')
      active = machine.state('active')
      fireOrder = []

      idle
        .on('MULTI', active)
        .fire(() => {
          fireOrder.push(1)
        })
        .fire(() => {
          fireOrder.push(2)
        })
        .fire(async () => {
          await new Promise(resolve => setTimeout(resolve, 5))
          fireOrder.push(3)
        })
        .fire(() => {
          fireOrder.push(4)
        })

      machine.initial(idle)
      instance = machine.start()
    })

    it('should execute all fire actions', async () => {
      await instance.send('MULTI')

      await new Promise(resolve => setTimeout(resolve, 20))

      // Async fire action (3) completes after synchronous ones
      expect(fireOrder).toEqual([1, 2, 4, 3])
    })
  })
})
