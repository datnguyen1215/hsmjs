/**
 * React Integration Example for HSMJS
 *
 * This example demonstrates how to integrate HSMJS with React using
 * a custom hook. It shows a simple counter with loading states.
 */

import React, { useReducer, useEffect, useMemo } from 'react';
import { createMachine, assign } from '../src/index.js';

// Custom hook for HSMJS integration
const useMachine = (machine) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsubscribe = machine.subscribe(() => forceUpdate());
    return unsubscribe;
  }, [machine]);

  return [machine.state, machine.context, machine.send.bind(machine)];
};

// Counter machine with async increment
const createCounterMachine = () => createMachine({
  id: 'counter',
  initial: 'idle',
  context: {
    count: 0,
    lastUpdated: null
  },
  states: {
    idle: {
      on: {
        INCREMENT: 'incrementing',
        DECREMENT: {
          actions: [assign({
            count: ctx => ctx.count - 1,
            lastUpdated: () => new Date().toLocaleTimeString()
          })]
        },
        RESET: {
          actions: [assign({
            count: 0,
            lastUpdated: null
          })]
        }
      }
    },
    incrementing: {
      entry: [async (ctx) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 500));
        machine.send('INCREMENT_COMPLETE');
      }],
      on: {
        INCREMENT_COMPLETE: {
          target: 'idle',
          actions: [assign({
            count: ctx => ctx.count + 1,
            lastUpdated: () => new Date().toLocaleTimeString()
          })]
        }
      }
    }
  }
});

// React Counter Component
const Counter = () => {
  // Create machine instance only once
  const machine = useMemo(() => createCounterMachine(), []);

  // Use our custom hook
  const [state, context, send] = useMachine(machine);

  return (
    <div style={{
      maxWidth: '300px',
      margin: '20px auto',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>React + HSMJS Counter</h2>

      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        margin: '20px 0',
        textAlign: 'center'
      }}>
        Count: {context.count}
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => send('INCREMENT')}
          disabled={state === 'incrementing'}
          style={{
            padding: '10px 15px',
            backgroundColor: state === 'incrementing' ? '#ccc' : '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state === 'incrementing' ? 'not-allowed' : 'pointer'
          }}
        >
          {state === 'incrementing' ? 'Adding...' : '+'}
        </button>

        <button
          onClick={() => send('DECREMENT')}
          disabled={state === 'incrementing'}
          style={{
            padding: '10px 15px',
            backgroundColor: state === 'incrementing' ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state === 'incrementing' ? 'not-allowed' : 'pointer'
          }}
        >
          -
        </button>

        <button
          onClick={() => send('RESET')}
          disabled={state === 'incrementing'}
          style={{
            padding: '10px 15px',
            backgroundColor: state === 'incrementing' ? '#ccc' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state === 'incrementing' ? 'not-allowed' : 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      <div style={{
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        <div>State: <strong>{state}</strong></div>
        {context.lastUpdated && (
          <div>Last updated: {context.lastUpdated}</div>
        )}
      </div>
    </div>
  );
};

// Toggle Machine for second example
const createToggleMachine = () => createMachine({
  id: 'toggle',
  initial: 'inactive',
  context: {
    clickCount: 0,
    message: 'Click to activate'
  },
  states: {
    inactive: {
      entry: [assign({ message: 'Click to activate' })],
      on: {
        TOGGLE: {
          target: 'active',
          actions: [assign({
            clickCount: ctx => ctx.clickCount + 1,
            message: 'Active! Click to deactivate'
          })]
        }
      }
    },
    active: {
      on: {
        TOGGLE: {
          target: 'inactive',
          actions: [assign({
            clickCount: ctx => ctx.clickCount + 1,
            message: 'Inactive! Click to activate'
          })]
        }
      }
    }
  }
});

// Toggle Component
const Toggle = () => {
  const machine = useMemo(() => createToggleMachine(), []);
  const [state, context, send] = useMachine(machine);

  return (
    <div style={{
      maxWidth: '300px',
      margin: '20px auto',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Toggle Switch</h2>

      <div style={{
        textAlign: 'center',
        margin: '20px 0'
      }}>
        <div
          onClick={() => send('TOGGLE')}
          style={{
            width: '60px',
            height: '30px',
            backgroundColor: state === 'active' ? '#28a745' : '#ccc',
            borderRadius: '15px',
            position: 'relative',
            cursor: 'pointer',
            margin: '0 auto',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{
            width: '26px',
            height: '26px',
            backgroundColor: 'white',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: state === 'active' ? '32px' : '2px',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} />
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        fontSize: '14px',
        color: '#666'
      }}>
        <div>{context.message}</div>
        <div>Total clicks: {context.clickCount}</div>
        <div>State: <strong>{state}</strong></div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          color: '#333',
          fontFamily: 'Arial, sans-serif',
          marginBottom: '10px'
        }}>
          HSMJS React Examples
        </h1>
        <p style={{
          color: '#666',
          fontSize: '16px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          These examples demonstrate how to integrate HSMJS state machines
          with React components using a simple custom hook.
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        justifyContent: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <Counter />
        <Toggle />
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        fontSize: '14px',
        color: '#666'
      }}>
        <p>
          View the source code to see how these machines are implemented.
          <br />
          Notice how the state machine logic is completely separate from the UI!
        </p>
      </div>
    </div>
  );
};

export default App;