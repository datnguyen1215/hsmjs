/**
 * State lifecycle tests
 * Tests state entry and exit actions
 */

import { createMachine } from '../src/index.js'

describe('State Lifecycle', () => {
  describe('Entry Actions', () => {
    let machine
    let instance
    let idle
    let active
    let entryLog

    beforeEach(() => {
      machine = createMachine('entry')
      idle = machine.state('idle')
      active = machine.state('active')
      entryLog = []

      idle.enter(ctx => {
        entryLog.push('idle-entry')
        ctx.idleEntered = true
      })

      active.enter((ctx, event) => {
        entryLog.push('active-entry')
        ctx.activeEntered = true
        ctx.entryEvent = event ? event.type : null
      })

      idle.on('ACTIVATE', 'active')
      active.on('DEACTIVATE', 'idle')

      machine.initial(idle)
    })

    it('should execute entry action on initial state', () => {
      instance = machine.start({})
      expect(entryLog).toEqual(['idle-entry'])
      expect(instance.context.idleEntered).toBe(true)
    })

    it('should execute entry action on transition', async () => {
      instance = machine.start({})
      entryLog = [] // Reset after initial

      await instance.send('ACTIVATE')
      expect(entryLog).toEqual(['active-entry'])
      expect(instance.context.activeEntered).toBe(true)
    })

    it('should pass event to entry action', async () => {
      instance = machine.start({})
      await instance.send('ACTIVATE')
      expect(instance.context.entryEvent).toBe('ACTIVATE')
    })
  })

  describe('Exit Actions', () => {
    let machine
    let instance
    let idle
    let active
    let exitLog

    beforeEach(() => {
      machine = createMachine('exit')
      idle = machine.state('idle')
      active = machine.state('active')
      exitLog = []

      idle.exit(ctx => {
        exitLog.push('idle-exit')
        ctx.idleExited = true
      })

      active.exit((ctx, event) => {
        exitLog.push('active-exit')
        ctx.activeExited = true
        ctx.exitEvent = event ? event.type : null
      })

      idle.on('ACTIVATE', 'active')
      active.on('DEACTIVATE', 'idle')

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should execute exit action on transition', async () => {
      await instance.send('ACTIVATE')
      expect(exitLog).toEqual(['idle-exit'])
      expect(instance.context.idleExited).toBe(true)
    })

    it('should pass event to exit action', async () => {
      await instance.send('ACTIVATE')
      await instance.send('DEACTIVATE')
      expect(instance.context.exitEvent).toBe('DEACTIVATE')
    })

    it('should not execute exit on initial state', () => {
      // No exit should be called just from starting
      expect(exitLog).toEqual([])
    })
  })

  describe('Entry and Exit Order', () => {
    let machine
    let instance
    let stateA
    let stateB
    let stateC
    let lifecycleLog

    beforeEach(() => {
      machine = createMachine('lifecycle-order')
      stateA = machine.state('stateA')
      stateB = machine.state('stateB')
      stateC = machine.state('stateC')
      lifecycleLog = []

      stateA
        .enter(() => lifecycleLog.push('A-enter'))
        .exit(() => lifecycleLog.push('A-exit'))

      stateB
        .enter(() => lifecycleLog.push('B-enter'))
        .exit(() => lifecycleLog.push('B-exit'))

      stateC
        .enter(() => lifecycleLog.push('C-enter'))
        .exit(() => lifecycleLog.push('C-exit'))

      stateA.on('TO_B', 'stateB')
      stateB.on('TO_C', 'stateC')
      stateC.on('TO_A', 'stateA')

      machine.initial(stateA)
      instance = machine.start()
    })

    it('should execute exit before enter', async () => {
      lifecycleLog = [] // Clear initial entry

      await instance.send('TO_B')
      expect(lifecycleLog).toEqual(['A-exit', 'B-enter'])
    })

    it('should handle multiple transitions correctly', async () => {
      lifecycleLog = []

      await instance.send('TO_B')
      await instance.send('TO_C')
      await instance.send('TO_A')

      expect(lifecycleLog).toEqual([
        'A-exit',
        'B-enter',
        'B-exit',
        'C-enter',
        'C-exit',
        'A-enter'
      ])
    })
  })

  describe('Multiple Entry/Exit Actions', () => {
    let machine
    let instance
    let idle
    let active
    let actionOrder

    beforeEach(() => {
      machine = createMachine('multi-lifecycle')
      idle = machine.state('idle')
      active = machine.state('active')
      actionOrder = []

      idle
        .enter(() => actionOrder.push('idle-enter-1'))
        .enter(() => actionOrder.push('idle-enter-2'))
        .exit(() => actionOrder.push('idle-exit-1'))
        .exit(() => actionOrder.push('idle-exit-2'))

      active
        .enter(() => actionOrder.push('active-enter-1'))
        .enter(() => actionOrder.push('active-enter-2'))

      idle.on('GO', 'active')

      machine.initial(idle)
    })

    it('should execute multiple entry actions in order', () => {
      instance = machine.start()
      expect(actionOrder).toEqual(['idle-enter-1', 'idle-enter-2'])
    })

    it('should execute multiple exit actions in order', async () => {
      instance = machine.start()
      actionOrder = []

      await instance.send('GO')
      expect(actionOrder).toEqual([
        'idle-exit-1',
        'idle-exit-2',
        'active-enter-1',
        'active-enter-2'
      ])
    })
  })

  describe('Self Transitions Lifecycle', () => {
    let machine
    let instance
    let active
    let lifecycleLog

    beforeEach(() => {
      machine = createMachine('self-transition')
      active = machine.state('active')
      lifecycleLog = []

      active
        .enter(ctx => {
          lifecycleLog.push('enter')
          ctx.enterCount = (ctx.enterCount || 0) + 1
        })
        .exit(ctx => {
          lifecycleLog.push('exit')
          ctx.exitCount = (ctx.exitCount || 0) + 1
        })

      active.on('REFRESH', 'active')

      machine.initial(active)
      instance = machine.start({})
    })

    it('should trigger exit and enter on self transition', async () => {
      lifecycleLog = []

      await instance.send('REFRESH')
      expect(lifecycleLog).toEqual(['exit', 'enter'])
    })

    it('should increment counters on self transition', async () => {
      await instance.send('REFRESH')
      expect(instance.context.enterCount).toBe(2) // 1 initial + 1 refresh
      expect(instance.context.exitCount).toBe(1) // Only on refresh
    })
  })


  describe('Named Lifecycle Actions', () => {
    let machine
    let instance
    let idle
    let active
    let lifecycleLog

    beforeEach(() => {
      machine = createMachine('named-lifecycle')
      idle = machine.state('idle')
      active = machine.state('active')
      lifecycleLog = []

      const logEntry = (ctx, event) => {
        lifecycleLog.push({
          action: 'entry',
          state: 'active',
          event: event ? event.type : 'initial'
        })
      }

      const cleanup = ctx => {
        lifecycleLog.push({ action: 'exit', state: 'idle' })
        ctx.cleaned = true
      }

      idle.exit(cleanup)
      active.enter(logEntry)

      idle.on('START', 'active')

      machine.initial(idle)
      instance = machine.start({})
    })

    it('should execute named lifecycle actions', async () => {
      await instance.send('START')

      expect(lifecycleLog).toEqual([
        { action: 'exit', state: 'idle' },
        { action: 'entry', state: 'active', event: 'START' }
      ])
      expect(instance.context.cleaned).toBe(true)
    })
  })
})
