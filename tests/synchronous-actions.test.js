/**
 * Synchronous action tests
 * Tests the .do() modifier for synchronous actions
 */

import { createMachine, action } from '../dist/cjs/index.js'

describe('Synchronous Actions', () => {
  describe('Basic Do Actions', () => {
    let machine
    let instance
    let idle
    let active
    let actionCalled

    beforeEach(() => {
      machine = createMachine('sync-actions')
      idle = machine.state('idle')
      active = machine.state('active')
      actionCalled = false

      idle.on('START', active).do(() => {
        actionCalled = true
      })

      machine.initial(idle)
      instance = machine.start()
    })

    it('should execute action on transition', async () => {
      await instance.send('START')
      expect(actionCalled).toBe(true)
    })

    it('should execute action before state change', async () => {
      let stateWhenActionRan

      idle.on('CHECK', active).do(() => {
        stateWhenActionRan = instance.current
      })

      instance = machine.start()
      await instance.send('CHECK')

      expect(stateWhenActionRan).toBe('idle')
      expect(instance.current).toBe('active')
    })
  })

  describe('Context Modification', () => {
    let machine
    let instance
    let idle
    let counting

    beforeEach(() => {
      machine = createMachine('counter')
      idle = machine.state('idle')
      counting = machine.state('counting')

      idle.on('INCREMENT', counting).do(ctx => {
        ctx.count = (ctx.count || 0) + 1
      })

      counting.on('INCREMENT', counting).do(ctx => {
        ctx.count++
      })

      machine.initial(idle)
    })

    it('should modify context in action', async () => {
      instance = machine.start({ count: 0 })
      await instance.send('INCREMENT')
      expect(instance.context.count).toBe(1)
    })

    it('should accumulate context changes', async () => {
      instance = machine.start({ count: 0 })
      await instance.send('INCREMENT')
      await instance.send('INCREMENT')
      await instance.send('INCREMENT')
      expect(instance.context.count).toBe(3)
    })

    it('should handle undefined initial values', async () => {
      instance = machine.start({})
      await instance.send('INCREMENT')
      expect(instance.context.count).toBe(1)
    })
  })

  describe('Action Return Values', () => {
    let machine
    let instance
    let idle
    let active

    beforeEach(() => {
      machine = createMachine('returns')
      idle = machine.state('idle')
      active = machine.state('active')

      idle.on('COMPUTE', active).do((ctx, event) => {
        const result = event.a + event.b
        ctx.result = result
        return { sum: result }
      })

      machine.initial(idle)
      instance = machine.start()
    })

    it('should return action results', async () => {
      const result = await instance.send('COMPUTE', { a: 5, b: 3 })
      expect(result).toEqual({ sum: 8 })
    })

    it('should update context and return value', async () => {
      const result = await instance.send('COMPUTE', { a: 10, b: 20 })
      expect(result).toEqual({ sum: 30 })
      expect(instance.context.result).toBe(30)
    })
  })

  describe('Multiple Actions', () => {
    let machine
    let instance
    let idle
    let active
    let callOrder

    beforeEach(() => {
      machine = createMachine('multi-action')
      idle = machine.state('idle')
      active = machine.state('active')
      callOrder = []

      idle
        .on('START', active)
        .do(() => {
          callOrder.push('first')
        })
        .do(() => {
          callOrder.push('second')
        })
        .do(() => {
          callOrder.push('third')
        })

      machine.initial(idle)
      instance = machine.start()
    })

    it('should execute actions in order', async () => {
      await instance.send('START')
      expect(callOrder).toEqual(['first', 'second', 'third'])
    })

    it('should merge return values from multiple actions', async () => {
      const done = machine.state('done')

      active
        .on('MULTI', done)
        .do(() => ({ a: 1 }))
        .do(() => ({ b: 2 }))
        .do(() => ({ c: 3 }))

      await instance.send('START')
      const result = await instance.send('MULTI')

      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })
  })

  describe('Named Actions', () => {
    let machine
    let instance
    let idle
    let active
    let actionLog

    beforeEach(() => {
      machine = createMachine('named')
      idle = machine.state('idle')
      active = machine.state('active')
      actionLog = []

      const logAction = action('log', (ctx, event) => {
        actionLog.push({ name: 'log', event: event.type })
      })

      const updateAction = action('update', ctx => {
        ctx.updated = true
        actionLog.push({ name: 'update' })
      })

      idle.on('START', active).do(logAction).do(updateAction)

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should execute named actions', async () => {
      await instance.send('START')
      expect(actionLog).toHaveLength(2)
      expect(actionLog[0].name).toBe('log')
      expect(actionLog[1].name).toBe('update')
    })

    it('should preserve action names for debugging', async () => {
      await instance.send('START')
      expect(instance.context.updated).toBe(true)
    })
  })

  describe('Error Handling', () => {
    let machine
    let instance
    let idle
    let active
    let error

    beforeEach(() => {
      machine = createMachine('errors')
      idle = machine.state('idle')
      active = machine.state('active')
      error = machine.state('error')

      idle.on('FAIL', active).do(() => {
        throw new Error('Action failed')
      })

      idle
        .on('SAFE', active)
        .do(ctx => {
          ctx.step1 = true
        })
        .do(() => {
          throw new Error('Step 2 failed')
        })
        .do(ctx => {
          ctx.step3 = true // Should not run
        })

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should throw error from action', async () => {
      await expect(instance.send('FAIL')).rejects.toThrow('Action failed')
    })

    it('should stay in current state on error', async () => {
      try {
        await instance.send('FAIL')
      } catch (e) {
        // Expected
      }
      expect(instance.current).toBe('idle')
    })

    it('should stop executing actions after error', async () => {
      try {
        await instance.send('SAFE')
      } catch (e) {
        // Expected
      }
      expect(instance.context.step1).toBe(true)
      expect(instance.context.step3).toBeUndefined()
    })
  })
})
