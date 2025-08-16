import { createMachine, assign } from '../src/index.js';

// Simulate localStorage for demonstration (Node.js doesn't have it)
class MockStorage {
  constructor() {
    this.storage = new Map();
  }

  setItem(key, value) {
    this.storage.set(key, value);
    console.log(`[Storage] Saved "${key}": ${value.slice(0, 100)}${value.length > 100 ? '...' : ''}`);
  }

  getItem(key) {
    const value = this.storage.get(key);
    if (value) {
      console.log(`[Storage] Retrieved "${key}": ${value.slice(0, 100)}${value.length > 100 ? '...' : ''}`);
    } else {
      console.log(`[Storage] No data found for "${key}"`);
    }
    return value || null;
  }

  removeItem(key) {
    this.storage.delete(key);
    console.log(`[Storage] Removed "${key}"`);
  }

  clear() {
    this.storage.clear();
    console.log('[Storage] Cleared all data');
  }
}

const localStorage = new MockStorage();

const runExample = async () => {
  // Create a machine that represents an application with persistent state
  const appMachine = createMachine({
    id: 'persistentApp',
    initial: 'initializing',
    context: {
      user: null,
      preferences: {
        theme: 'light',
        language: 'en'
      },
      data: [],
      sessionCount: 0,
      lastSaved: null
    },
    states: {
      initializing: {
        entry: [
          assign({ sessionCount: ctx => ctx.sessionCount + 1 }),
          () => console.log('Application initializing...')
        ],
        on: {
          RESTORE_FROM_STORAGE: {
            target: 'authenticated',
            actions: [
              assign((ctx, event) => ({
                ...event.restoredState.context,
                sessionCount: ctx.sessionCount // Keep session count from initialization
              })),
              () => console.log('State restored from persistent storage')
            ]
          },
          START_FRESH: 'onboarding'
        }
      },
      onboarding: {
        entry: [() => console.log('Starting fresh onboarding...')],
        on: {
          COMPLETE_ONBOARDING: {
            target: 'authenticated',
            actions: [
              assign((ctx, event) => ({
                user: event.user,
                preferences: { ...ctx.preferences, ...event.preferences }
              }))
            ]
          }
        }
      },
      authenticated: {
        entry: [() => console.log('User authenticated, app ready')],
        on: {
          UPDATE_PROFILE: {
            actions: [
              assign((ctx, event) => ({
                user: { ...ctx.user, ...event.updates }
              }))
            ]
          },
          UPDATE_PREFERENCES: {
            actions: [
              assign((ctx, event) => ({
                preferences: { ...ctx.preferences, ...event.preferences }
              }))
            ]
          },
          LOAD_DATA: {
            target: 'loading',
            actions: [
              assign({ data: [] }) // Clear existing data
            ]
          },
          SAVE_STATE: {
            actions: [
              assign({ lastSaved: () => new Date().toISOString() }),
              () => {
                // Save current state to storage
                const snapshot = appMachine.snapshot;
                localStorage.setItem('appState', JSON.stringify(snapshot));
                console.log('Application state saved to storage');
              }
            ]
          },
          SIMULATE_CRASH: 'crashed'
        }
      },
      loading: {
        entry: [
          () => console.log('Loading data...'),
          async () => {
            // Simulate async data loading
            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate loaded data
            const mockData = [
              { id: 1, name: 'Document 1', content: 'Important content' },
              { id: 2, name: 'Document 2', content: 'More content' },
              { id: 3, name: 'Document 3', content: 'Even more content' }
            ];

            appMachine.send('DATA_LOADED', { data: mockData });
          }
        ],
        on: {
          DATA_LOADED: {
            target: 'authenticated',
            actions: [
              assign((ctx, event) => ({
                data: event.data
              })),
              () => console.log('Data loaded successfully')
            ]
          },
          LOAD_ERROR: {
            target: 'authenticated', // Return to authenticated state
            actions: [
              () => console.log('Failed to load data, continuing without it')
            ]
          }
        }
      },
      crashed: {
        entry: [() => console.log('💥 APPLICATION CRASHED! (simulated)')],
        on: {
          RESTART: 'initializing'
        }
      }
    }
  });

  console.log('=== State Persistence Example ===\n');

  // Check if there's saved state
  console.log('1. Checking for existing saved state...');
  const savedState = localStorage.getItem('appState');

  if (savedState) {
    console.log('   Found saved state! Attempting to restore...');
    try {
      const snapshot = JSON.parse(savedState);
      await appMachine.send('RESTORE_FROM_STORAGE', { restoredState: snapshot });
      console.log('   ✓ State restored successfully');
      console.log('   User:', appMachine.context.user?.name || 'None');
      console.log('   Theme:', appMachine.context.preferences.theme);
      console.log('   Session count:', appMachine.context.sessionCount);
      console.log('   Data items:', appMachine.context.data.length);
    } catch (error) {
      console.log('   ✗ Failed to restore state:', error.message);
      await appMachine.send('START_FRESH');
    }
  } else {
    console.log('   No saved state found, starting fresh...');
    await appMachine.send('START_FRESH');

    // Complete onboarding
    await appMachine.send('COMPLETE_ONBOARDING', {
      user: { id: 1, name: 'John Doe', email: 'john@example.com' },
      preferences: { theme: 'dark', language: 'en' }
    });
  }

  console.log('\n2. Normal application usage...');

  // Update user profile
  await appMachine.send('UPDATE_PROFILE', {
    updates: { name: 'John Smith', lastLogin: new Date().toISOString() }
  });
  console.log('   Profile updated');

  // Change preferences
  await appMachine.send('UPDATE_PREFERENCES', {
    preferences: { theme: 'dark', language: 'es' }
  });
  console.log('   Preferences updated');

  // Load some data
  await appMachine.send('LOAD_DATA');
  await new Promise(resolve => setTimeout(resolve, 150)); // Wait for data loading
  console.log('   Data loaded');

  // Save state periodically (like autosave)
  console.log('\n3. Auto-saving application state...');
  await appMachine.send('SAVE_STATE');

  console.log('\n4. Current application state:');
  console.log('   State:', appMachine.state);
  console.log('   User:', appMachine.context.user.name);
  console.log('   Theme:', appMachine.context.preferences.theme);
  console.log('   Language:', appMachine.context.preferences.language);
  console.log('   Data items:', appMachine.context.data.length);
  console.log('   Session count:', appMachine.context.sessionCount);
  console.log('   Last saved:', appMachine.context.lastSaved);

  // Demonstrate power outage scenario
  console.log('\n5. Simulating power outage...');
  await appMachine.send('SIMULATE_CRASH');
  console.log('   Application state before crash saved');

  // Show what happens after restart
  console.log('\n6. Simulating application restart after power restored...');

  // Create a new machine instance (simulating app restart)
  const newAppMachine = createMachine({
    id: 'persistentApp',
    initial: 'initializing',
    context: {
      user: null,
      preferences: { theme: 'light', language: 'en' },
      data: [],
      sessionCount: 0,
      lastSaved: null
    },
    states: {
      initializing: {
        entry: [
          assign({ sessionCount: ctx => ctx.sessionCount + 1 }),
          () => console.log('Application restarting...')
        ],
        on: {
          RESTORE_FROM_STORAGE: {
            target: 'authenticated',
            actions: [
              assign((ctx, event) => ({
                ...event.restoredState.context,
                sessionCount: ctx.sessionCount // Increment session count
              })),
              () => console.log('State restored from persistent storage')
            ]
          },
          START_FRESH: 'onboarding'
        }
      },
      authenticated: {
        entry: [() => console.log('User authenticated, app ready')],
        on: {
          // Same handlers as before...
        }
      },
      onboarding: {
        // Same as before...
      }
    }
  });

  // Restore from storage
  const restoredState = localStorage.getItem('appState');
  if (restoredState) {
    const snapshot = JSON.parse(restoredState);
    await newAppMachine.restore(snapshot);

    console.log('\n7. Application fully restored after restart:');
    console.log('   State:', newAppMachine.state);
    console.log('   User:', newAppMachine.context.user.name);
    console.log('   Theme:', newAppMachine.context.preferences.theme);
    console.log('   Language:', newAppMachine.context.preferences.language);
    console.log('   Data items:', newAppMachine.context.data.length);
    console.log('   Session count:', newAppMachine.context.sessionCount, '(incremented)');
    console.log('   Last saved:', newAppMachine.context.lastSaved);

    console.log('\n✓ Successfully demonstrated state persistence and recovery!');
  }

  // Show history information
  console.log('\n8. History information:');
  console.log('   Original machine history size:', appMachine.historySize);
  console.log('   Restored machine history size:', newAppMachine.historySize);

  // Demonstrate that we can get snapshots for debugging
  console.log('\n9. Current snapshot for debugging:');
  const currentSnapshot = newAppMachine.snapshot;
  console.log('   Snapshot keys:', Object.keys(currentSnapshot));
  console.log('   Snapshot serializable:', typeof JSON.stringify(currentSnapshot) === 'string');

  // Clean up
  console.log('\n10. Cleanup:');
  localStorage.clear();
  console.log('    Storage cleared');
};

runExample().catch(console.error);