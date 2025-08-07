import { describe, test, expect } from '@jest/globals';
import { createMachine, QueueClearedError } from '../src/index.js';

describe('Queue Clearing', () => {
  test('clearQueue() rejects pending promises with QueueClearedError', async () => {
    const machine = createMachine({
      id: 'queueTest',
      initial: 'idle',
      states: {
        idle: {
          on: {
            SLOW: 'processing',
            FAST: 'done'
          }
        },
        processing: {
          entry: [async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          }],
          on: {
            DONE: 'done'
          }
        },
        done: {}
      }
    });


    // Start a slow transition
    const promise1 = machine.send('SLOW');

    // Queue multiple events and catch rejections immediately
    const promise2 = machine.send('DONE').catch(e => e);
    const promise3 = machine.send('FAST').catch(e => e);

    // Wait a tick to ensure events are queued
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear the queue
    const clearedCount = machine.clearQueue();
    expect(clearedCount).toBe(2); // Two events were queued

    // The first event should complete normally
    const result1 = await promise1;
    expect(result1.state).toBe('processing');

    // The queued events should be rejected with QueueClearedError
    const error2 = await promise2;
    expect(error2.name).toBe('QueueClearedError');

    const error3 = await promise3;
    expect(error3.name).toBe('QueueClearedError');
  });

  test('sendPriority() clears queue and processes immediately', async () => {
    const machine = createMachine({
      id: 'priorityTest',
      initial: 'idle',
      context: { value: 0 },
      states: {
        idle: {
          on: {
            SLOW: 'processing',
            PRIORITY: 'priority'
          }
        },
        processing: {
          entry: [async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          }],
          on: {
            NORMAL: 'done',
            PRIORITY: 'priority'
          }
        },
        priority: {},
        done: {}
      }
    });


    // Start a slow transition
    const promise1 = machine.send('SLOW');

    // Queue normal events and catch rejections immediately
    const promise2 = machine.send('NORMAL').catch(e => e);
    const promise3 = machine.send('NORMAL').catch(e => e);

    // Send priority event
    const priorityPromise = machine.sendPriority('PRIORITY');

    // First event completes
    const result1 = await promise1;
    expect(result1.state).toBe('processing');

    // Queued events are rejected with QueueClearedError
    const error2 = await promise2;
    expect(error2.name).toBe('QueueClearedError');

    const error3 = await promise3;
    expect(error3.name).toBe('QueueClearedError');

    // Priority event succeeds
    const priorityResult = await priorityPromise;
    expect(priorityResult.state).toBe('priority');
  });

  test('current transition completes when queue is cleared', async () => {
    const results = [];

    const machine = createMachine({
      id: 'clearTest',
      initial: 'idle',
      states: {
        idle: {
          on: {
            START: 'processing'
          }
        },
        processing: {
          entry: [async () => {
            results.push('processing-start');
            await new Promise(resolve => setTimeout(resolve, 50));
            results.push('processing-end');
          }],
          on: {
            NEXT: 'done'
          }
        },
        done: {}
      }
    });


    // Start processing
    const promise1 = machine.send('START');

    // Queue events and catch rejections immediately
    const promise2 = machine.send('NEXT').catch(e => e);

    // Clear queue while first is still processing
    await new Promise(resolve => setTimeout(resolve, 10));
    const clearedCount = machine.clearQueue();

    // First transition should complete normally
    const result1 = await promise1;
    expect(result1.state).toBe('processing');
    expect(results).toEqual(['processing-start', 'processing-end']);

    // Queued event should be rejected with QueueClearedError
    const error2 = await promise2;
    expect(error2.name).toBe('QueueClearedError');
  });

  test('clearQueue() returns 0 when no events are queued', () => {
    const machine = createMachine({
      id: 'emptyQueue',
      initial: 'idle',
      states: {
        idle: {}
      }
    });

    const clearedCount = machine.clearQueue();
    expect(clearedCount).toBe(0);
  });

  test('QueueClearedError has correct name and message', async () => {
    const machine = createMachine({
      id: 'errorTest',
      initial: 'idle',
      states: {
        idle: {
          on: {
            SLOW: 'processing'
          }
        },
        processing: {
          entry: [async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
          }]
        }
      }
    });


    // Start slow transition
    const promise1 = machine.send('SLOW');

    // Queue event
    const promise2 = machine.send('SLOW');

    // Clear queue
    machine.clearQueue();

    try {
      await promise2;
    } catch (error) {
      expect(error.name).toBe('QueueClearedError');
      expect(error.message).toBe('Event was cancelled due to queue being cleared');
    }

    await promise1; // Let first complete
  });
});