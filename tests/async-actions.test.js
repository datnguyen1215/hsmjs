/**
 * Asynchronous action tests
 * Tests the .do() modifier for async actions
 */

import { createMachine } from '../src/index.js'

describe('Async Actions', () => {
  describe('Basic Async Actions', () => {
    let machine
    let instance
    let idle
    let loading
    let loaded

    beforeEach(() => {
      machine = createMachine('async-actions')
      idle = machine.state('idle')
      loading = machine.state('loading')
      loaded = machine.state('loaded')

      idle.on('LOAD', 'loading').do(async ctx => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 10))
        ctx.data = { id: 1, name: 'Test' }
      })

      loading.on('DONE', 'loaded')

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should execute async action', async () => {
      await instance.send('LOAD')
      expect(instance.context.data).toEqual({ id: 1, name: 'Test' })
    })

    it('should wait for async action to complete', async () => {
      const startTime = Date.now()
      await instance.send('LOAD')
      const endTime = Date.now()

      expect(endTime - startTime).toBeGreaterThanOrEqual(8) // Allow for timing variance in CI
    })

    it('should transition after async action completes', async () => {
      await instance.send('LOAD')
      expect(instance.current).toBe('loading')
    })
  })

  describe('Async Action Return Values', () => {
    let machine
    let instance
    let idle
    let fetching
    let done

    beforeEach(() => {
      machine = createMachine('fetcher')
      idle = machine.state('idle')
      fetching = machine.state('fetching')
      done = machine.state('done')

      idle.on('FETCH', 'fetching').do(async (ctx, event) => {
        const response = await Promise.resolve({
          data: { userId: event.userId, items: [1, 2, 3] }
        })
        ctx.response = response.data
        return { itemCount: response.data.items.length }
      })

      fetching.on('COMPLETE', 'done')

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should return async action results', async () => {
      const result = await instance.send('FETCH', { userId: 123 })
      expect(result).toEqual({ itemCount: 3 })
    })

    it('should update context from async action', async () => {
      await instance.send('FETCH', { userId: 456 })
      expect(instance.context.response).toEqual({
        userId: 456,
        items: [1, 2, 3]
      })
    })
  })

  describe('Mixed Sync and Async Actions', () => {
    let machine
    let instance
    let idle
    let processing
    let complete
    let actionOrder

    beforeEach(() => {
      machine = createMachine('mixed')
      idle = machine.state('idle')
      processing = machine.state('processing')
      complete = machine.state('complete')
      actionOrder = []

      idle
        .on('PROCESS', 'processing')
        .do(ctx => {
          actionOrder.push('sync1')
          ctx.step1 = true
        })
        .do(async ctx => {
          actionOrder.push('async1')
          await new Promise(resolve => setTimeout(resolve, 5))
          ctx.step2 = true
        })
        .do(ctx => {
          actionOrder.push('sync2')
          ctx.step3 = true
        })
        .do(async ctx => {
          actionOrder.push('async2')
          await new Promise(resolve => setTimeout(resolve, 5))
          ctx.step4 = true
        })

      processing.on('DONE', 'complete')

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should execute actions in order', async () => {
      await instance.send('PROCESS')
      expect(actionOrder).toEqual(['sync1', 'async1', 'sync2', 'async2'])
    })

    it('should wait for all actions to complete', async () => {
      await instance.send('PROCESS')
      expect(instance.context.step1).toBe(true)
      expect(instance.context.step2).toBe(true)
      expect(instance.context.step3).toBe(true)
      expect(instance.context.step4).toBe(true)
    })
  })

  describe('Async Error Handling', () => {
    let machine
    let instance
    let idle
    let processing
    let error

    beforeEach(() => {
      machine = createMachine('async-errors')
      idle = machine.state('idle')
      processing = machine.state('processing')
      error = machine.state('error')

      idle.on('FAIL', 'processing').do(async () => {
        throw new Error('Async action failed')
      })

      idle
        .on('PARTIAL', 'processing')
        .do(ctx => {
          ctx.step1 = true
        })
        .do(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          throw new Error('Step 2 failed')
        })
        .do(ctx => {
          ctx.step3 = true // Should not execute
        })

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should throw error from async action', async () => {
      await expect(instance.send('FAIL')).rejects.toThrow('Async action failed')
    })

    it('should stay in current state on async error', async () => {
      try {
        await instance.send('FAIL')
      } catch (e) {
        // Expected
      }
      expect(instance.current).toBe('idle')
    })

    it('should stop executing actions after async error', async () => {
      try {
        await instance.send('PARTIAL')
      } catch (e) {
        // Expected
      }
      expect(instance.context.step1).toBe(true)
      expect(instance.context.step3).toBeUndefined()
    })
  })

  describe('Parallel vs Sequential', () => {
    let machine
    let instance
    let idle
    let busy

    beforeEach(() => {
      machine = createMachine('parallel')
      idle = machine.state('idle')
      busy = machine.state('busy')

      idle
        .on('SEQUENTIAL', 'busy')
        .do(async ctx => {
          await new Promise(resolve => setTimeout(resolve, 20))
          ctx.first = Date.now()
        })
        .do(async ctx => {
          await new Promise(resolve => setTimeout(resolve, 20))
          ctx.second = Date.now()
        })

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should execute async actions sequentially', async () => {
      await instance.send('SEQUENTIAL')
      const diff = instance.context.second - instance.context.first
      expect(diff).toBeGreaterThanOrEqual(15) // Allow for timing variance in CI
    })
  })

  describe('Named Async Actions', () => {
    let machine
    let instance
    let idle
    let busy

    beforeEach(() => {
      machine = createMachine('named-async')
      idle = machine.state('idle')
      busy = machine.state('busy')

      const fetchUser = async (ctx, event) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        ctx.user = { id: event.userId, name: 'John' }
        return { fetched: 'user' }
      }

      const fetchPosts = async ctx => {
        await new Promise(resolve => setTimeout(resolve, 10))
        ctx.posts = [1, 2, 3]
        return { fetched: 'posts' }
      }

      idle.on('LOAD', 'busy').do(fetchUser).do(fetchPosts)

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should execute named async actions', async () => {
      const result = await instance.send('LOAD', { userId: 123 })
      expect(result).toEqual({ fetched: 'posts' })
      expect(instance.context.user).toEqual({ id: 123, name: 'John' })
      expect(instance.context.posts).toEqual([1, 2, 3])
    })
  })
})
