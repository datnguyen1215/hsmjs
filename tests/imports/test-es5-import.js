/**
 * Test ES5 (CommonJS) import compatibility
 */

const { createMachine, action } = require('../../src/index.js')

console.log('Testing ES5 imports...')

// Test that imports work
console.assert(
  typeof createMachine === 'function',
  'createMachine should be a function'
)
console.assert(typeof action === 'function', 'action should be a function')

// Test basic functionality
const machine = createMachine('test')
console.assert(machine.name === 'test', 'Machine name should be "test"')

const idle = machine.state('idle')
const active = machine.state('active')

idle.on('ACTIVATE', active)
machine.initial(idle)

const instance = machine.start()
console.assert(instance.current === 'idle', 'Initial state should be "idle"')

// Test async functionality
;(async () => {
  await instance.send('ACTIVATE')
  console.assert(
    instance.current === 'active',
    'State should be "active" after transition'
  )

  // Test action helper
  const namedAction = action('test', ctx => {
    ctx.tested = true
  })
  console.assert(
    namedAction.actionName === 'test',
    'Action should have correct name'
  )

  console.log('✓ ES5 import tests passed!')
})().catch(err => {
  console.error('✗ ES5 import tests failed:', err)
  process.exit(1)
})
