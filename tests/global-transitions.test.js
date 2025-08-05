/**
 * Global transition tests
 * Tests machine-level transitions that work from any state
 */

import { createMachine } from '../src/index.js'

describe('Global Transitions', () => {
  describe('Basic Global Transitions', () => {
    let machine
    let instance
    let idle
    let loading
    let error

    beforeEach(() => {
      machine = createMachine('global')
      idle = machine.state('idle')
      loading = machine.state('loading')
      error = machine.state('error')

      // Normal transitions
      idle.on('LOAD', 'loading')
      loading.on('SUCCESS', 'idle')

      // Global error handling
      machine.on('ERROR', 'error')
      error.on('RETRY', 'idle')

      machine.initial(idle)
      instance = machine.start()
    })

    it('should handle global transition from any state', async () => {
      // From idle
      await instance.send('ERROR')
      expect(instance.current).toBe('error')

      await instance.send('RETRY')
      expect(instance.current).toBe('idle')

      // From loading
      await instance.send('LOAD')
      expect(instance.current).toBe('loading')

      await instance.send('ERROR')
      expect(instance.current).toBe('error')
    })

    it('should prioritize local transitions over global', async () => {
      // Add local ERROR handler
      idle.on('ERROR', 'loading')

      await instance.send('ERROR')
      expect(instance.current).toBe('loading') // Local wins
    })
  })

  describe('Global Transitions with Guards', () => {
    let machine
    let instance
    let working
    let maintenance
    let emergency

    beforeEach(() => {
      machine = createMachine('guarded-global')
      working = machine.state('working')
      maintenance = machine.state('maintenance')
      emergency = machine.state('emergency')

      // Global shutdown with guards
      machine.on('SHUTDOWN', 'emergency').if(ctx => ctx.emergency === true)

      machine.on('SHUTDOWN', 'maintenance').if(ctx => ctx.emergency === false)

      machine.initial(working)
    })

    it('should evaluate guards on global transitions', async () => {
      instance = machine.start({ emergency: true })
      await instance.send('SHUTDOWN')
      expect(instance.current).toBe('emergency')
    })

    it('should choose correct global transition based on guard', async () => {
      instance = machine.start({ emergency: false })
      await instance.send('SHUTDOWN')
      expect(instance.current).toBe('maintenance')
    })

    it('should stay in current state if no global guards pass', async () => {
      instance = machine.start({}) // No emergency property
      await instance.send('SHUTDOWN')
      expect(instance.current).toBe('working')
    })
  })

  describe('Global Transitions with Actions', () => {
    let machine
    let instance
    let stateA
    let stateB
    let stateC
    let actionLog

    beforeEach(() => {
      machine = createMachine('global-actions')
      stateA = machine.state('stateA')
      stateB = machine.state('stateB')
      stateC = machine.state('stateC')
      actionLog = []

      stateA.on('NEXT', 'stateB')
      stateB.on('NEXT', 'stateC')

      // Global reset with actions
      machine
        .on('RESET', 'stateA')
        .do(ctx => {
          actionLog.push('reset-action')
          ctx.resetCount = (ctx.resetCount || 0) + 1
        })
        .fire(() => {
          actionLog.push('reset-fire')
        })

      machine.initial(stateA)
      instance = machine.start({})
    })

    it('should execute actions on global transitions', async () => {
      await instance.send('NEXT')
      await instance.send('NEXT')
      expect(instance.current).toBe('stateC')

      await instance.send('RESET')
      expect(instance.current).toBe('stateA')
      expect(actionLog).toContain('reset-action')
      expect(instance.context.resetCount).toBe(1)
    })

    it('should execute fire actions on global transitions', async () => {
      await instance.send('RESET')

      // Wait for fire action
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(actionLog).toContain('reset-fire')
    })
  })

  describe('Global Transitions in Hierarchical States', () => {
    let machine
    let instance
    let parent
    let child1
    let child2
    let error

    beforeEach(() => {
      machine = createMachine('global-hierarchy')
      parent = machine.state('parent')
      child1 = parent.state('child1')
      child2 = parent.state('child2')
      error = machine.state('error')

      parent.initial(child1)
      child1.on('NEXT', 'child2')

      // Global error from any level
      machine.on('PANIC', 'error')
      error.on('RECOVER', 'parent')

      machine.initial(parent)
      instance = machine.start()
    })

    it('should handle global transitions from nested states', async () => {
      expect(instance.current).toBe('parent.child1')

      await instance.send('PANIC')
      expect(instance.current).toBe('error')
    })

    it('should work from deeply nested states', async () => {
      await instance.send('NEXT')
      expect(instance.current).toBe('parent.child2')

      await instance.send('PANIC')
      expect(instance.current).toBe('error')
    })

    it('should return to default child state', async () => {
      await instance.send('NEXT')
      await instance.send('PANIC')
      await instance.send('RECOVER')

      expect(instance.current).toBe('parent.child1') // Initial child
    })
  })

  describe('Multiple Global Handlers', () => {
    let machine
    let instance
    let idle
    let stateA
    let stateB
    let stateC

    beforeEach(() => {
      machine = createMachine('multi-global')
      idle = machine.state('idle')
      stateA = machine.state('stateA')
      stateB = machine.state('stateB')
      stateC = machine.state('stateC')

      // Multiple global handlers for same event
      machine.on('SWITCH', 'stateA').if(ctx => ctx.target === 'A')

      machine.on('SWITCH', 'stateB').if(ctx => ctx.target === 'B')

      machine.on('SWITCH', 'stateC') // No guard - fallback

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should handle multiple global transitions with guards', async () => {
      instance.context.target = 'A'
      await instance.send('SWITCH')
      expect(instance.current).toBe('stateA')

      instance.context.target = 'B'
      await instance.send('SWITCH')
      expect(instance.current).toBe('stateB')
    })

    it('should use unguarded global as fallback', async () => {
      instance.context.target = 'unknown'
      await instance.send('SWITCH')
      expect(instance.current).toBe('stateC')
    })
  })

  describe('Global Transition Priority', () => {
    let machine
    let instance
    let parent
    let child
    let globalTarget
    let parentTarget
    let localTarget

    beforeEach(() => {
      machine = createMachine('priority')
      parent = machine.state('parent')
      child = parent.state('child')
      globalTarget = machine.state('global')
      parentTarget = machine.state('parent-target')
      localTarget = parent.state('local')

      parent.initial(child)

      // Different levels of EVENT handler
      machine.on('EVENT', 'global')
      parent.on('EVENT', 'parent-target')
      child.on('EVENT', 'local')

      machine.initial(parent)
      instance = machine.start()
    })

    it('should prioritize local over parent over global', async () => {
      await instance.send('EVENT')
      expect(instance.current).toBe('parent.local') // Local wins
    })

    it('should use parent handler when no local handler', async () => {
      // Remove local handler by transitioning to parent level
      const child2 = parent.state('child2')
      child.on('MOVE', 'child2')
      await instance.send('MOVE')

      await instance.send('EVENT')
      expect(instance.current).toBe('parent-target') // Parent wins
    })

    it('should fall back to global when no local or parent', async () => {
      // Create a new parent without EVENT handler
      const other = machine.state('other')
      const otherChild = other.state('child')
      other.initial(otherChild)

      parent.on('GO', 'other')
      await instance.send('GO')

      await instance.send('EVENT')
      expect(instance.current).toBe('global') // Global is last resort
    })
  })
})
