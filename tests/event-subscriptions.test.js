/**
 * Event subscription tests
 * Tests the subscribe/unsubscribe functionality for state change notifications
 */

import { createMachine } from '../src/index.js'

describe('Event Subscriptions', () => {
  describe('Basic Subscriptions', () => {
    let machine
    let instance
    let idle
    let active
    let notifications

    beforeEach(() => {
      machine = createMachine('subscription')
      idle = machine.state('idle')
      active = machine.state('active')
      notifications = []

      idle.on('ACTIVATE', active)
      active.on('DEACTIVATE', idle)

      machine.initial(idle)
      instance = machine.start()

      instance.subscribe(event => {
        notifications.push(event)
      })
    })

    it('should notify on state transitions', async () => {
      await instance.send('ACTIVATE')

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        from: 'idle',
        to: 'active',
        event: 'ACTIVATE'
      })
    })

    it('should notify on multiple transitions', async () => {
      await instance.send('ACTIVATE')
      await instance.send('DEACTIVATE')

      expect(notifications).toHaveLength(2)
      expect(notifications[1]).toEqual({
        from: 'active',
        to: 'idle',
        event: 'DEACTIVATE'
      })
    })

    it('should not notify when no transition occurs', async () => {
      await instance.send('UNKNOWN_EVENT')
      expect(notifications).toHaveLength(0)
    })
  })

  describe('Multiple Subscribers', () => {
    let machine
    let instance
    let idle
    let active
    let subscriber1Events
    let subscriber2Events
    let subscriber3Events

    beforeEach(() => {
      machine = createMachine('multi-sub')
      idle = machine.state('idle')
      active = machine.state('active')

      subscriber1Events = []
      subscriber2Events = []
      subscriber3Events = []

      idle.on('GO', active)
      machine.initial(idle)
      instance = machine.start()

      instance.subscribe(event => {
        subscriber1Events.push({ ...event, subscriber: 1 })
      })

      instance.subscribe(event => {
        subscriber2Events.push({ ...event, subscriber: 2 })
      })

      instance.subscribe(event => {
        subscriber3Events.push({ ...event, subscriber: 3 })
      })
    })

    it('should notify all subscribers', async () => {
      await instance.send('GO')

      expect(subscriber1Events).toHaveLength(1)
      expect(subscriber2Events).toHaveLength(1)
      expect(subscriber3Events).toHaveLength(1)

      expect(subscriber1Events[0].subscriber).toBe(1)
      expect(subscriber2Events[0].subscriber).toBe(2)
      expect(subscriber3Events[0].subscriber).toBe(3)
    })

    it('should send same event data to all subscribers', async () => {
      await instance.send('GO')

      const event1 = { ...subscriber1Events[0] }
      const event2 = { ...subscriber2Events[0] }
      const event3 = { ...subscriber3Events[0] }

      delete event1.subscriber
      delete event2.subscriber
      delete event3.subscriber

      expect(event1).toEqual(event2)
      expect(event2).toEqual(event3)
    })
  })

  describe('Unsubscribe', () => {
    let machine
    let instance
    let idle
    let active
    let events
    let unsubscribe

    beforeEach(() => {
      machine = createMachine('unsub')
      idle = machine.state('idle')
      active = machine.state('active')
      events = []

      idle.on('GO', active)
      active.on('BACK', idle)

      machine.initial(idle)
      instance = machine.start()

      unsubscribe = instance.subscribe(event => {
        events.push(event)
      })
    })

    it('should return unsubscribe function', () => {
      expect(typeof unsubscribe).toBe('function')
    })

    it('should stop notifications after unsubscribe', async () => {
      await instance.send('GO')
      expect(events).toHaveLength(1)

      unsubscribe()

      await instance.send('BACK')
      expect(events).toHaveLength(1) // No new events
    })

    it('should handle multiple unsubscribe calls', () => {
      unsubscribe()
      expect(() => unsubscribe()).not.toThrow()
    })

    it('should not affect other subscribers', async () => {
      const otherEvents = []
      instance.subscribe(event => {
        otherEvents.push(event)
      })

      await instance.send('GO')
      expect(events).toHaveLength(1)
      expect(otherEvents).toHaveLength(1)

      unsubscribe()

      await instance.send('BACK')
      expect(events).toHaveLength(1)
      expect(otherEvents).toHaveLength(2) // Still receiving
    })
  })

  describe('Subscription with Hierarchical States', () => {
    let machine
    let instance
    let parent
    let child1
    let child2
    let events

    beforeEach(() => {
      machine = createMachine('hierarchy-sub')
      parent = machine.state('parent')
      child1 = parent.state('child1')
      child2 = parent.state('child2')
      events = []

      parent.initial(child1)
      child1.on('NEXT', child2)
      child2.on('PREV', child1)

      machine.initial(parent)
      instance = machine.start()

      instance.subscribe(event => {
        events.push(event)
      })
    })

    it('should include full paths for nested states', async () => {
      await instance.send('NEXT')

      expect(events[0]).toEqual({
        from: 'parent.child1',
        to: 'parent.child2',
        event: 'NEXT'
      })
    })

    it('should handle parent state transitions', async () => {
      const other = machine.state('other')
      parent.on('LEAVE', other)

      await instance.send('LEAVE')

      expect(events[0]).toEqual({
        from: 'parent.child1',
        to: 'other',
        event: 'LEAVE'
      })
    })
  })

  describe('Subscription Error Handling', () => {
    let machine
    let instance
    let idle
    let active
    let goodEvents
    let errorEvents
    let consoleError

    beforeEach(() => {
      machine = createMachine('error-sub')
      idle = machine.state('idle')
      active = machine.state('active')
      goodEvents = []
      errorEvents = []

      idle.on('GO', active)
      machine.initial(idle)
      instance = machine.start()

      // Mock console.error
      consoleError = console.error
      console.error = jest.fn()

      // Subscriber that throws
      instance.subscribe(() => {
        throw new Error('Subscriber error')
      })

      // Good subscriber
      instance.subscribe(event => {
        goodEvents.push(event)
      })

      // Another throwing subscriber
      instance.subscribe(() => {
        throw new Error('Another error')
      })
    })

    afterEach(() => {
      console.error = consoleError
    })

    it('should continue notifying despite errors', async () => {
      await instance.send('GO')

      expect(goodEvents).toHaveLength(1)
    })

    it('should handle subscriber errors silently', async () => {
      // Error handling is now silent - no console.error calls
      await instance.send('GO')

      // Verify the error subscriber was called but didn't crash the system
      expect(goodEvents).toHaveLength(1)
    })

    it('should isolate subscriber errors', async () => {
      await instance.send('GO')

      // State should still change
      expect(instance.current).toBe('active')
    })
  })

  describe('Self Transition Notifications', () => {
    let machine
    let instance
    let active
    let events

    beforeEach(() => {
      machine = createMachine('self-sub')
      active = machine.state('active')
      events = []

      active.on('REFRESH', active)
      machine.initial(active)
      instance = machine.start()

      instance.subscribe(event => {
        events.push(event)
      })
    })

    it('should notify on self transitions', async () => {
      await instance.send('REFRESH')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        from: 'active',
        to: 'active',
        event: 'REFRESH'
      })
    })
  })

  describe('Subscription Timing', () => {
    let machine
    let instance
    let idle
    let loading
    let loaded
    let events
    let actionOrder

    beforeEach(() => {
      machine = createMachine('timing')
      idle = machine.state('idle')
      loading = machine.state('loading')
      loaded = machine.state('loaded')
      events = []
      actionOrder = []

      idle
        .on('LOAD', loading)
        .do(() => {
          actionOrder.push('sync-action')
        })
        .do(async () => {
          actionOrder.push('async-action')
          await new Promise(resolve => setTimeout(resolve, 10))
        })

      loading.on('DONE', loaded)

      machine.initial(idle)
      instance = machine.start()

      instance.subscribe(() => {
        actionOrder.push('notification')
        events.push(instance.current)
      })
    })

    it('should notify after all blocking actions', async () => {
      await instance.send('LOAD')

      expect(actionOrder).toEqual([
        'sync-action',
        'async-action',
        'notification'
      ])
    })

    it('should have correct state when notified', async () => {
      await instance.send('LOAD')

      expect(events[0]).toBe('loading') // New state
    })
  })
})
