/**
 * Transition guard tests
 * Tests conditional transitions using guard functions
 */

import { createMachine } from '../dist/cjs/index.js'

describe('Transition Guards', () => {
  describe('Basic Guard Conditions', () => {
    let machine
    let instance
    let idle
    let active
    let error

    beforeEach(() => {
      machine = createMachine('guarded')
      idle = machine.state('idle')
      active = machine.state('active')
      error = machine.state('error')

      // Guard based on context
      idle.on('START', active).if(ctx => ctx.canStart === true)

      idle.on('START', error).if(ctx => ctx.canStart === false)

      machine.initial(idle)
    })

    it('should transition when guard passes', async () => {
      instance = machine.start({ canStart: true })
      await instance.send('START')
      expect(instance.current).toBe('active')
    })

    it('should use alternative transition when guard fails', async () => {
      instance = machine.start({ canStart: false })
      await instance.send('START')
      expect(instance.current).toBe('error')
    })

    it('should stay in current state when no guards pass', async () => {
      instance = machine.start({ canStart: null })
      await instance.send('START')
      expect(instance.current).toBe('idle')
    })
  })

  describe('Guard with Event Data', () => {
    let machine
    let instance
    let pending
    let approved
    let rejected

    beforeEach(() => {
      machine = createMachine('approval')
      pending = machine.state('pending')
      approved = machine.state('approved')
      rejected = machine.state('rejected')

      // Guard based on event payload
      pending
        .on('REVIEW', approved)
        .if((ctx, event) => event.decision === 'approve')

      pending
        .on('REVIEW', rejected)
        .if((ctx, event) => event.decision === 'reject')

      machine.initial(pending)
      instance = machine.start()
    })

    it('should use event data in guard evaluation', async () => {
      await instance.send('REVIEW', { decision: 'approve' })
      expect(instance.current).toBe('approved')
    })

    it('should choose transition based on event payload', async () => {
      await instance.send('REVIEW', { decision: 'reject' })
      expect(instance.current).toBe('rejected')
    })

    it('should ignore event without matching guard', async () => {
      await instance.send('REVIEW', { decision: 'maybe' })
      expect(instance.current).toBe('pending')
    })
  })

  describe('Multiple Guards Priority', () => {
    let machine
    let instance
    let idle
    let stateA
    let stateB
    let stateC

    beforeEach(() => {
      machine = createMachine('priority')
      idle = machine.state('idle')
      stateA = machine.state('stateA')
      stateB = machine.state('stateB')
      stateC = machine.state('stateC')

      // Guards are evaluated in order
      idle.on('GO', stateA).if(ctx => ctx.priority === 1)

      idle.on('GO', stateB).if(ctx => ctx.priority === 2)

      idle.on('GO', stateC) // No guard - fallback

      machine.initial(idle)
    })

    it('should use first matching guard', async () => {
      instance = machine.start({ priority: 1 })
      await instance.send('GO')
      expect(instance.current).toBe('stateA')
    })

    it('should use second guard when first fails', async () => {
      instance = machine.start({ priority: 2 })
      await instance.send('GO')
      expect(instance.current).toBe('stateB')
    })

    it('should use unguarded transition as fallback', async () => {
      instance = machine.start({ priority: 3 })
      await instance.send('GO')
      expect(instance.current).toBe('stateC')
    })
  })

  describe('Complex Guard Logic', () => {
    let machine
    let instance
    let form
    let validating
    let submitting
    let invalid

    beforeEach(() => {
      machine = createMachine('form')
      form = machine.state('form')
      validating = machine.state('validating')
      submitting = machine.state('submitting')
      invalid = machine.state('invalid')

      // Complex validation guard
      form.on('SUBMIT', validating).if(ctx => {
        return ctx.form && ctx.form.email && ctx.form.password
      })

      validating.on('VALIDATED', submitting).if(ctx => {
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.form.email)
        const passwordValid = ctx.form.password.length >= 8
        return emailValid && passwordValid
      })

      validating.on('VALIDATED', invalid).if(ctx => {
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.form.email)
        const passwordValid = ctx.form.password.length >= 8
        return !emailValid || !passwordValid
      })

      machine.initial(form)
    })

    it('should handle complex guard logic', async () => {
      instance = machine.start({
        form: { email: 'user@example.com', password: 'password123' }
      })

      await instance.send('SUBMIT')
      expect(instance.current).toBe('validating')

      await instance.send('VALIDATED')
      expect(instance.current).toBe('submitting')
    })

    it('should reject invalid data', async () => {
      instance = machine.start({
        form: { email: 'invalid-email', password: 'short' }
      })

      await instance.send('SUBMIT')
      expect(instance.current).toBe('validating')

      await instance.send('VALIDATED')
      expect(instance.current).toBe('invalid')
    })

    it('should prevent submission without required fields', async () => {
      instance = machine.start({
        form: { email: 'user@example.com' } // missing password
      })

      await instance.send('SUBMIT')
      expect(instance.current).toBe('form')
    })
  })

  describe('Guard Error Handling', () => {
    let machine
    let instance
    let idle
    let active

    beforeEach(() => {
      machine = createMachine('error-guard')
      idle = machine.state('idle')
      active = machine.state('active')

      // Guard that throws error
      idle.on('START', active).if(() => {
        throw new Error('Guard error')
      })

      machine.initial(idle)
      instance = machine.start()
    })

    it('should treat guard errors as false', async () => {
      await instance.send('START')
      expect(instance.current).toBe('idle')
    })
  })

  describe('Multiple Chained Guards', () => {
    let machine
    let instance
    let idle
    let processing
    let complete
    let error

    beforeEach(() => {
      machine = createMachine('chained-guards')
      idle = machine.state('idle')
      processing = machine.state('processing')
      complete = machine.state('complete')
      error = machine.state('error')

      // Multiple guards on same transition - all must pass
      idle
        .on('PROCESS', processing)
        .if(ctx => ctx.isAuthenticated === true)
        .if(ctx => ctx.hasPermission === true)
        .if(ctx => ctx.quotaAvailable > 0)

      // Alternative transition with different guards
      idle
        .on('PROCESS', error)
        .if(ctx => ctx.isAuthenticated === true)
        .if(ctx => ctx.hasPermission === false)

      processing.on('DONE', complete)

      machine.initial(idle)
    })

    it('should transition when all chained guards pass', async () => {
      instance = machine.start({
        isAuthenticated: true,
        hasPermission: true,
        quotaAvailable: 10
      })
      await instance.send('PROCESS')
      expect(instance.current).toBe('processing')
    })

    it('should not transition when first guard fails', async () => {
      instance = machine.start({
        isAuthenticated: false,
        hasPermission: true,
        quotaAvailable: 10
      })
      await instance.send('PROCESS')
      expect(instance.current).toBe('idle')
    })

    it('should not transition when middle guard fails', async () => {
      instance = machine.start({
        isAuthenticated: true,
        hasPermission: false,
        quotaAvailable: 10
      })
      await instance.send('PROCESS')
      expect(instance.current).toBe('error')
    })

    it('should not transition when last guard fails', async () => {
      instance = machine.start({
        isAuthenticated: true,
        hasPermission: true,
        quotaAvailable: 0
      })
      await instance.send('PROCESS')
      expect(instance.current).toBe('idle')
    })

    it('should use alternative transition when partial guards match', async () => {
      instance = machine.start({
        isAuthenticated: true,
        hasPermission: false,
        quotaAvailable: 5
      })
      await instance.send('PROCESS')
      expect(instance.current).toBe('error')
    })
  })

  describe('Chained Guards with Event Data', () => {
    let machine
    let instance
    let idle
    let approved
    let rejected

    beforeEach(() => {
      machine = createMachine('event-chained-guards')
      idle = machine.state('idle')
      approved = machine.state('approved')
      rejected = machine.state('rejected')

      // Guards using both context and event data
      idle
        .on('SUBMIT', approved)
        .if(ctx => ctx.isActive === true)
        .if((ctx, event) => event.amount > 0)
        .if((ctx, event) => event.amount <= ctx.maxAmount)

      idle
        .on('SUBMIT', rejected)
        .if(ctx => ctx.isActive === true)
        .if((ctx, event) => event.amount > ctx.maxAmount)

      machine.initial(idle)
    })

    it('should pass all guards with valid event data', async () => {
      instance = machine.start({
        isActive: true,
        maxAmount: 1000
      })
      await instance.send('SUBMIT', { amount: 500 })
      expect(instance.current).toBe('approved')
    })

    it("should fail when event data doesn't meet all guards", async () => {
      instance = machine.start({
        isActive: true,
        maxAmount: 1000
      })
      await instance.send('SUBMIT', { amount: 1500 })
      expect(instance.current).toBe('rejected')
    })

    it('should stay in current state when no guard chain matches', async () => {
      instance = machine.start({
        isActive: false,
        maxAmount: 1000
      })
      await instance.send('SUBMIT', { amount: 500 })
      expect(instance.current).toBe('idle')
    })

    it('should handle negative amounts correctly', async () => {
      instance = machine.start({
        isActive: true,
        maxAmount: 1000
      })
      await instance.send('SUBMIT', { amount: -100 })
      expect(instance.current).toBe('idle')
    })
  })

  describe('Complex Chained Guard Scenarios', () => {
    let machine
    let instance
    let idle
    let premium
    let basic
    let trial

    beforeEach(() => {
      machine = createMachine('complex-chains')
      idle = machine.state('idle')
      premium = machine.state('premium')
      basic = machine.state('basic')
      trial = machine.state('trial')

      // Premium user flow
      idle
        .on('ACTIVATE', premium)
        .if(ctx => ctx.user !== null)
        .if(ctx => ctx.user.verified === true)
        .if(ctx => ctx.user.subscription === 'premium')
        .if((ctx, event) => event.features.includes('advanced'))

      // Basic user flow
      idle
        .on('ACTIVATE', basic)
        .if(ctx => ctx.user !== null)
        .if(ctx => ctx.user.verified === true)
        .if(ctx => ctx.user.subscription === 'basic')

      // Trial user flow
      idle
        .on('ACTIVATE', trial)
        .if(ctx => ctx.user !== null)
        .if(ctx => ctx.user.verified === false)

      machine.initial(idle)
    })

    it('should handle complex premium user activation', async () => {
      instance = machine.start({
        user: {
          verified: true,
          subscription: 'premium'
        }
      })
      await instance.send('ACTIVATE', { features: ['basic', 'advanced'] })
      expect(instance.current).toBe('premium')
    })

    it('should fall through to basic when premium conditions not met', async () => {
      instance = machine.start({
        user: {
          verified: true,
          subscription: 'basic'
        }
      })
      await instance.send('ACTIVATE', { features: ['basic'] })
      expect(instance.current).toBe('basic')
    })

    it('should activate trial for unverified users', async () => {
      instance = machine.start({
        user: {
          verified: false,
          subscription: 'premium'
        }
      })
      await instance.send('ACTIVATE', { features: ['advanced'] })
      expect(instance.current).toBe('trial')
    })

    it('should stay idle when user is null', async () => {
      instance = machine.start({
        user: null
      })
      await instance.send('ACTIVATE', { features: ['basic'] })
      expect(instance.current).toBe('idle')
    })
  })
})
