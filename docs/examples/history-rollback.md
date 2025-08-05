# History and Rollback Example

This example demonstrates the history tracking and rollback capabilities of hsmjs state machines.

## Basic History Usage

```javascript
import { createMachine } from '@datnguyen1215/hsmjs';

// Create a state machine
const machine = createMachine('order-processing');

const idle = machine.state('idle');
const processing = machine.state('processing');
const payment = machine.state('payment');
const complete = machine.state('complete');
const cancelled = machine.state('cancelled');

// Define transitions
idle.on('start', 'processing');
processing.on('pay', 'payment');
processing.on('cancel', 'cancelled');
payment.on('success', 'complete');
payment.on('fail', 'processing');
complete.on('reset', 'idle');
cancelled.on('reset', 'idle');

machine.initial(idle);

// Start instance with history enabled
const instance = machine.start(
  { orderId: 'ORD-001', amount: 100 }, 
  {
    history: {
      maxSize: 30,  // Keep last 30 transitions (default)
      enableCompression: false,
      excludeStates: ['temp', 'loading'] // Don't track these states
    }
  }
);

// Process some transitions
await instance.send('start');
instance.context.processingTime = Date.now();

await instance.send('pay');
instance.context.paymentMethod = 'credit_card';

await instance.send('success');
instance.context.completedAt = Date.now();

console.log('Current state:', instance.current); // 'complete'
```

## Accessing History

```javascript
const history = instance.history();

console.log(`History size: ${history.size}`);
console.log('All entries:', history.entries);
console.log('Current entry:', history.current);

// Query specific entries
const firstEntry = history.getByIndex(0);
const latestEntry = history.getByIndex(history.size - 1);

// Find entries by state
const paymentEntry = history.find(entry => entry.toState === 'payment');
const processingEntries = history.filter(entry => entry.toState === 'processing');

// Get entry by ID
const specificEntry = history.getById('some-entry-id');

// Get range of entries
const recentEntries = history.getRange(-5, -1); // Last 5 entries
```

## History Entry Structure

Each history entry contains:

```javascript
{
  id: "history_1704067200000_abc123def",  // Unique identifier
  timestamp: 1704067200000,               // When transition occurred
  fromState: "processing",                // Previous state
  toState: "payment",                     // New state
  context: {                              // Context at time of transition
    orderId: "ORD-001",
    amount: 100,
    processingTime: 1704067100000
  },
  trigger: "pay",                         // Event that caused transition
  metadata: {                             // Additional information
    timestamp: 1704067200000,
    transitionType: "normal",
    size: 156                             // Estimated memory usage
  }
}
```

## Rollback Functionality

### Basic Rollback

```javascript
// Get history and select target entry
const history = instance.history();
const targetEntry = history.entries[2]; // Go back to 3rd entry

// Execute rollback
const rollbackResult = await instance.rollback(targetEntry);

if (rollbackResult.success) {
  console.log(`Rolled back ${rollbackResult.stepsBack} steps`);
  console.log(`From: ${rollbackResult.fromEntry.toState}`);
  console.log(`To: ${rollbackResult.toEntry.toState}`);
  
  // State and context are now restored
  console.log('Current state:', instance.current);
  console.log('Restored context:', instance.context);
} else {
  console.error('Rollback failed:', rollbackResult.error);
}
```

### Rollback to Specific State

```javascript
// Helper function to rollback to last occurrence of a state
async function rollbackToState(instance, stateName) {
  const history = instance.history();
  
  // Find the most recent entry for the target state
  const targetEntry = history.entries
    .slice()
    .reverse()
    .find(entry => entry.toState === stateName);
  
  if (!targetEntry) {
    throw new Error(`State '${stateName}' not found in history`);
  }
  
  return await instance.rollback(targetEntry);
}

// Usage
await rollbackToState(instance, 'processing');
```

### Conditional Rollback

```javascript
// Rollback to last successful payment attempt
async function rollbackToLastSuccess(instance) {
  const history = instance.history();
  const successStates = ['complete', 'payment'];
  
  const lastSuccessEntry = history.entries
    .slice()
    .reverse()
    .find(entry => successStates.includes(entry.toState));
  
  if (lastSuccessEntry) {
    return await instance.rollback(lastSuccessEntry);
  }
  
  throw new Error('No successful state found to rollback to');
}
```

### Rollback with Validation

```javascript
async function safeRollback(instance, targetEntry, confirmCallback) {
  const history = instance.history();
  
  // Check if rollback is safe
  const stepsBack = history.getStepsBack(targetEntry);
  
  if (stepsBack > 10) {
    console.warn(`Large rollback detected: ${stepsBack} steps`);
    
    if (confirmCallback && !(await confirmCallback())) {
      return { success: false, error: 'Rollback cancelled by user' };
    }
  }
  
  // Check if target state is valid
  if (!history.canRollback(targetEntry)) {
    return { 
      success: false, 
      error: 'Target entry not found in current history' 
    };
  }
  
  return await instance.rollback(targetEntry);
}
```

## Advanced Features

### Custom Context Serialization

```javascript
const instance = machine.start(
  { secretKey: 'sensitive-data', orderId: 'ORD-001' },
  {
    history: {
      maxSize: 50,
      contextSerializer: (context) => {
        // Remove sensitive data from history
        const { secretKey, ...safeContext } = context;
        return safeContext;
      }
    }
  }
);
```

### Event Listeners for Rollbacks

```javascript
instance.subscribe(event => {
  if (event.rollback) {
    console.log('Rollback detected:', {
      from: event.from,
      to: event.to,
      targetEntry: event.targetEntry
    });
    
    // Perform cleanup or notifications
    handleRollbackCleanup(event);
  }
});
```

### Memory Management

```javascript
// Check memory usage
const usage = instance.getHistoryMemoryUsage();
console.log(`History using ${usage.totalSize} bytes across ${usage.entryCount} entries`);
console.log(`Average entry size: ${usage.averageSize} bytes`);
console.log(`Memory utilization: ${(usage.utilization * 100).toFixed(1)}%`);

// Configure history size dynamically
if (usage.utilization > 0.8) {
  instance.configureHistory({ maxSize: 20 }); // Reduce history size
}

// Clear history if needed (useful for testing)
instance.clearHistory();
```

## Error Handling

### Rollback Error Codes

```javascript
const result = await instance.rollback(someEntry);

if (!result.success) {
  switch (result.error.code) {
    case 'INVALID_ENTRY':
      console.error('Target entry is invalid or missing ID');
      break;
      
    case 'ENTRY_NOT_FOUND':
      console.error('Target entry not found in current history');
      break;
      
    case 'STATE_NOT_FOUND':
      console.error('Target state no longer exists in machine definition');
      break;
      
    case 'ROLLBACK_FAILED':
      console.error('Rollback operation failed:', result.error.details);
      break;
      
    default:
      console.error('Unknown rollback error:', result.error);
  }
}
```

### Common Patterns

```javascript
// Pattern 1: Retry with rollback on failure
async function processWithRetry(instance, maxRetries = 3) {
  let attempts = 0;
  let lastSuccessEntry = null;
  
  while (attempts < maxRetries) {
    try {
      // Save checkpoint before risky operation
      const checkpointHistory = instance.history();
      lastSuccessEntry = checkpointHistory.current;
      
      // Attempt risky operation
      await instance.send('process-payment');
      
      // Success - break out of retry loop
      break;
      
    } catch (error) {
      attempts++;
      console.warn(`Attempt ${attempts} failed:`, error);
      
      if (attempts < maxRetries && lastSuccessEntry) {
        // Rollback to last known good state
        await instance.rollback(lastSuccessEntry);
        console.log('Rolled back to retry');
      }
    }
  }
  
  if (attempts >= maxRetries) {
    throw new Error('Max retries exceeded');
  }
}

// Pattern 2: Audit trail
function createAuditTrail(instance) {
  const auditLog = [];
  
  instance.subscribe(event => {
    auditLog.push({
      timestamp: Date.now(),
      type: event.rollback ? 'rollback' : 'transition',
      from: event.from,
      to: event.to,
      trigger: event.type || 'rollback'
    });
  });
  
  return {
    getAuditLog: () => [...auditLog],
    exportHistory: () => ({
      audit: auditLog,
      currentState: instance.current,
      historySize: instance.history().size
    })
  };
}
```

## Performance Considerations

- **History Size**: Keep `maxSize` reasonable (default 30) to balance functionality with memory usage
- **Context Size**: Large contexts increase memory usage - consider custom serializers for optimization  
- **Compression**: Enable compression for applications with large context objects
- **Exclusions**: Use `excludeStates` to skip tracking temporary or frequent states
- **Memory Monitoring**: Regularly check memory usage in long-running applications

## Integration with Existing Code

The history system is backward compatible - existing state machines work without changes:

```javascript
// Existing code works as before
const instance = machine.start({ data: 'test' });
await instance.send('event');

// History is available but optional
const history = instance.history(); // Empty if not configured
const rollbackResult = await instance.rollback(someEntry); // Will fail gracefully
```

To enable history, simply add options to the `start()` method:

```javascript
// Enable history with minimal configuration
const instance = machine.start({ data: 'test' }, { history: {} });
```