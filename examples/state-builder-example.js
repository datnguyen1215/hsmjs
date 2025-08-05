/**
 * Example demonstrating StateBuilder usage with context switching
 * Shows fluent API for defining states and transitions
 */

import { createMachineBuilder } from '../src/core/create-machine-builder.js'

// Example 1: Simple state machine with fluent API
const simpleMachine = createMachineBuilder('traffic-light')
  .initial('red')
  .state('red')
    .enter(() => console.log('Entering red state'))
    .on('TIMER', 'green')
    .machine()
  .state('green')
    .enter(() => console.log('Entering green state'))
    .on('TIMER', 'yellow')
    .machine()
  .state('yellow')
    .enter(() => console.log('Entering yellow state'))
    .on('TIMER', 'red')
    .machine()
  .build()

console.log('Simple machine created:', simpleMachine.name)

// Example 2: Hierarchical state machine with nested states
const hierarchicalMachine = createMachineBuilder('audio-player')
  .initial('stopped')
  .state('stopped')
    .on('PLAY', 'playing')
    .machine()
  .state('playing')
    .initial('normal')
    .enter(() => console.log('Starting playback'))
    .exit(() => console.log('Stopping playback'))
    .on('STOP', 'stopped')
    .on('PAUSE', 'paused')
    .state('normal')
      .on('SKIP', 'loading')
      .state()
    .state('loading')
      .enter(() => console.log('Loading next track'))
      .on('LOADED', 'normal')
      .state()
    .machine()
  .state('paused')
    .on('PLAY', 'playing')
    .on('STOP', 'stopped')
    .machine()
  .build()

console.log('Hierarchical machine created:', hierarchicalMachine.name)

// Example 3: Complex transitions with guards and actions
const complexMachine = createMachineBuilder('user-auth')
  .initial('idle')
  .state('idle')
    .on('LOGIN', 'authenticating')
      .if((ctx, event) => event.username && event.password)
      .do((ctx, event) => {
        console.log(`Attempting login for: ${event.username}`)
        ctx.attempts = (ctx.attempts || 0) + 1
      })
      .state()
    .machine()
  .state('authenticating')
    .enter(() => console.log('Validating credentials...'))
    .on('SUCCESS', 'authenticated')
      .do((ctx, event) => {
        ctx.user = event.user
        ctx.attempts = 0
      })
      .state()
    .on('FAILURE', 'idle')
      .if((ctx) => ctx.attempts < 3)
      .do((ctx) => console.log(`Login failed. Attempts: ${ctx.attempts}`))
      .state()
    .on('FAILURE', 'locked')
      .if((ctx) => ctx.attempts >= 3)
      .do((ctx) => console.log('Account locked due to too many failed attempts'))
      .state()
    .machine()
  .state('authenticated')
    .enter((ctx) => console.log(`Welcome, ${ctx.user.name}!`))
    .on('LOGOUT', 'idle')
      .do((ctx) => {
        delete ctx.user
        console.log('Logged out successfully')
      })
      .state()
    .machine()
  .state('locked')
    .enter(() => console.log('Account is locked'))
    .on('UNLOCK', 'idle')
      .do((ctx) => {
        ctx.attempts = 0
        console.log('Account unlocked')
      })
      .state()
    .machine()
  .build()

console.log('Complex machine created:', complexMachine.name)

// Example 4: Forward references (states that don't exist yet)
const forwardRefMachine = createMachineBuilder('workflow')
  .initial('start')
  .state('start')
    .on('NEXT', 'middle')  // Forward reference - middle doesn't exist yet
    .on('SKIP', 'end')     // Forward reference - end doesn't exist yet
    .machine()
  .state('middle')         // Now we define middle
    .on('NEXT', 'end')
    .on('BACK', 'start')
    .machine()
  .state('end')           // Now we define end
    .on('RESTART', 'start')
    .machine()
  .build()

console.log('Forward reference machine created:', forwardRefMachine.name)

// Example 5: Demonstrating context switching patterns
const contextSwitchExample = createMachineBuilder('demo')
  .initial('A')
  .state('A')
    .enter(() => console.log('In state A'))
    .on('GO_B', 'B')
      .do(() => console.log('Transitioning A -> B'))
      .state()  // Back to state A context
    .on('GO_C', 'C')
      .if((ctx) => ctx.allowed)
      .state()  // Back to state A context
    .machine()  // Back to machine context
  .state('B')
    .enter(() => console.log('In state B'))
    .state('nested')
      .enter(() => console.log('In nested state'))
      .on('EXIT', '^')  // Go to parent (B)
      .state()  // Back to nested state context
    .initial('nested')
    .on('GO_A', 'A')
    .machine()  // Back to machine context
  .state('C')
    .enter(() => console.log('In state C'))
    .machine()
  .build()

console.log('Context switching example created:', contextSwitchExample.name)

export {
  simpleMachine,
  hierarchicalMachine,
  complexMachine,
  forwardRefMachine,
  contextSwitchExample
}