/**
 * Chaining API tests
 * Tests that machine methods return machine instance for chaining
 */

import { createMachine } from '../src/index.js'

describe('Chaining API', () => {
  let machine

  beforeEach(() => {
    machine = createMachine('chaining-test')
  })

  describe('Machine method chaining', () => {
    it('should return state from state() method', () => {
      const result = machine.state('state1')
      expect(result.id).toBe('state1')
      expect(result.path).toBe('state1')
    })

    it('should return machine from initial() method', () => {
      machine.state('state1')
      const result = machine.initial('state1')
      expect(result).toBe(machine)
    })

    it('should return transition from on() method', () => {
      machine.state('state1')
      machine.state('state2')
      const result = machine.on('EVENT', 'state2')
      expect(result.target).toBe('state2')
      expect(typeof result.do).toBe('function')
      expect(typeof result.fire).toBe('function')
    })

    it('should return machine from enter() method', () => {
      const result = machine.enter(() => {})
      expect(result).toBe(machine)
    })

    it('should return machine from exit() method', () => {
      const result = machine.exit(() => {})
      expect(result).toBe(machine)
    })

    it('should return machine from start() method', () => {
      machine.state('state1').initial('state1')
      const result = machine.start()
      expect(result).toBe(machine)
    })
  })

  describe('Complex chaining patterns', () => {
    it('should allow full machine configuration via chaining', () => {
      // Create states first
      machine.state('idle')
      machine.state('loading')
      machine.state('error')

      // Then chain machine configuration
      machine.initial('idle')

      // Add global transitions separately
      machine.on('LOAD', 'loading')
      machine.on('ERROR', 'error')
      machine.on('RESET', 'idle')

      const instance = machine
        .enter(() => console.log('Machine started'))
        .exit(() => console.log('Machine stopped'))
        .start()

      expect(instance).toBe(machine)
      expect(machine.current).toBe('idle')
    })

    it('should work with nested state configuration', () => {
      // Create states first
      const authState = machine.state('auth')
      const unauthState = machine.state('unauth')

      // Chain machine configuration
      machine.initial('unauth')

      // Configure nested states on the actual state objects
      unauthState.state('login')
      unauthState.state('register')
      unauthState.initial('login')

      const instance = machine.start()
      expect(instance.current).toBe('unauth.login')
    })

    it('should handle transitions in chained configuration', async () => {
      // Create states first
      machine.state('a')
      machine.state('b')
      machine.state('c')

      // Then chain machine configuration
      machine.initial('a')
      machine.on('NEXT', 'b')

      const instance = machine.start()

      await instance.send('NEXT')
      expect(instance.current).toBe('b')
    })
  })

  describe('Method delegation verification', () => {
    it('should delegate state() to rootState', () => {
      machine.state('test')
      expect(machine.rootState.children.has('test')).toBe(true)
    })

    it('should delegate initial() to rootState', () => {
      machine.state('test')
      machine.initial('test')
      expect(machine.rootState.initialChild).toBe('test')
    })

    it('should delegate on() to rootState', () => {
      machine.state('test')
      machine.on('EVENT', 'test')
      const transitions = machine.rootState.getTransitions('EVENT')
      expect(transitions.length).toBe(1)
      expect(transitions[0].target).toBe('test')
    })

    it('should delegate enter() to rootState', () => {
      const action = () => {}
      machine.enter(action)
      expect(machine.rootState.entryActions).toContain(action)
    })

    it('should delegate exit() to rootState', () => {
      const action = () => {}
      machine.exit(action)
      expect(machine.rootState.exitActions).toContain(action)
    })
  })

  describe('Global transition API', () => {
    it('should allow chaining .if() on machine.on()', () => {
      machine.state('test')
      const result = machine.on('EVENT', 'test')
      expect(typeof result.if).toBe('function')
      expect(result.target).toBe('test')
    })

    it('should allow chaining .do() on machine.on()', () => {
      machine.state('test')
      const result = machine.on('EVENT', 'test')
      expect(typeof result.do).toBe('function')
      expect(result.target).toBe('test')
    })

    it('should still support transition chaining on states', () => {
      const state = machine.rootState.state('test')
      const transition = state.on('EVENT', 'test')
      expect(transition.if).toBeDefined()
      expect(transition.do).toBeDefined()
    })
  })
})