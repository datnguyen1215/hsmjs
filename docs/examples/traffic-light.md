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
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine('traffic-light');

// Define states
machine.state('red');
machine.state('yellow');
machine.state('green');

// Define transitions
machine.state('red').on('TIMER', 'green');
machine.state('green').on('TIMER', 'yellow');
machine.state('yellow').on('TIMER', 'red');

// Set initial state
machine.initial('red');

// Create instance
const light = machine.start();

// Manual control
await light.send('TIMER'); // red -> green
await light.send('TIMER'); // green -> yellow
await light.send('TIMER'); // yellow -> red
```

## With Automatic Timing

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine('traffic-light');

// Define states
machine.state('red');
machine.state('yellow');
machine.state('green');

// Configure automatic transitions with after() method
machine.state('red').after(3000, 'green');   // 3 seconds
machine.state('green').after(3000, 'yellow'); // 3 seconds
machine.state('yellow').after(1000, 'red');   // 1 second

// Set initial state
machine.initial('red');

// Start the traffic light
const light = machine.start();

// The light will now cycle automatically
// No manual timer management needed!
```

## With Light Control

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine('traffic-light');

// Define states
machine.state('red');
machine.state('yellow');
machine.state('green');

// Configure states with entry actions
machine.state('red')
  .enter((ctx) => {
    // Turn off all lights
    ctx.lights.red = true;
    ctx.lights.yellow = false;
    ctx.lights.green = false;

    // Notify observers
    if (ctx.onLightChange) {
      ctx.onLightChange(ctx.lights);
    }
  })
  .after(3000, 'green');

machine.state('green')
  .enter((ctx) => {
    ctx.lights.red = false;
    ctx.lights.yellow = false;
    ctx.lights.green = true;

    if (ctx.onLightChange) {
      ctx.onLightChange(ctx.lights);
    }
  })
  .after(3000, 'yellow');

machine.state('yellow')
  .enter((ctx) => {
    ctx.lights.red = false;
    ctx.lights.yellow = true;
    ctx.lights.green = false;

    if (ctx.onLightChange) {
      ctx.onLightChange(ctx.lights);
    }
  })
  .after(1000, 'red');

machine.initial('red');

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
import { createMachine } from '@datnguyen1215/hsmjs';

const machine = createMachine('intersection');

// Main traffic light states
const vehicleGreen = machine.state('vehicleGreen');
const vehicleYellow = machine.state('vehicleYellow');
const vehicleRed = machine.state('vehicleRed');

// Pedestrian substates of vehicleRed
const pedWait = vehicleRed.state('wait');
const pedWalk = vehicleRed.state('walk');
const pedFlash = vehicleRed.state('flash');

vehicleRed.initial('wait');

// Vehicle transitions
vehicleGreen
  .on('TIMER', 'vehicleYellow')
  .on('PED_REQUEST', 'vehicleYellow'); // Pedestrian can request crossing

vehicleYellow.on('TIMER', 'vehicleRed');

// Pedestrian transitions within red light
pedWait.on('TIMER', 'walk');
pedWalk.on('TIMER', 'flash');
pedFlash.on('TIMER', '^.^.vehicleGreen'); // Go back to vehicle green

// Add pedestrian request handling
vehicleGreen
  .on('PED_REQUEST', 'vehicleGreen')
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