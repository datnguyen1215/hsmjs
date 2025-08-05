/**
 * String-only transition validation tests
 * Tests that transitions only accept string targets, not objects
 */

import { createMachine } from '../src/index.js'

describe('String-Only Transition Validation', () => {
  let machine
  let state1
  let state2

  beforeEach(() => {
    machine = createMachine('test-machine')
    state1 = machine.state('state1')
    state2 = machine.state('state2')
  })

  describe('State.on() validation', () => {
    it('should accept string targets', () => {
      expect(() => {
        state1.on('EVENT', 'state2')
      }).not.toThrow()
    })

    it('should accept function targets that return strings', () => {
      expect(() => {
        state1.on('EVENT', (ctx) => ctx.condition ? 'state2' : 'state1')
      }).not.toThrow()
    })

    it('should reject state object targets', () => {
      expect(() => {
        state1.on('EVENT', state2)
      }).toThrow('State transition target must be a string or function')
    })

    it('should reject non-string, non-function targets', () => {
      expect(() => {
        state1.on('EVENT', 123)
      }).toThrow('State transition target must be a string or function')

      expect(() => {
        state1.on('EVENT', true)
      }).toThrow('State transition target must be a string or function')

      expect(() => {
        state1.on('EVENT', { id: 'state2' })
      }).toThrow('State transition target must be a string or function')

      expect(() => {
        state1.on('EVENT', null)
      }).toThrow('State transition target must be a string or function')
    })
  })

  describe('Machine.on() validation', () => {
    it('should accept string targets for global transitions', () => {
      expect(() => {
        machine.on('RESET', 'state1')
      }).not.toThrow()
    })

    it('should reject state object targets for global transitions', () => {
      expect(() => {
        machine.on('RESET', state1)
      }).toThrow('State transition target must be a string or function')
    })
  })

  describe('Dynamic target validation', () => {
    it('should accept functions that return strings', async () => {
      state1.on('DYNAMIC', (ctx) => 'state2')
      machine.initial(state1)

      const instance = machine.start()
      await instance.send('DYNAMIC')
      expect(instance.current).toBe('state2')
    })

    it('should throw error if dynamic function returns non-string', async () => {
      state1.on('DYNAMIC', (ctx) => state2)
      machine.initial(state1)

      const instance = machine.start()
      await expect(instance.send('DYNAMIC')).rejects.toThrow(
        'Dynamic target function must return a string'
      )
    })

    it('should throw error if dynamic function returns null', async () => {
      state1.on('DYNAMIC', (ctx) => null)
      machine.initial(state1)

      const instance = machine.start()
      await expect(instance.send('DYNAMIC')).rejects.toThrow(
        'Dynamic target function must return a string'
      )
    })
  })

  describe('Relative path targets', () => {
    it('should accept parent reference strings', () => {
      const parent = machine.state('parent')
      const child = parent.state('child')

      expect(() => {
        child.on('UP', '^')
      }).not.toThrow()
    })

    it('should accept sibling reference strings', () => {
      const parent = machine.state('parent')
      const child1 = parent.state('child1')
      const child2 = parent.state('child2')

      expect(() => {
        child1.on('SIBLING', '^.child2')
      }).not.toThrow()
    })

    it('should accept grandparent reference strings', () => {
      const grandparent = machine.state('grandparent')
      const parent = grandparent.state('parent')
      const child = parent.state('child')

      expect(() => {
        child.on('TOP', '^^')
      }).not.toThrow()
    })
  })

  describe('Transition execution with strings', () => {
    it('should resolve string targets correctly', async () => {
      state1.on('NEXT', 'state2')
      state2.on('BACK', 'state1')
      machine.initial(state1)

      const instance = machine.start()
      expect(instance.current).toBe('state1')

      await instance.send('NEXT')
      expect(instance.current).toBe('state2')

      await instance.send('BACK')
      expect(instance.current).toBe('state1')
    })

    it('should resolve relative paths correctly', async () => {
      const parent = machine.state('parent')
      const child1 = parent.state('child1')
      const child2 = parent.state('child2')

      parent.initial(child1)
      machine.initial(parent)

      child1.on('SIBLING', '^.child2')
      child2.on('SIBLING', '^.child1')
      child2.on('UP', '^')

      const instance = machine.start()
      expect(instance.current).toBe('parent.child1')

      await instance.send('SIBLING')
      expect(instance.current).toBe('parent.child2')

      await instance.send('UP')
      expect(instance.current).toBe('parent.child1') // Re-enters initial child
    })
  })
})