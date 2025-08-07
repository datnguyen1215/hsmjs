import { createMachine, assign } from '../src/index.js';

describe('Async Operations', () => {
  describe('Async actions', () => {
    test('should handle async actions in entry', async () => {
      let result = null;

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'loading' }
          },
          loading: {
            entry: [async () => {
              await new Promise(resolve => setTimeout(resolve, 50));
              result = 'loaded';
              return result;
            }]
          }
        }
      });

      await machine.send('START');

      expect(result).toBe('loaded');
    });

    test('should handle async actions in exit', async () => {
      let result = null;

      const machine = createMachine({
        id: 'test',
        initial: 'active',
        states: {
          active: {
            exit: [async () => {
              await new Promise(resolve => setTimeout(resolve, 50));
              result = 'cleaned';
            }],
            on: { STOP: 'inactive' }
          },
          inactive: {}
        }
      });

      await machine.send('STOP');

      expect(result).toBe('cleaned');
    });

    test('should handle async actions in transitions', async () => {
      let result = null;

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              PROCESS: {
                target: 'done',
                actions: [async () => {
                  await new Promise(resolve => setTimeout(resolve, 50));
                  result = 'processed';
                }]
              }
            }
          },
          done: {}
        }
      });

      await machine.send('PROCESS');

      expect(result).toBe('processed');
      expect(machine.state).toBe('done');
    });

    test('should wait for async actions to complete before continuing', async () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'processing'
            }
          },
          processing: {
            entry: [async () => {
              order.push('entry-start');
              await new Promise(resolve => setTimeout(resolve, 100));
              order.push('entry-end');
            }],
            on: { COMPLETE: 'done' }
          },
          done: {
            entry: [() => order.push('done-entry')]
          }
        }
      });


      const promise1 = machine.send('START');
      const promise2 = machine.send('COMPLETE');

      await Promise.all([promise1, promise2]);

      expect(order).toEqual(['entry-start', 'entry-end', 'done-entry']);
      expect(machine.state).toBe('done');
    });
  });

  describe('Multiple async actions', () => {
    test('should execute multiple async actions sequentially', async () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              RUN: {
                target: 'idle',
                actions: [
                  async () => {
                    await new Promise(r => setTimeout(r, 60));
                    order.push('action1');
                  },
                  async () => {
                    await new Promise(r => setTimeout(r, 30));
                    order.push('action2');
                  },
                  async () => {
                    await new Promise(r => setTimeout(r, 10));
                    order.push('action3');
                  }
                ]
              }
            }
          }
        }
      });

      await machine.send('RUN');

      expect(order).toEqual(['action1', 'action2', 'action3']);
    });

    test('should handle mixed sync and async actions', async () => {
      const order = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              MIX: {
                target: 'idle',
                actions: [
                  () => order.push('sync1'),
                  async () => {
                    await new Promise(r => setTimeout(r, 30));
                    order.push('async1');
                  },
                  () => order.push('sync2'),
                  async () => {
                    await new Promise(r => setTimeout(r, 10));
                    order.push('async2');
                  },
                  () => order.push('sync3')
                ]
              }
            }
          }
        }
      });

      await machine.send('MIX');

      expect(order).toEqual(['sync1', 'async1', 'sync2', 'async2', 'sync3']);
    });
  });

  describe('Async context updates', () => {
    test('should handle async context updates with assign', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { data: null },
        states: {
          idle: {
            on: {
              FETCH: {
                target: 'idle',
                actions: [assign(async () => {
                  const data = await new Promise(resolve => {
                    setTimeout(() => resolve('fetched-data'), 50);
                  });
                  return { data };
                })]
              }
            }
          }
        }
      });

      await machine.send('FETCH');

      expect(machine.context.data).toBe('fetched-data');
    });

    test('should handle sequential async context updates', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { step: 0, data: [] },
        states: {
          idle: {
            on: {
              PROCESS: {
                target: 'idle',
                actions: [
                  assign(async (context) => {
                    await new Promise(r => setTimeout(r, 20));
                    return {
                      step: context.step + 1,
                      data: [...context.data, 'step1']
                    };
                  }),
                  assign(async (context) => {
                    await new Promise(r => setTimeout(r, 20));
                    return {
                      step: context.step + 1,
                      data: [...context.data, 'step2']
                    };
                  }),
                  assign(async (context) => {
                    await new Promise(r => setTimeout(r, 20));
                    return {
                      step: context.step + 1,
                      data: [...context.data, 'step3']
                    };
                  })
                ]
              }
            }
          }
        }
      });

      await machine.send('PROCESS');

      expect(machine.context.step).toBe(3);
      expect(machine.context.data).toEqual(['step1', 'step2', 'step3']);
    });
  });

  describe('Async action return values', () => {
    test('should capture async action return values', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ASYNC: {
                target: 'idle',
                actions: [
                  async () => {
                    await new Promise(r => setTimeout(r, 30));
                    return 'async-result-1';
                  },
                  async () => {
                    await new Promise(r => setTimeout(r, 20));
                    return { data: 'async-result-2' };
                  }
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('ASYNC');

      expect(result.results[0].value).toBe('async-result-1');
      expect(result.results[1].value).toEqual({ data: 'async-result-2' });
    });

    test('should handle async actions with Promise.resolve', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              PROMISE: {
                target: 'idle',
                actions: [
                  () => Promise.resolve('immediate-promise'),
                  async () => Promise.resolve('async-promise')
                ]
              }
            }
          }
        }
      });

      const result = await machine.send('PROMISE');

      expect(result.results[0].value).toBe('immediate-promise');
      expect(result.results[1].value).toBe('async-promise');
    });
  });

  describe('Error handling in async actions', () => {
    test('should handle async action errors', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ERROR: {
                target: 'idle',
                actions: [async () => {
                  await new Promise(r => setTimeout(r, 30));
                  throw new Error('Async error');
                }]
              }
            }
          }
        }
      });


      await expect(machine.send('ERROR')).rejects.toThrow('Async error');
    });

    test('should stop processing actions after async error', async () => {
      const subsequentAction = jest.fn();

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              ERROR: {
                target: 'idle',
                actions: [
                  async () => {
                    await new Promise(r => setTimeout(r, 30));
                    throw new Error('First action error');
                  },
                  subsequentAction
                ]
              }
            }
          }
        }
      });


      try {
        await machine.send('ERROR');
      } catch (error) {
        expect(error.message).toBe('First action error');
      }

      expect(subsequentAction).not.toHaveBeenCalled();
    });

    test('should handle Promise rejection', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              REJECT: {
                target: 'idle',
                actions: [
                  () => Promise.reject(new Error('Promise rejected'))
                ]
              }
            }
          }
        }
      });


      await expect(machine.send('REJECT')).rejects.toThrow('Promise rejected');
    });
  });

  describe('Async event queuing', () => {
    test('should queue events during async processing', async () => {
      let processingCount = 0;
      const results = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              PROCESS: {
                target: 'idle',
                actions: [async (context, event) => {
                  processingCount++;
                  await new Promise(resolve => setTimeout(resolve, 100));
                  results.push(event.id);
                  processingCount--;
                }]
              }
            }
          }
        }
      });


      // Send multiple events rapidly
      const promises = [
        machine.send('PROCESS', { id: 1 }),
        machine.send('PROCESS', { id: 2 }),
        machine.send('PROCESS', { id: 3 })
      ];

      // Check that only one is processing at a time
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(processingCount).toBeLessThanOrEqual(1);

      await Promise.all(promises);

      expect(results).toEqual([1, 2, 3]); // Processed in order
      expect(processingCount).toBe(0);
    });

    test('should maintain event order in queue', async () => {
      const processedOrder = [];

      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {
            on: {
              FAST: {
                target: 'idle',
                actions: [async (context, event) => {
                  await new Promise(r => setTimeout(r, 10));
                  processedOrder.push(`fast-${event.id}`);
                }]
              },
              SLOW: {
                target: 'idle',
                actions: [async (context, event) => {
                  await new Promise(r => setTimeout(r, 80));
                  processedOrder.push(`slow-${event.id}`);
                }]
              }
            }
          }
        }
      });


      // Send events in specific order
      const promises = [
        machine.send('SLOW', { id: 1 }),
        machine.send('FAST', { id: 2 }),
        machine.send('FAST', { id: 3 }),
        machine.send('SLOW', { id: 4 })
      ];

      await Promise.all(promises);

      // Should process in the order sent, not completion time
      expect(processedOrder).toEqual([
        'slow-1', 'fast-2', 'fast-3', 'slow-4'
      ]);
    });
  });

  describe('Complex async scenarios', () => {
    test('should handle async actions across state transitions', async () => {
      const results = [];

      const machine = createMachine({
        id: 'test',
        initial: 'step1',
        states: {
          step1: {
            exit: [async () => {
              await new Promise(r => setTimeout(r, 30));
              results.push('exit-step1');
            }],
            on: { NEXT: 'step2' }
          },
          step2: {
            entry: [async () => {
              await new Promise(r => setTimeout(r, 30));
              results.push('entry-step2');
            }],
            on: { NEXT: 'step3' }
          },
          step3: {
            entry: [async () => {
              await new Promise(r => setTimeout(r, 30));
              results.push('entry-step3');
            }]
          }
        }
      });


      await machine.send('NEXT');
      await machine.send('NEXT');

      expect(results).toEqual(['exit-step1', 'entry-step2', 'entry-step3']);
      expect(machine.state).toBe('step3');
    });

    test('should handle nested async operations', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { results: [] },
        states: {
          idle: {
            on: {
              NESTED: {
                target: 'idle',
                actions: [assign(async (context) => {
                  const result1 = await new Promise(resolve => {
                    setTimeout(() => resolve('level1'), 50);
                  });

                  const result2 = await new Promise(resolve => {
                    setTimeout(() => resolve(`level2-${result1}`), 30);
                  });

                  return {
                    results: [...context.results, result2]
                  };
                })]
              }
            }
          }
        }
      });

      await machine.send('NESTED');

      expect(machine.context.results).toEqual(['level2-level1']);
    });

    test('should handle async actions with timeouts', async () => {
      const machine = createMachine({
        id: 'test',
        initial: 'idle',
        context: { completed: false },
        states: {
          idle: {
            on: {
              TIMEOUT_TEST: {
                target: 'idle',
                actions: [
                  assign(async () => {
                    await new Promise((resolve, reject) => {
                      const timer = setTimeout(() => {
                        resolve('completed');
                      }, 100);

                      // Simulate timeout
                      setTimeout(() => {
                        clearTimeout(timer);
                        reject(new Error('Timeout'));
                      }, 200);
                    });

                    return { completed: true };
                  })
                ]
              }
            }
          }
        }
      });

      await machine.send('TIMEOUT_TEST');

      expect(machine.context.completed).toBe(true);
    }, 300); // Increase Jest timeout for this test
  });
});