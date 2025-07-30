/**
 * Context management tests
 * Tests context initialization, isolation, and updates
 */

import { createMachine } from '../dist/cjs/index.js'

describe('Context Management', () => {
  describe('Context Initialization', () => {
    let machine
    let idle

    beforeEach(() => {
      machine = createMachine('context')
      idle = machine.state('idle')
      machine.initial(idle)
    })

    it('should create empty context by default', () => {
      const instance = machine.start()
      expect(instance.context).toEqual({})
    })

    it('should accept initial context', () => {
      const initialContext = { count: 0, user: 'test' }
      const instance = machine.start(initialContext)
      expect(instance.context).toEqual(initialContext)
    })

    it('should create independent context copy', () => {
      const initialContext = { count: 0, nested: { value: 1 } }
      const instance = machine.start(initialContext)

      // Modify instance context
      instance.context.count = 10
      instance.context.nested.value = 20

      // Original should be unchanged
      expect(initialContext.count).toBe(0)
      expect(initialContext.nested.value).toBe(1)
    })
  })

  describe('Context Isolation Between Instances', () => {
    let machine
    let idle
    let active

    beforeEach(() => {
      machine = createMachine('isolation')
      idle = machine.state('idle')
      active = machine.state('active')

      idle.on('INCREMENT', active).do(ctx => {
        ctx.count = (ctx.count || 0) + 1
      })

      active.on('RESET', idle)

      machine.initial(idle)
    })

    it('should isolate context between instances', async () => {
      const instance1 = machine.start({ count: 0 })
      const instance2 = machine.start({ count: 0 })

      await instance1.send('INCREMENT')
      expect(instance1.context.count).toBe(1)
      expect(instance2.context.count).toBe(0)

      await instance2.send('INCREMENT')
      await instance2.send('INCREMENT')
      expect(instance1.context.count).toBe(1)
      expect(instance2.context.count).toBe(1)
    })

    it('should maintain separate state and context', async () => {
      const instance1 = machine.start()
      const instance2 = machine.start()

      await instance1.send('INCREMENT')

      expect(instance1.current).toBe('active')
      expect(instance2.current).toBe('idle')

      expect(instance1.context.count).toBe(1)
      expect(instance2.context.count).toBeUndefined()
    })
  })

  describe('Context Updates in Actions', () => {
    let machine
    let instance
    let idle
    let processing

    beforeEach(() => {
      machine = createMachine('updates')
      idle = machine.state('idle')
      processing = machine.state('processing')

      idle.on('UPDATE', processing).do((ctx, event) => {
        // Direct mutation
        ctx.value = event.value
        // Nested object update
        ctx.metadata = ctx.metadata || {}
        ctx.metadata.lastUpdate = Date.now()
        ctx.metadata.source = event.source
      })

      machine.initial(idle)
      instance = machine.start({ metadata: { created: Date.now() } })
    })

    it('should allow direct context mutations', async () => {
      await instance.send('UPDATE', { value: 42, source: 'user' })

      expect(instance.context.value).toBe(42)
      expect(instance.context.metadata.source).toBe('user')
      expect(instance.context.metadata.lastUpdate).toBeDefined()
    })

    it('should preserve existing context properties', async () => {
      const created = instance.context.metadata.created

      await instance.send('UPDATE', { value: 100, source: 'api' })

      expect(instance.context.metadata.created).toBe(created)
      expect(instance.context.metadata.source).toBe('api')
    })
  })

  describe('Context in Guards', () => {
    let machine
    let instance
    let idle
    let allowed
    let denied

    beforeEach(() => {
      machine = createMachine('guard-context')
      idle = machine.state('idle')
      allowed = machine.state('allowed')
      denied = machine.state('denied')

      idle
        .on('ACCESS', allowed)
        .if(ctx => ctx.user && ctx.user.role === 'admin')

      idle
        .on('ACCESS', denied)
        .if(ctx => !ctx.user || ctx.user.role !== 'admin')

      machine.initial(idle)
    })

    it('should access context in guards', async () => {
      instance = machine.start({ user: { role: 'admin' } })
      await instance.send('ACCESS')
      expect(instance.current).toBe('allowed')
    })

    it('should handle missing context properties in guards', async () => {
      instance = machine.start({})
      await instance.send('ACCESS')
      expect(instance.current).toBe('denied')
    })

    it('should use updated context in guards', async () => {
      instance = machine.start({ user: { role: 'user' } })

      // Update context
      instance.context.user.role = 'admin'

      await instance.send('ACCESS')
      expect(instance.current).toBe('allowed')
    })
  })

  describe('Context in Lifecycle Actions', () => {
    let machine
    let instance
    let state1
    let state2

    beforeEach(() => {
      machine = createMachine('lifecycle-context')
      state1 = machine.state('state1')
      state2 = machine.state('state2')

      state1
        .enter(ctx => {
          ctx.state1Entries = (ctx.state1Entries || 0) + 1
        })
        .exit(ctx => {
          ctx.lastExitTime = Date.now()
        })

      state2.enter((ctx, event) => {
        ctx.enteredFrom = event ? event.type : 'initial'
      })

      state1.on('NEXT', state2)
      state2.on('BACK', state1)

      machine.initial(state1)
      instance = machine.start({})
    })

    it('should update context in entry actions', () => {
      expect(instance.context.state1Entries).toBe(1)
    })

    it('should update context in exit actions', async () => {
      await instance.send('NEXT')
      expect(instance.context.lastExitTime).toBeDefined()
      expect(instance.context.enteredFrom).toBe('NEXT')
    })

    it('should accumulate context changes across transitions', async () => {
      await instance.send('NEXT')
      await instance.send('BACK')
      await instance.send('NEXT')
      await instance.send('BACK')

      expect(instance.context.state1Entries).toBe(3)
    })
  })

  describe('Complex Context Operations', () => {
    let machine
    let instance
    let idle
    let processing
    let complete

    beforeEach(() => {
      machine = createMachine('complex')
      idle = machine.state('idle')
      processing = machine.state('processing')
      complete = machine.state('complete')

      idle.on('START', processing).do((ctx, event) => {
        ctx.items = event.items || []
        ctx.results = []
      })

      processing
        .on('PROCESS_ITEM', processing)
        .do((ctx, event) => {
          const item = ctx.items.shift()
          if (item) {
            ctx.results.push({
              id: item.id,
              processed: true,
              value: item.value * 2
            })
          }
        })
        .if(ctx => ctx.items.length > 0)

      processing.on('PROCESS_ITEM', complete).if(ctx => ctx.items.length === 0)

      machine.initial(idle)
    })

    it('should handle array operations in context', async () => {
      instance = machine.start()

      await instance.send('START', {
        items: [
          { id: 1, value: 10 },
          { id: 2, value: 20 },
          { id: 3, value: 30 }
        ]
      })

      expect(instance.context.items).toHaveLength(3)
      expect(instance.context.results).toHaveLength(0)

      // Process all items
      await instance.send('PROCESS_ITEM')
      expect(instance.context.items).toHaveLength(2)
      expect(instance.context.results).toHaveLength(1)

      await instance.send('PROCESS_ITEM')
      await instance.send('PROCESS_ITEM')

      // Need one more event to transition to complete after all items processed
      await instance.send('PROCESS_ITEM')

      expect(instance.current).toBe('complete')
      expect(instance.context.items).toHaveLength(0)
      expect(instance.context.results).toHaveLength(3)
      expect(instance.context.results[0]).toEqual({
        id: 1,
        processed: true,
        value: 20
      })
    })
  })

  describe('Context Persistence', () => {
    let machine
    let instance
    let idle
    let active

    beforeEach(() => {
      machine = createMachine('persistence')
      idle = machine.state('idle')
      active = machine.state('active')

      idle.on('ACTIVATE', active).do(ctx => {
        ctx.activationCount = (ctx.activationCount || 0) + 1
      })

      active.on('DEACTIVATE', idle).do(ctx => {
        ctx.deactivationCount = (ctx.deactivationCount || 0) + 1
      })

      machine.initial(idle)
      instance = machine.start({
        persistentValue: 'should-remain'
      })
    })

    it('should preserve context across transitions', async () => {
      await instance.send('ACTIVATE')
      expect(instance.context.persistentValue).toBe('should-remain')
      expect(instance.context.activationCount).toBe(1)

      await instance.send('DEACTIVATE')
      expect(instance.context.persistentValue).toBe('should-remain')
      expect(instance.context.activationCount).toBe(1)
      expect(instance.context.deactivationCount).toBe(1)

      await instance.send('ACTIVATE')
      expect(instance.context.persistentValue).toBe('should-remain')
      expect(instance.context.activationCount).toBe(2)
      expect(instance.context.deactivationCount).toBe(1)
    })
  })
})
