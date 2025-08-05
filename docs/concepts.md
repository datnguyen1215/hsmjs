# Core Concepts

## State Machines

A state machine is a model that describes a system as being in one of several states at any given time. It defines:
- What states exist
- How to transition between states
- What happens during transitions

## States

States represent distinct modes of your system. Only one state can be active at a time.

```javascript
const idle = machine.state('idle');
const loading = machine.state('loading');
```

## Transitions

Transitions define how your machine moves from one state to another in response to events.

```javascript
idle.on('FETCH', 'loading');  // When FETCH event occurs, go from idle to loading
```

## Events

Events trigger transitions. They can carry data as payload.

```javascript
instance.send('LOGIN', { username: 'john' });
```

## Actions

Code that executes during transitions:
- **Entry/Exit Actions** - Run when entering or leaving a state
- **Transition Actions** - Run during a transition
- **Blocking vs Non-blocking** - Actions can block or run in background

## Context

Persistent data that survives state transitions.

```javascript
const instance = machine.start({ user: null, retries: 0 });
```

## Guards

Conditions that must be true for a transition to occur.

```javascript
state.on('SUBMIT', 'success').if(ctx => ctx.form.isValid);
```

## Hierarchical States

States can have child states, creating a hierarchy.

```javascript
const auth = machine.state('auth');
const login = auth.state('login');     // auth.login
const register = auth.state('register'); // auth.register
```

That's it! Check out [examples](./examples/) to see these concepts in action.