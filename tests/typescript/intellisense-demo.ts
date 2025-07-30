/**
 * IntelliSense demonstration for hsmjs TypeScript definitions
 * This file showcases the comprehensive type support and IntelliSense features
 */

import { createMachine, action, type EventPayload } from '../../types/index';

// ============================================================================
// Complete Type-Safe State Machine Example
// ============================================================================

// Define comprehensive context interface
interface AppContext {
  // User data
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user' | 'guest';
    preferences: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  } | null;
  
  // Authentication state
  auth: {
    token: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    isLoading: boolean;
    error: string | null;
  };
  
  // Application state
  app: {
    isOnline: boolean;
    lastSync: number | null;
    pendingChanges: string[];
    currentView: 'dashboard' | 'profile' | 'settings' | 'login';
  };
  
  // Data state
  data: {
    items: Array<{
      id: string;
      title: string;
      status: 'pending' | 'completed' | 'failed';
      createdAt: number;
    }>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;
  };
}

// Define discriminated union for events with proper payloads
type AppEvents = 
  // Authentication events
  | { type: 'LOGIN_START'; email: string; password: string }
  | { type: 'LOGIN_SUCCESS'; user: AppContext['user']; token: string; refreshToken: string }
  | { type: 'LOGIN_FAILURE'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESH'; token: string; expiresAt: number }
  | { type: 'SESSION_EXPIRED' }
  
  // Data events
  | { type: 'LOAD_DATA' }
  | { type: 'DATA_LOADED'; items: AppContext['data']['items'] }
  | { type: 'DATA_ERROR'; error: string }
  | { type: 'ADD_ITEM'; title: string }
  | { type: 'UPDATE_ITEM'; id: string; updates: Partial<AppContext['data']['items'][0]> }
  | { type: 'DELETE_ITEM'; id: string }
  
  // App events
  | { type: 'NAVIGATE'; view: AppContext['app']['currentView'] }
  | { type: 'ONLINE' }
  | { type: 'OFFLINE' }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

// Create the main machine with full type safety
const appMachine = createMachine<AppContext>('app-machine');

// ============================================================================
// State Definitions with IntelliSense Support
// ============================================================================

// Authentication states
const auth = appMachine.state('auth');
const authIdle = auth.state('idle');
const authLoggingIn = auth.state('logging-in');
const authAuthenticated = auth.state('authenticated');
const authError = auth.state('error');

// Application states
const app = appMachine.state('app');
const appDashboard = app.state('dashboard');
const appProfile = app.state('profile');
const appSettings = app.state('settings');

// Data states
const data = appMachine.state('data');
const dataIdle = data.state('idle');
const dataLoading = data.state('loading');
const dataReady = data.state('ready');
const dataError = data.state('error');

// Set initial states
auth.initial(authIdle);
app.initial(appDashboard);
data.initial(dataIdle);
appMachine.initial(auth);

// ============================================================================
// Type-Safe Actions with IntelliSense
// ============================================================================

// Authentication actions
const startLogin = action('startLogin', (ctx: AppContext, event: EventPayload<AppEvents, 'LOGIN_START'>) => {
  // IntelliSense knows event has email and password properties
  ctx.auth.isLoading = true;
  ctx.auth.error = null;
  console.log(`Logging in user: ${event.email}`);
});

const loginSuccess = action('loginSuccess', (ctx: AppContext, event: EventPayload<AppEvents, 'LOGIN_SUCCESS'>) => {
  // IntelliSense knows event has user, token, and refreshToken properties
  ctx.user = event.user;
  ctx.auth.token = event.token;
  ctx.auth.refreshToken = event.refreshToken;
  ctx.auth.isLoading = false;
  ctx.auth.error = null;
  ctx.auth.expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
});

const loginFailure = action('loginFailure', (ctx: AppContext, event: EventPayload<AppEvents, 'LOGIN_FAILURE'>) => {
  // IntelliSense knows event has error property
  ctx.auth.error = event.error;
  ctx.auth.isLoading = false;
  ctx.user = null;
  ctx.auth.token = null;
});

const logout = action('logout', (ctx: AppContext) => {
  ctx.user = null;
  ctx.auth.token = null;
  ctx.auth.refreshToken = null;
  ctx.auth.expiresAt = null;
  ctx.auth.error = null;
  ctx.app.currentView = 'login';
});

// Data actions
const loadDataStart = action('loadDataStart', (ctx: AppContext) => {
  ctx.data.isLoading = true;
  ctx.data.error = null;
});

const loadDataSuccess = action('loadDataSuccess', (ctx: AppContext, event: EventPayload<AppEvents, 'DATA_LOADED'>) => {
  // IntelliSense knows event has items property with correct type
  ctx.data.items = event.items;
  ctx.data.isLoading = false;
  ctx.data.error = null;
  ctx.data.lastUpdated = Date.now();
});

const addItem = action('addItem', (ctx: AppContext, event: EventPayload<AppEvents, 'ADD_ITEM'>) => {
  // IntelliSense knows event has title property
  const newItem = {
    id: `item-${Date.now()}`,
    title: event.title,
    status: 'pending' as const,
    createdAt: Date.now()
  };
  ctx.data.items.push(newItem);
  ctx.app.pendingChanges.push(newItem.id);
});

// Navigation action
const navigate = action('navigate', (ctx: AppContext, event: EventPayload<AppEvents, 'NAVIGATE'>) => {
  // IntelliSense knows event.view is limited to specific string literals
  ctx.app.currentView = event.view;
});

// ============================================================================
// State Machine Configuration with Type Safety
// ============================================================================

// Authentication flow
authIdle
  .on('LOGIN_START', authLoggingIn)
  .if((ctx, event: EventPayload<AppEvents, 'LOGIN_START'>) => {
    // IntelliSense provides email and password properties
    return event.email.includes('@') && event.password.length >= 8;
  })
  .do(startLogin)
  .doAsync(async (ctx, event: EventPayload<AppEvents, 'LOGIN_START'>) => {
    // Simulate API call with proper typing
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: event.email,
        password: event.password
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return { user: data.user, token: data.token, refreshToken: data.refreshToken };
    } else {
      throw new Error('Login failed');
    }
  });

authLoggingIn
  .on('LOGIN_SUCCESS', authAuthenticated)
  .do(loginSuccess)
  .fire(async (ctx) => {
    // Analytics tracking
    await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event: 'user_login',
        userId: ctx.user?.id,
        timestamp: Date.now()
      })
    });
  });

authLoggingIn
  .on('LOGIN_FAILURE', authError)
  .do(loginFailure);

authAuthenticated
  .on('LOGOUT', authIdle)
  .do(logout);

authAuthenticated
  .on('SESSION_EXPIRED', authIdle)
  .do(logout);

authAuthenticated
  .on('TOKEN_REFRESH', authAuthenticated)
  .do((ctx, event: EventPayload<AppEvents, 'TOKEN_REFRESH'>) => {
    // IntelliSense knows event has token and expiresAt properties
    ctx.auth.token = event.token;
    ctx.auth.expiresAt = event.expiresAt;
  });

authError
  .on('RETRY', authIdle)
  .do((ctx) => {
    ctx.auth.error = null;
  });

authError
  .on('LOGIN_START', authLoggingIn)
  .do(startLogin);

// Data management flow
dataIdle
  .on('LOAD_DATA', dataLoading)
  .do(loadDataStart);

dataLoading
  .on('DATA_LOADED', dataReady)
  .do(loadDataSuccess);

dataLoading
  .on('DATA_ERROR', dataError)
  .do((ctx, event: EventPayload<AppEvents, 'DATA_ERROR'>) => {
    ctx.data.error = event.error;
    ctx.data.isLoading = false;
  });

dataReady
  .on('ADD_ITEM', dataReady)
  .do(addItem);

dataReady
  .on('UPDATE_ITEM', dataReady)
  .do((ctx, event: EventPayload<AppEvents, 'UPDATE_ITEM'>) => {
    // IntelliSense provides id and updates properties with correct types
    const item = ctx.data.items.find(item => item.id === event.id);
    if (item) {
      Object.assign(item, event.updates);
      ctx.app.pendingChanges.push(item.id);
    }
  });

dataReady
  .on('DELETE_ITEM', dataReady)
  .do((ctx, event: EventPayload<AppEvents, 'DELETE_ITEM'>) => {
    ctx.data.items = ctx.data.items.filter(item => item.id !== event.id);
    ctx.app.pendingChanges.push(`deleted-${event.id}`);
  });

dataReady
  .on('LOAD_DATA', dataLoading) // Refresh data
  .do(loadDataStart);

// Global navigation
appMachine
  .on('NAVIGATE', (ctx, event) => {
    // Dynamic target based on authentication state
    return ctx.user ? 'app' : 'auth';
  })
  .do(navigate);

// Global error handling
appMachine
  .on('ERROR', 'error')
  .do((ctx, event: EventPayload<AppEvents, 'ERROR'>) => {
    console.error('Global error:', event.message);
  });

// ============================================================================
// Instance Creation and Usage with IntelliSense
// ============================================================================

// Create initial context with full type safety
const initialContext: AppContext = {
  user: null,
  auth: {
    token: null,
    refreshToken: null,
    expiresAt: null,
    isLoading: false,
    error: null
  },
  app: {
    isOnline: true,
    lastSync: null,
    pendingChanges: [],
    currentView: 'login'
  },
  data: {
    items: [],
    isLoading: false,
    error: null,
    lastUpdated: null
  }
};

// Create instance with history support
const appInstance = appMachine.start(initialContext, {
  history: {
    maxSize: 100,
    enableCompression: true,
    excludeStates: ['auth.logging-in', 'data.loading']
  }
});

// ============================================================================
// Type-Safe Event Handling and State Management
// ============================================================================

// Subscribe to state changes with full type safety
const unsubscribe = appInstance.subscribe((stateChange) => {
  // IntelliSense knows the structure of stateChange
  console.log(`State changed from ${stateChange.from} to ${stateChange.to}`);
  console.log(`Triggered by event: ${stateChange.event}`);
  
  if (stateChange.rollback) {
    console.log('This was a rollback operation');
  }
});

// Type-safe event sending with IntelliSense
async function demonstrateTypeSafety() {
  // Login flow
  await appInstance.send('LOGIN_START', {
    email: 'user@example.com',
    password: 'securePassword123'
  });
  
  // Data operations
  await appInstance.send('LOAD_DATA');
  
  await appInstance.send('ADD_ITEM', {
    title: 'Complete TypeScript integration'
  });
  
  await appInstance.send('UPDATE_ITEM', {
    id: 'item-123',
    updates: {
      status: 'completed',
      title: 'Updated title'
    }
  });
  
  // Navigation
  await appInstance.send('NAVIGATE', {
    view: 'dashboard'
  });
  
  // Error handling
  await appInstance.send('ERROR', {
    message: 'Something went wrong'
  });
}

// ============================================================================
// History and Rollback with Type Safety
// ============================================================================

async function demonstrateHistory() {
  const history = appInstance.history();
  
  // IntelliSense provides all history methods
  const recentEntries = history.getRange(0, 10);
  const loginEntry = history.find(entry => entry.trigger === 'LOGIN_SUCCESS');
  const errorEntries = history.filter(entry => entry.toState?.includes('error'));
  
  // Type-safe rollback
  if (loginEntry && history.canRollback(loginEntry)) {
    const rollbackResult = await appInstance.rollback(loginEntry);
    
    if (rollbackResult.success) {
      console.log(`Successfully rolled back ${rollbackResult.stepsBack} steps`);
    } else {
      console.error(`Rollback failed: ${rollbackResult.error?.message}`);
    }
  }
  
  // Memory management
  const memoryUsage = appInstance.getHistoryMemoryUsage();
  console.log(`History memory usage: ${memoryUsage.totalSize} bytes`);
  console.log(`Entry count: ${memoryUsage.entryCount}`);
  console.log(`Utilization: ${memoryUsage.utilization}%`);
}

// ============================================================================
// Visualization with Type Safety
// ============================================================================

function demonstrateVisualization() {
  // Machine visualization
  const machineVisualizer = appMachine.visualizer();
  
  // IntelliSense provides preview and save methods
  machineVisualizer.preview(); // Opens browser
  machineVisualizer.save('app-machine-diagram.mmd');
  
  // Instance visualization (with current state highlighted)
  const instanceVisualizer = appInstance.visualizer();
  
  instanceVisualizer.preview();
  instanceVisualizer.save('app-instance-current-state.mmd');
  
  // Direct diagram generation
  const mermaidDiagram = appInstance.visualize();
  console.log('Generated Mermaid diagram:', mermaidDiagram);
}

// ============================================================================
// Advanced Type Features
// ============================================================================

// Demonstrate type utilities
type LoginEventType = EventPayload<AppEvents, 'LOGIN_START'>;
// IntelliSense knows this has { type: 'LOGIN_START'; email: string; password: string }

type DataEventType = EventPayload<AppEvents, 'DATA_LOADED'>;
// IntelliSense knows this has { type: 'DATA_LOADED'; items: AppContext['data']['items'] }

// Demonstrate context type extraction
function handleContextChange(context: AppContext) {
  // IntelliSense provides full context structure
  if (context.user) {
    console.log(`User ${context.user.name} is logged in`);
    console.log(`Role: ${context.user.role}`);
    console.log(`Theme: ${context.user.preferences.theme}`);
  }
  
  if (context.data.items.length > 0) {
    console.log(`${context.data.items.length} items loaded`);
    context.data.items.forEach(item => {
      // IntelliSense knows item structure
      console.log(`Item: ${item.title} (${item.status})`);
    });
  }
}

// ============================================================================
// Export Demonstration Functions
// ============================================================================

export {
  appMachine,
  appInstance,
  demonstrateTypeSafety,
  demonstrateHistory,
  demonstrateVisualization,
  handleContextChange,
  unsubscribe
};

export type {
  AppContext,
  AppEvents,
  LoginEventType,
  DataEventType
};