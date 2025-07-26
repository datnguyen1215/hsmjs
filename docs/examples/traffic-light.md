# Traffic Light Example

A traffic light system that cycles through red, yellow, and green states with proper timing.

## State Diagram

```
┌─────┐  TIMER  ┌───────┐  TIMER  ┌────────┐
│ red │ -------> │ green │ -------> │ yellow │
└─────┘          └───────┘          └────────┘
   ^                                      |
   |                TIMER                 |
   └──────────────────────────────────────┘
```

## Basic Implementation

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('traffic-light');

// Define states
const red = machine.state('red');
const yellow = machine.state('yellow');
const green = machine.state('green');

// Define transitions
red.on('TIMER', green);
green.on('TIMER', yellow);
yellow.on('TIMER', red);

// Set initial state
machine.initial(red);

// Create instance
const light = machine.start();

// Manual control
await light.send('TIMER'); // red -> green
await light.send('TIMER'); // green -> yellow
await light.send('TIMER'); // yellow -> red
```

## With Automatic Timing

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('traffic-light');

const red = machine.state('red');
const yellow = machine.state('yellow');
const green = machine.state('green');

// Store timer references in context
const startTimer = action('startTimer', (ctx, event, duration) => {
  ctx.timer = setTimeout(() => {
    ctx.instance.send('TIMER');
  }, duration);
});

const stopTimer = action('stopTimer', (ctx) => {
  if (ctx.timer) {
    clearTimeout(ctx.timer);
    ctx.timer = null;
  }
});

// Configure states with different durations
red
  .enter((ctx) => startTimer(ctx, null, 3000)) // 3 seconds
  .exit(stopTimer);

green
  .enter((ctx) => startTimer(ctx, null, 3000)) // 3 seconds
  .exit(stopTimer);

yellow
  .enter((ctx) => startTimer(ctx, null, 1000)) // 1 second
  .exit(stopTimer);

red.on('TIMER', green);
green.on('TIMER', yellow);
yellow.on('TIMER', red);

machine.initial(red);

// Start the traffic light
const light = machine.start({ timer: null });

// Store instance reference for timer callbacks
light.context.instance = light;

// The light will now cycle automatically
```

## With Light Control

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('traffic-light');

// Define states
const red = machine.state('red');
const yellow = machine.state('yellow');
const green = machine.state('green');

// Light control actions
const updateLights = action('updateLights', (ctx, event, color) => {
  // Turn off all lights
  ctx.lights.red = false;
  ctx.lights.yellow = false;
  ctx.lights.green = false;
  
  // Turn on the appropriate light
  ctx.lights[color] = true;
  
  // Notify observers
  if (ctx.onLightChange) {
    ctx.onLightChange(ctx.lights);
  }
});

// Configure states
red
  .enter((ctx) => updateLights(ctx, null, 'red'))
  .on('TIMER', green);

green
  .enter((ctx) => updateLights(ctx, null, 'green'))
  .on('TIMER', yellow);

yellow
  .enter((ctx) => updateLights(ctx, null, 'yellow'))
  .on('TIMER', red);

machine.initial(red);

// Create instance with light state
const light = machine.start({
  lights: {
    red: false,
    yellow: false,
    green: false
  },
  onLightChange: (lights) => {
    console.log('Lights:', lights);
    // Update physical lights or UI here
  }
});
```

## Pedestrian Crossing

A more complex example with pedestrian crossing support:

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('intersection');

// Main traffic light states
const vehicleGreen = machine.state('vehicleGreen');
const vehicleYellow = machine.state('vehicleYellow');
const vehicleRed = machine.state('vehicleRed');

// Pedestrian substates of vehicleRed
const pedWait = vehicleRed.state('wait');
const pedWalk = vehicleRed.state('walk');
const pedFlash = vehicleRed.state('flash');

vehicleRed.initial(pedWait);

// Vehicle transitions
vehicleGreen
  .on('TIMER', vehicleYellow)
  .on('PED_REQUEST', vehicleYellow); // Pedestrian can request crossing

vehicleYellow.on('TIMER', vehicleRed);

// Pedestrian transitions within red light
pedWait.on('TIMER', pedWalk);
pedWalk.on('TIMER', pedFlash);
pedFlash.on('TIMER', '^.^.vehicleGreen'); // Go back to vehicle green

// Add pedestrian request handling
vehicleGreen
  .on('PED_REQUEST', vehicleGreen)
  .do((ctx) => {
    ctx.pedRequested = true;
  })
  .if((ctx) => !ctx.pedRequested); // Ignore if already requested

// Entry actions
vehicleGreen.enter((ctx) => {
  ctx.lights = { vehicle: 'green', pedestrian: 'dont-walk' };
  ctx.pedRequested = false;
});

vehicleYellow.enter((ctx) => {
  ctx.lights = { vehicle: 'yellow', pedestrian: 'dont-walk' };
});

pedWait.enter((ctx) => {
  ctx.lights = { vehicle: 'red', pedestrian: 'dont-walk' };
});

pedWalk.enter((ctx) => {
  ctx.lights = { vehicle: 'red', pedestrian: 'walk' };
});

pedFlash.enter((ctx) => {
  ctx.lights = { vehicle: 'red', pedestrian: 'flashing-dont-walk' };
});

machine.initial(vehicleGreen);

// Usage
const intersection = machine.start();

// Subscribe to changes
intersection.subscribe(({ to }) => {
  const lights = intersection.context.lights;
  console.log(`State: ${to}, Lights:`, lights);
});

// Simulate pedestrian button press
await intersection.send('PED_REQUEST');
```

## Emergency Override

Add emergency vehicle support:

```javascript
// Add emergency state
const emergency = machine.state('emergency');

// Global emergency handler from any state
machine
  .on('EMERGENCY', emergency)
  .do((ctx) => {
    ctx.previousState = ctx.instance.current;
    ctx.emergencyActive = true;
  });

emergency
  .enter((ctx) => {
    // All lights red except emergency direction
    ctx.lights = { 
      all: 'red',
      emergency: 'green'
    };
  })
  .on('RESUME', (ctx) => ctx.previousState)
  .do((ctx) => {
    ctx.emergencyActive = false;
  });

// Usage
await intersection.send('EMERGENCY');
// ... emergency vehicle passes ...
await intersection.send('RESUME');
```

## Key Concepts Demonstrated

- State transitions with timers
- Entry/exit actions for state setup/cleanup
- Context for storing state data
- Hierarchical states (pedestrian states within red)
- Global event handlers (emergency)
- Dynamic state transitions
- Real-world system modeling