/**
 * Hierarchical state tests
 * Tests nested states and parent-child relationships
 */

import { createMachine } from '../src/index.js'

describe('Hierarchical States', () => {
  describe('Basic Nested States', () => {
    let machine
    let instance
    let auth
    let unauth
    let login
    let register

    beforeEach(() => {
      machine = createMachine('auth-machine')
      auth = machine.state('authenticated')
      unauth = machine.state('unauthenticated')

      // Nested states
      login = unauth.state('login')
      register = unauth.state('register')

      unauth.initial(login)

      login.on('REGISTER', 'register')
      register.on('BACK', 'login')
      unauth.on('LOGIN_SUCCESS', 'authenticated')
      auth.on('LOGOUT', 'unauthenticated')

      machine.initial(unauth)
      instance = machine.start()
    })

    it('should start in nested initial state', () => {
      expect(instance.current).toBe('unauthenticated.login')
    })

    it('should transition between sibling states', async () => {
      await instance.send('REGISTER')
      expect(instance.current).toBe('unauthenticated.register')
    })

    it('should transition from nested to parent state', async () => {
      await instance.send('LOGIN_SUCCESS')
      expect(instance.current).toBe('authenticated')
    })

    it('should enter default child when transitioning to parent', async () => {
      await instance.send('LOGIN_SUCCESS')
      await instance.send('LOGOUT')
      expect(instance.current).toBe('unauthenticated.login')
    })
  })

  describe('Deep Nesting', () => {
    let machine
    let instance
    let app
    let dashboard
    let settings
    let profile
    let basic
    let advanced

    beforeEach(() => {
      machine = createMachine('deep-nesting')
      app = machine.state('app')
      dashboard = app.state('dashboard')
      settings = app.state('settings')

      // Nested in settings
      profile = settings.state('profile')
      basic = profile.state('basic')
      advanced = profile.state('advanced')

      app.initial(dashboard)
      settings.initial(profile)
      profile.initial(basic)

      dashboard.on('SETTINGS', 'settings')
      settings.on('BACK', 'dashboard')
      basic.on('ADVANCED', 'advanced')
      advanced.on('BASIC', 'basic')

      machine.initial(app)
      instance = machine.start()
    })

    it('should handle deep nesting', () => {
      expect(instance.current).toBe('app.dashboard')
    })

    it('should enter deeply nested states', async () => {
      await instance.send('SETTINGS')
      expect(instance.current).toBe('app.settings.profile.basic')
    })

    it('should transition within deeply nested states', async () => {
      await instance.send('SETTINGS')
      await instance.send('ADVANCED')
      expect(instance.current).toBe('app.settings.profile.advanced')
    })
  })

  describe('Parent State Transitions', () => {
    let machine
    let instance
    let online
    let offline
    let connected
    let reconnecting
    let disconnected

    beforeEach(() => {
      machine = createMachine('connection')
      online = machine.state('online')
      offline = machine.state('offline')

      connected = online.state('connected')
      reconnecting = online.state('reconnecting')
      disconnected = offline.state('disconnected')

      online.initial(connected)
      offline.initial(disconnected)

      // Parent-level transitions
      machine.on('NETWORK_DOWN', 'offline')
      machine.on('NETWORK_UP', 'online')

      // Child transitions
      connected.on('CONNECTION_LOST', 'reconnecting')
      reconnecting.on('RECONNECTED', 'connected')

      machine.initial(online)
      instance = machine.start()
    })

    it('should handle parent state transitions from any child', async () => {
      expect(instance.current).toBe('online.connected')

      await instance.send('NETWORK_DOWN')
      expect(instance.current).toBe('offline.disconnected')
    })

    it('should transition from deeply nested state via parent', async () => {
      await instance.send('CONNECTION_LOST')
      expect(instance.current).toBe('online.reconnecting')

      await instance.send('NETWORK_DOWN')
      expect(instance.current).toBe('offline.disconnected')
    })

    it('should re-enter initial child after parent transition', async () => {
      await instance.send('CONNECTION_LOST')
      expect(instance.current).toBe('online.reconnecting')

      await instance.send('NETWORK_DOWN')
      await instance.send('NETWORK_UP')
      expect(instance.current).toBe('online.connected') // Back to initial
    })
  })

  describe('State Path Resolution', () => {
    let machine
    let a
    let b
    let a1
    let a2
    let b1

    beforeEach(() => {
      machine = createMachine('paths')
      a = machine.state('a')
      b = machine.state('b')
      a1 = a.state('a1')
      a2 = a.state('a2')
      b1 = b.state('b1')

      a.initial(a1)
      b.initial(b1)
      machine.initial(a)
    })

    it('should have correct state paths', () => {
      expect(a.path).toBe('a')
      expect(a1.path).toBe('a.a1')
      expect(a2.path).toBe('a.a2')
      expect(b1.path).toBe('b.b1')
    })

    it('should have correct parent references', () => {
      expect(a1.parent).toBe(a)
      expect(a2.parent).toBe(a)
      expect(b1.parent).toBe(b)
      expect(a.parent).toBe(null)
    })

    it('should check child relationships correctly', () => {
      expect(a1.isChildOf(a)).toBe(true)
      expect(a1.isChildOf(b)).toBe(false)
      expect(a.isChildOf(null)).toBe(false)
    })
  })

  describe('Hierarchical Lifecycle', () => {
    let machine
    let instance
    let parent
    let child1
    let child2
    let lifecycleLog

    beforeEach(() => {
      machine = createMachine('hierarchy-lifecycle')
      parent = machine.state('parent')
      child1 = parent.state('child1')
      child2 = parent.state('child2')
      lifecycleLog = []

      parent
        .enter(() => lifecycleLog.push('parent-enter'))
        .exit(() => lifecycleLog.push('parent-exit'))

      child1
        .enter(() => lifecycleLog.push('child1-enter'))
        .exit(() => lifecycleLog.push('child1-exit'))

      child2
        .enter(() => lifecycleLog.push('child2-enter'))
        .exit(() => lifecycleLog.push('child2-exit'))

      parent.initial(child1)
      child1.on('NEXT', 'child2')
      child2.on('PREV', 'child1')

      machine.initial(parent)
      instance = machine.start()
    })

    it('should enter parent before child on init', () => {
      expect(lifecycleLog).toEqual(['parent-enter', 'child1-enter'])
    })

    it('should only affect child states on sibling transition', async () => {
      lifecycleLog = []

      await instance.send('NEXT')
      expect(lifecycleLog).toEqual(['child1-exit', 'child2-enter'])
      // Parent should not exit/enter
    })

    it('should exit child before parent', async () => {
      const other = machine.state('other')
      parent.on('LEAVE', 'other')

      lifecycleLog = []
      await instance.send('LEAVE')

      expect(lifecycleLog[0]).toBe('child1-exit')
      expect(lifecycleLog[1]).toBe('parent-exit')
    })
  })

  describe('Complex Hierarchical Transitions', () => {
    let machine
    let instance
    let a
    let b
    let a1
    let a2
    let b1
    let b2

    beforeEach(() => {
      machine = createMachine('complex')
      a = machine.state('a')
      b = machine.state('b')
      a1 = a.state('1')
      a2 = a.state('2')
      b1 = b.state('1')
      b2 = b.state('2')

      a.initial(a1)
      b.initial(b1)

      // Cross-hierarchy transitions
      a1.on('CROSS', 'b.2')
      b2.on('BACK', 'a.1')

      // Parent transitions
      a.on('SWITCH', 'b')
      b.on('SWITCH', 'a')

      machine.initial(a)
      instance = machine.start()
    })

    it('should handle cross-hierarchy transitions', async () => {
      expect(instance.current).toBe('a.1')

      await instance.send('CROSS')
      expect(instance.current).toBe('b.2')
    })

    it('should handle transitions back across hierarchies', async () => {
      await instance.send('CROSS')
      await instance.send('BACK')
      expect(instance.current).toBe('a.1')
    })

    it('should respect initial states after parent transition', async () => {
      await instance.send('CROSS') // Now in b.2
      await instance.send('SWITCH') // Parent transition b -> a
      expect(instance.current).toBe('a.1') // Should be in initial child
    })
  })

  describe('State Finding', () => {
    let machine
    let parent
    let child
    let grandchild

    beforeEach(() => {
      machine = createMachine('finding')
      parent = machine.state('parent')
      child = parent.state('child')
      grandchild = child.state('grandchild')
    })

    it('should find states by path', () => {
      expect(machine.findState('parent')).toBe(parent)
      expect(machine.findState('parent.child')).toBe(child)
      expect(machine.findState('parent.child.grandchild')).toBe(grandchild)
    })

    it('should return null for non-existent paths', () => {
      expect(machine.findState('nonexistent')).toBe(null)
      expect(machine.findState('parent.nonexistent')).toBe(null)
    })

    it('should get ancestors correctly', () => {
      const ancestors = grandchild.getAncestors()
      expect(ancestors).toEqual([parent, child])
    })
  })
})
