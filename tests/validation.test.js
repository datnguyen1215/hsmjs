/**
 * Machine validation tests
 * Tests the validate() method for checking machine configuration
 */

import { createMachine } from '../src/index.js'

describe('Machine Validation', () => {
  describe('Initial state validation', () => {
    it('should detect missing initial state', () => {
      const machine = createMachine('no-initial')
      machine.state('state1')
      machine.state('state2')

      const result = machine.validate()
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('No initial state defined')
    })

    it('should pass with valid initial state', () => {
      const machine = createMachine('with-initial')
      machine.state('state1')
      machine.state('state2')
      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Transition target validation', () => {
    it('should detect invalid transition targets', () => {
      const machine = createMachine('invalid-targets')
      const state1 = machine.rootState.state('state1')
      state1.on('NEXT', 'nonexistent')
      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("State 'state1' has invalid transition target: 'nonexistent'")
    })

    it('should validate sibling state transitions', () => {
      const machine = createMachine('sibling-transitions')
      machine.state('state1')
      machine.state('state2')

      const state1 = machine.findState('state1')
      state1.on('NEXT', 'state2')

      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate nested state transitions', () => {
      const machine = createMachine('nested-transitions')
      machine.state('parent')
      const parent = machine.findState('parent')
      parent.state('child1')
      parent.state('child2')
      parent.initial('child1')

      const child1 = parent.children.get('child1')
      child1.on('NEXT', 'child2') // Sibling reference

      machine.initial('parent')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate relative path transitions', () => {
      const machine = createMachine('relative-paths')
      machine.state('parent')
      const parent = machine.findState('parent')
      const child = parent.state('child')

      child.on('UP', '^') // Parent reference
      parent.initial('child')
      machine.initial('parent')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid relative paths', () => {
      const machine = createMachine('invalid-relative')
      const state1 = machine.rootState.state('state1')
      state1.on('UP', '^^^') // Too many levels up
      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("State 'state1' has invalid relative transition target: '^^^'")
    })
  })

  describe('Unreachable state detection', () => {
    it('should detect unreachable states', () => {
      const machine = createMachine('unreachable')
      machine.state('state1')
      machine.state('state2')
      machine.state('orphan') // No transitions lead here

      const state1 = machine.findState('state1')
      state1.on('NEXT', 'state2')

      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("State 'orphan' is unreachable")
    })

    it('should consider global transitions for reachability', () => {
      const machine = createMachine('global-reachable')
      machine.state('state1')
      machine.state('state2')
      machine.state('emergency')

      machine.on('PANIC', 'emergency') // Global transition
      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should consider nested states reachable via parent', () => {
      const machine = createMachine('nested-reachable')
      machine.state('parent')
      const parent = machine.findState('parent')
      parent.state('child1')
      parent.state('child2')
      parent.initial('child1')

      machine.initial('parent')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect unreachable nested states', () => {
      const machine = createMachine('nested-unreachable')
      machine.state('parent1')
      machine.state('parent2')

      const parent1 = machine.findState('parent1')
      parent1.state('child1')
      parent1.initial('child1')

      const parent2 = machine.findState('parent2')
      parent2.state('orphan') // Parent2 is unreachable, so is this child
      parent2.initial('orphan')

      machine.initial('parent1')

      const result = machine.validate()
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("State 'parent2' is unreachable")
      expect(result.errors).toContain("State 'parent2.orphan' is unreachable")
    })
  })

  describe('Complex validation scenarios', () => {
    it('should validate machine with dynamic transitions', () => {
      const machine = createMachine('dynamic')
      machine.state('state1')
      machine.state('state2')

      const state1 = machine.findState('state1')
      state1.on('NEXT', (ctx) => ctx.condition ? 'state2' : 'state1')

      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle multiple errors', () => {
      const machine = createMachine('multiple-errors')
      const state1 = machine.rootState.state('state1')
      state1.on('NEXT', 'invalid1')
      state1.on('PREV', 'invalid2')

      machine.state('unreachable')

      // No initial state

      const result = machine.validate()
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(2)
      expect(result.errors).toContain('No initial state defined')
      expect(result.errors).toContain("State 'state1' has invalid transition target: 'invalid1'")
      expect(result.errors).toContain("State 'state1' has invalid transition target: 'invalid2'")
      expect(result.errors).toContain("State 'unreachable' is unreachable")
    })

    it('should validate self-transitions', () => {
      const machine = createMachine('self-transition')
      machine.state('state1')

      const state1 = machine.findState('state1')
      state1.on('RETRY', 'state1') // Self-transition

      machine.initial('state1')

      const result = machine.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})