/**
 * TypeScript validation tests for hsmjs
 * These tests validate that TypeScript declarations work correctly
 * and provide proper IntelliSense support
 */

import { 
  createMachine, 
  action, 
  Machine, 
  State, 
  Instance, 
  Transition,
  HistoryManager,
  CircularBuffer,
  BaseContext,
  BaseEvent,
  StateChangeEvent,
  HistoryEntry,
  EventPayload 
} from '../../types/index';

// ============================================================================
// Test Interfaces
// ============================================================================

interface TestContext extends BaseContext {
  count: number;
  user: { id: string; name: string } | null;
  isLoading: boolean;
  error?: string;
}

type TestEvents = 
  | { type: 'START' }
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_USER'; user: { id: string; name: string } }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

// ============================================================================
// Basic Factory Function Tests
// ============================================================================

// Test createMachine function
const machine: Machine<TestContext> = createMachine<TestContext>('test-machine');

// Test generic inference
const inferredMachine = createMachine('inferred');
// inferredMachine should have BaseContext as default

// Test action helper
const namedAction = action('test-action', (ctx: TestContext) => {
  ctx.count += 1;
});

const asyncNamedAction = action('async-action', async (ctx: TestContext) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  ctx.isLoading = false;
});

// ============================================================================
// Machine API Tests
// ============================================================================

// Test state creation
const idle: State<TestContext> = machine.state('idle');
const loading: State<TestContext> = machine.state('loading');
const active: State<TestContext> = machine.state('active');
const error: State<TestContext> = machine.state('error');

// Test initial state setting
machine.initial(idle);
machine.initial('idle'); // Should accept string

// Test global transitions
const globalTransition: Transition<TestContext, TestEvents> = machine.on('RESET', idle);
globalTransition
  .if((ctx: TestContext) => ctx.error !== undefined)
  .do((ctx: TestContext) => {
    ctx.error = undefined;
    ctx.count = 0;
  });

// Test machine methods
const foundState: State<TestContext> | null = machine.findState('idle');
const allStates: State<TestContext>[] = machine.getAllStates();

// Test visualization
const mermaidDiagram: string = machine.visualize();
const visualizer = machine.visualizer();

// ============================================================================
// State API Tests
// ============================================================================

// Test hierarchical states
const activeSubstate = active.state('processing');
const anotherSubstate = active.state('waiting');

// Test initial child
active.initial(activeSubstate);
active.initial('processing'); // Should accept string

// Test entry and exit actions
idle
  .enter((ctx: TestContext) => {
    ctx.isLoading = false;
  })
  .exit((ctx: TestContext) => {
    ctx.isLoading = true;
  });

// Test transitions with type-safe events
const loginTransition: Transition<TestContext, Extract<TestEvents, { type: 'LOGIN' }>> = 
  idle.on('LOGIN', loading);

loginTransition
  .if((ctx: TestContext, event) => {
    // Event should be properly typed
    return event.email.includes('@') && event.password.length > 0;
  })
  .doAsync(async (ctx: TestContext, event) => {
    // Simulate API call
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: event.email, password: event.password })
    });
    const data = await response.json();
    ctx.user = data.user;
    return { userId: data.user.id };
  });

// Test fire-and-forget actions
const incrementTransition = active.on('INCREMENT', active);
incrementTransition
  .do((ctx: TestContext) => {
    ctx.count += 1;
  })
  .fire(async (ctx: TestContext) => {
    // Analytics tracking
    await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ action: 'increment', count: ctx.count })
    });
  });

// Test guards and conditional logic
loading
  .on('SET_USER', active)
  .if((ctx: TestContext, event) => {
    return event.user.id.length > 0;
  })
  .do((ctx: TestContext, event) => {
    ctx.user = event.user;
    ctx.isLoading = false;
  });

// Test error handling
loading
  .on('ERROR', error)
  .do((ctx: TestContext, event) => {
    ctx.error = event.message;
    ctx.isLoading = false;
  });

// Test state hierarchy methods
const isChild: boolean = activeSubstate.isChildOf(active);
const ancestors: State<TestContext>[] = activeSubstate.getAncestors();
const relativeState: State<TestContext> | null = activeSubstate.findRelative('^.waiting');

// ============================================================================
// Instance API Tests
// ============================================================================

// Test instance creation
const initialContext: TestContext = {
  count: 0,
  user: null,
  isLoading: false
};

const instance: Instance<TestContext> = machine.start(initialContext, {
  history: {
    maxSize: 100,
    enableCompression: true,
    excludeStates: ['error']
  }
});

// Test current state access
const currentState: string | null = instance.current;

// Test event sending with type safety
async function testEventSending() {
  await instance.send('START');
  
  // Type-safe payload
  await instance.send('LOGIN', { 
    email: 'user@example.com', 
    password: 'secret123' 
  });
  
  await instance.send('INCREMENT');
  
  await instance.send('SET_USER', {
    user: { id: '123', name: 'John Doe' }
  });
  
  await instance.send('ERROR', {
    message: 'Something went wrong'
  });
}

// Test state change subscription
const unsubscribe = instance.subscribe((event: StateChangeEvent) => {
  console.log(`State changed from ${event.from} to ${event.to}`);
  console.log(`Event: ${event.event}`);
  if (event.rollback) {
    console.log('This was a rollback operation');
  }
});

// Test history management
const history = instance.history();
const entries: HistoryEntry[] = history.entries;
const currentEntry: HistoryEntry | null = history.current;

// Test history queries
const recentEntries = history.getRange(0, 10);
const errorEntry = history.find(entry => entry.toState === 'error');
const allErrorEntries = history.filter(entry => entry.toState === 'error');

// Test rollback functionality
async function testRollback() {
  const targetEntry = history.getByIndex(5);
  if (targetEntry && history.canRollback(targetEntry)) {
    const result = await instance.rollback(targetEntry);
    if (result.success) {
      console.log(`Rolled back ${result.stepsBack} steps`);
    } else {
      console.error(`Rollback failed: ${result.error?.message}`);
    }
  }
}

// Test memory management
const memoryUsage = instance.getHistoryMemoryUsage();
console.log(`History using ${memoryUsage.totalSize} bytes`);

// Test visualization with current state
const instanceDiagram: string = instance.visualize();
const instanceVisualizer = instance.visualizer();

// ============================================================================
// History Manager Tests
// ============================================================================

const historyManager = new HistoryManager({
  maxSize: 50,
  enableCompression: false,
  excludeStates: ['idle'],
  contextSerializer: (ctx) => ({ ...ctx, serialized: true })
});

// Test recording transitions
const entryId = historyManager.recordTransition('idle', 'loading', initialContext, 'START', {
  customData: 'test'
});

// Test history queries
const historyInterface = historyManager.getHistory();
const entryById = historyManager.getById(entryId || '');

// ============================================================================
// Circular Buffer Tests
// ============================================================================

const buffer = new CircularBuffer<HistoryEntry>(10);

const testEntry: HistoryEntry = {
  id: 'test-entry',
  timestamp: Date.now(),
  fromState: 'idle',
  toState: 'loading',
  context: initialContext,
  trigger: 'START',
  metadata: { size: 100 }
};

const evictedEntry = buffer.add(testEntry);
const retrievedEntry = buffer.get(0);
const bufferArray = buffer.toArray();
const bufferStats = buffer.getStats();

// ============================================================================
// Type Utility Tests
// ============================================================================

// Test EventPayload utility type
type LoginEvent = EventPayload<TestEvents, 'LOGIN'>;
// LoginEvent should be: { type: 'LOGIN'; email: string; password: string }

type ErrorEvent = EventPayload<TestEvents, 'ERROR'>;
// ErrorEvent should be: { type: 'ERROR'; message: string }

// Test in action parameter
const typedAction = (ctx: TestContext, event: LoginEvent) => {
  // event.email and event.password should be available with IntelliSense
  console.log(`Login attempt for ${event.email}`);
  ctx.isLoading = true;
};

// ============================================================================
// Export Validation Tests
// ============================================================================

// Test default export
import defaultExport from '../../types/index';

const machineFromDefault = defaultExport.createMachine('from-default');
const actionFromDefault = defaultExport.action('from-default', () => {});

// ============================================================================
// Edge Cases and Advanced Usage
// ============================================================================

// Test dynamic target resolution
const dynamicTransition = active.on('DYNAMIC', (ctx: TestContext, event: BaseEvent) => {
  return ctx.count > 10 ? 'idle' : 'loading';
});

// Test complex nested states
const complexState = machine.state('complex');
const level1 = complexState.state('level1');
const level2 = level1.state('level2');
const level3 = level2.state('level3');

// Test relative path resolution
const relativeTransition = level3.on('UP', '^');
const relativeSibling = level3.on('SIBLING', '^.sibling');

// Test self-transitions
const selfTransition = active.on('SELF', active);

// Test transition chaining
idle
  .on('CHAIN1', loading)
    .if((ctx) => ctx.count === 0)
    .do((ctx) => { ctx.isLoading = true; })
    .fire((ctx) => { console.log('Chain 1 fired'); })
  .on('CHAIN2', error)
    .if((ctx) => ctx.error !== undefined)
    .doAsync(async (ctx) => { 
      await new Promise(resolve => setTimeout(resolve, 100));
      ctx.isLoading = false;
    });

// ============================================================================
// Compilation Test Export
// ============================================================================

// Export something to make this a valid module
export const typeValidationPassed = true;

// These functions demonstrate the API works correctly
export { 
  testEventSending, 
  testRollback, 
  machine, 
  instance,
  typedAction 
};