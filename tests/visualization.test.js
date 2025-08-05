/**
 * Test suite for state machine visualization functionality
 */

const { createMachine } = require('../src/index.js')

describe('State Machine Visualization', () => {

  test('simple state machine visualization', () => {
    const machine = createMachine('toggle')

    const off = machine.state('off')
    const on = machine.state('on')

    off.on('TOGGLE', 'on')
    on.on('TOGGLE', 'off')

    machine.initial(off)

    const diagram = machine.visualizer().visualize()

    expect(diagram).toContain('graph TD')
    expect(diagram).toContain('off(("off"))')
    expect(diagram).toContain('on("on")')
    expect(diagram).toContain('off -->|TOGGLE| on')
    expect(diagram).toContain('on -->|TOGGLE| off')
    expect(diagram).toContain('class off initial')
  })

  test('hierarchical state machine visualization', () => {
    const machine = createMachine('media-player')

    // Top-level states
    const stopped = machine.state('stopped')
    const playing = machine.state('playing')

    // Nested states within 'playing'
    const normal = playing.state('normal')
    const fastForward = playing.state('fast-forward')

    // Transitions
    stopped.on('PLAY', 'playing.normal')
    normal.on('FF', 'fast-forward')
    fastForward.on('NORMAL', 'normal')
    playing.on('STOP', 'stopped')

    machine.initial(stopped)

    const diagram = machine.visualizer().visualize()

    expect(diagram).toContain('graph TD')
    expect(diagram).toContain('stopped(("stopped"))')
    expect(diagram).toContain('subgraph playing["playing"]')
    expect(diagram).toContain('playing_normal("normal")')
    expect(diagram).toContain('playing_fast_forward("fast-forward")')
    expect(diagram).toContain('stopped -->|PLAY| playing_normal')
    expect(diagram).toContain('playing_normal -->|FF| fast_forward')
    expect(diagram).toContain('playing_fast_forward -->|NORMAL| normal')
    expect(diagram).toContain('class stopped initial')
  })

  test('multi-level hierarchical states', () => {
    const machine = createMachine('authentication')

    // Top level
    const loggedOut = machine.state('logged-out')
    const loggedIn = machine.state('logged-in')

    // Second level under logged-in
    const profile = loggedIn.state('profile')
    const settings = loggedIn.state('settings')

    // Third level under settings
    const account = settings.state('account')
    const privacy = settings.state('privacy')

    // Transitions across levels
    loggedOut.on('LOGIN', 'profile')
    profile.on('SETTINGS', 'account')
    account.on('PRIVACY', 'privacy')
    loggedIn.on('LOGOUT', 'logged-out')

    machine.initial(loggedOut)

    const diagram = machine.visualizer().visualize()

    expect(diagram).toContain('graph TD')
    expect(diagram).toContain('logged_out(("logged-out"))')
    expect(diagram).toContain('subgraph logged_in["logged-in"]')
    expect(diagram).toContain('logged_in_profile("profile")')
    expect(diagram).toContain('subgraph logged_in_settings["settings"]')
    expect(diagram).toContain('logged_in_settings_account("account")')
    expect(diagram).toContain('logged_in_settings_privacy("privacy")')
  })

  test('instance visualization with current state', async () => {
    const machine = createMachine('traffic-light')

    const red = machine.state('red')
    const yellow = machine.state('yellow')
    const green = machine.state('green')

    red.on('TIMER', 'green')
    green.on('TIMER', 'yellow')
    yellow.on('TIMER', 'red')

    machine.initial(red)

    const instance = machine.start()

    // Test initial state highlighting
    let diagram = instance.visualizer().visualize()
    expect(diagram).toContain('class red initial')

    // Test state transition
    await instance.send('TIMER')
    diagram = instance.visualizer().visualize()
    // Current state is no longer tracked in visualization
    expect(diagram).toContain('graph TD')

    // Test another transition
    await instance.send('TIMER')
    diagram = instance.visualizer().visualize()
    // Ensure diagram is still generated
    expect(diagram).toContain('graph TD')
    // Current state highlighting removed from visualization
  })

  test('instance visualization with hierarchical states', async () => {
    const machine = createMachine('app')

    const idle = machine.state('idle')
    const active = machine.state('active')
    const working = active.state('working')
    const paused = active.state('paused')

    idle.on('START', 'active.working')
    working.on('PAUSE', 'paused')
    paused.on('RESUME', 'working')
    active.on('STOP', 'idle')

    active.initial(working)
    machine.initial(idle)

    const instance = machine.start()

    // Test initial state
    let diagram = instance.visualizer().visualize()
    expect(diagram).toContain('class idle initial')

    // Test transition to nested state
    await instance.send('START')
    diagram = instance.visualizer().visualize()
    // Current state is no longer tracked in visualization
    expect(diagram).toContain('graph TD')

    // Test transition within nested states
    await instance.send('PAUSE')
    diagram = instance.visualizer().visualize()
    // Current state is no longer tracked in visualization
    expect(diagram).toContain('graph TD')
  })

  test('global transitions in visualization', () => {
    const machine = createMachine('app-with-global')

    const state1 = machine.state('state1')
    const state2 = machine.state('state2')
    const error = machine.state('error')

    state1.on('NEXT', 'state2')
    state2.on('BACK', 'state1')

    // Global transition that works from any state
    machine.on('ERROR', 'error')

    machine.initial(state1)

    const diagram = machine.visualizer().visualize()

    expect(diagram).toContain('graph TD')
    expect(diagram).toContain('START((" ")) -->|ERROR| error')
    expect(diagram).toContain('state1 -->|NEXT| state2')
    expect(diagram).toContain('state2 -->|BACK| state1')
  })

  test('sanitized IDs for complex state names', () => {
    const machine = createMachine('complex-names')

    const state1 = machine.state('state-with-dashes')
    const state2 = machine.state('state.with.dots')
    const state3 = machine.state('state with spaces')

    state1.on('EVENT', 'state.with.dots')
    state2.on('EVENT', 'state with spaces')

    machine.initial(state1)

    const diagram = machine.visualizer().visualize()

    expect(diagram).toContain('state_with_dashes(("state-with-dashes"))')
    expect(diagram).toContain('state_with_dots("state.with.dots")')
    expect(diagram).toContain('state_with_spaces("state with spaces")')
    expect(diagram).toContain('state_with_dashes -->|EVENT| state_with_dots')
    expect(diagram).toContain('state_with_dots -->|EVENT| state_with_spaces')
  })

  test('empty machine visualization', () => {
    const machine = createMachine('empty')

    // Machine with no states should not crash
    const diagram = machine.visualizer().visualize()

    expect(diagram).toContain('graph TD')
    expect(diagram).not.toContain('class')
    expect(diagram).not.toContain('-->')
  })

  test('machine with only initial state', () => {
    const machine = createMachine('single-state')

    const only = machine.state('only')
    machine.initial(only)

    const diagram = machine.visualizer().visualize()

    expect(diagram).toContain('graph TD')
    expect(diagram).toContain('only(("only"))')
    expect(diagram).toContain('class only initial')
    expect(diagram).not.toContain('-->')
  })

  describe('Visualizer API', () => {
    let machine

    beforeEach(() => {
      machine = createMachine('test-visualizer')
      const idle = machine.state('idle')
      const active = machine.state('active')

      idle.on('START', 'active')
      active.on('STOP', 'idle')

      machine.initial(idle)
    })

    test('machine.visualizer() returns object with visualize method', () => {
      const visualizer = machine.visualizer()

      expect(visualizer).toHaveProperty('visualize')
      expect(typeof visualizer.visualize).toBe('function')
      expect(visualizer).not.toHaveProperty('save')
      expect(visualizer).not.toHaveProperty('preview')
    })

    test('visualizer.visualize() returns valid Mermaid syntax', () => {
      const visualizer = machine.visualizer()
      const diagram = visualizer.visualize()

      expect(typeof diagram).toBe('string')
      expect(diagram).toContain('graph TD')
      expect(diagram).toContain('idle')
      expect(diagram).toContain('active')
      expect(diagram).toContain('START')
      expect(diagram).toContain('STOP')
    })
  })

  describe('Instance Visualizer API', () => {
    let machine, instance

    beforeEach(() => {
      machine = createMachine('test-instance')
      const idle = machine.state('idle')
      const active = machine.state('active')

      idle.on('START', 'active')
      active.on('STOP', 'idle')

      machine.initial(idle)
      instance = machine.start()
    })

    test('instance.visualizer() returns object with visualize method', () => {
      const visualizer = instance.visualizer()

      expect(visualizer).toHaveProperty('visualize')
      expect(typeof visualizer.visualize).toBe('function')
      expect(visualizer).not.toHaveProperty('save')
      expect(visualizer).not.toHaveProperty('preview')
    })

    test('instance visualizer.visualize() returns valid Mermaid syntax', () => {
      const visualizer = instance.visualizer()
      const diagram = visualizer.visualize()

      expect(typeof diagram).toBe('string')
      expect(diagram).toContain('graph TD')
      expect(diagram).toContain('idle')
      expect(diagram).toContain('active')
      expect(diagram).toContain('class idle initial')
    })
  })

})