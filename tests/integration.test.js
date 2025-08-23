import { createMachine, assign } from '../src/index.js';

describe('Integration Tests', () => {
  describe('Real-world scenarios', () => {
    test('should handle complete user authentication flow', async () => {
      const machine = createMachine({
        id: 'auth',
        initial: 'idle',
        context: {
          user: null,
          token: null,
          attempts: 0,
          maxAttempts: 3
        },
        states: {
          idle: {
            on: {
              LOGIN: 'authenticating'
            }
          },
          authenticating: {
            entry: [assign(({ context }) => ({ attempts: context.attempts + 1 }))],
            on: {
              SUCCESS: {
                target: 'authenticated',
                actions: [assign(({ context, event }) => ({
                  user: event.user,
                  token: event.token,
                  attempts: 0
                }))]
              },
              FAILURE: [
                {
                  target: 'locked',
                  cond: ({ context }) => context.attempts >= context.maxAttempts
                },
                {
                  target: 'idle'
                }
              ]
            }
          },
          authenticated: {
            on: {
              LOGOUT: {
                target: 'idle',
                actions: [assign({
                  user: null,
                  token: null
                })]
              },
              REFRESH_TOKEN: {
                target: 'refreshing'
              }
            }
          },
          refreshing: {
            on: {
              SUCCESS: {
                target: 'authenticated',
                actions: [assign(({ context, event }) => ({
                  token: event.token
                }))]
              },
              FAILURE: {
                target: 'idle',
                actions: [assign({
                  user: null,
                  token: null
                })]
              }
            }
          },
          locked: {
            on: {
              UNLOCK: 'idle'
            }
          }
        }
      });

      expect(machine.state).toBe('idle');

      // First login attempt - fail
      machine.send('LOGIN');
      expect(machine.state).toBe('authenticating');
      expect(machine.context.attempts).toBe(1);

      machine.send('FAILURE');
      expect(machine.state).toBe('idle');
      expect(machine.context.attempts).toBe(1);

      // Second attempt - fail
      machine.send('LOGIN');
      expect(machine.context.attempts).toBe(2);
      machine.send('FAILURE');

      // Third attempt - fail (should lock)
      machine.send('LOGIN');
      expect(machine.context.attempts).toBe(3);
      machine.send('FAILURE');
      expect(machine.state).toBe('locked');

      // Unlock and successful login
      machine.send('UNLOCK');
      expect(machine.state).toBe('idle');

      machine.send('LOGIN');
      machine.send('SUCCESS', { user: 'john', token: 'abc123' });
      expect(machine.state).toBe('authenticated');
      expect(machine.context.user).toBe('john');
      expect(machine.context.token).toBe('abc123');
      expect(machine.context.attempts).toBe(0);

      // Token refresh
      machine.send('REFRESH_TOKEN');
      expect(machine.state).toBe('refreshing');

      machine.send('SUCCESS', { token: 'new-token' });
      expect(machine.state).toBe('authenticated');
      expect(machine.context.token).toBe('new-token');

      // Logout
      machine.send('LOGOUT');
      expect(machine.state).toBe('idle');
      expect(machine.context.user).toBeNull();
      expect(machine.context.token).toBeNull();
    });

    test('should handle complex e-commerce shopping cart flow', async () => {
      const machine = createMachine({
        id: 'cart',
        initial: 'empty',
        context: {
          items: [],
          total: 0,
          coupon: null,
          discount: 0,
          user: null
        },
        states: {
          empty: {
            on: {
              ADD_ITEM: {
                target: 'hasItems',
                actions: [assign(({ context, event }) => ({
                  items: [...context.items, event.item],
                  total: context.total + event.item.price
                }))]
              }
            }
          },
          hasItems: {
            on: {
              ADD_ITEM: {
                target: 'hasItems',
                actions: [assign(({ context, event }) => ({
                  items: [...context.items, event.item],
                  total: context.total + event.item.price
                }))]
              },
              REMOVE_ITEM: [
                {
                  target: 'empty',
                  cond: ({ context, event }) => {
                    const remainingItems = context.items.filter(item => item.id !== event.itemId);
                    return remainingItems.length === 0;
                  },
                  actions: [assign({
                    items: [],
                    total: 0,
                    coupon: null,
                    discount: 0
                  })]
                },
                {
                  target: 'hasItems',
                  actions: [assign(({ context, event }) => {
                    const itemToRemove = context.items.find(item => item.id === event.itemId);
                    const remainingItems = context.items.filter(item => item.id !== event.itemId);
                    return {
                      items: remainingItems,
                      total: context.total - (itemToRemove?.price || 0)
                    };
                  })]
                }
              ],
              APPLY_COUPON: {
                target: 'hasItems',
                cond: ({ context, event }) => event.coupon && event.coupon.valid,
                actions: [assign(({ context, event }) => {
                  const discountAmount = (context.total * event.coupon.discount) / 100;
                  return {
                    coupon: event.coupon,
                    discount: discountAmount
                  };
                })]
              },
              CHECKOUT: 'checkout'
            }
          },
          checkout: {
            initial: 'selectingPayment',
            states: {
              selectingPayment: {
                on: {
                  SELECT_PAYMENT: 'processingPayment'
                }
              },
              processingPayment: {
                on: {
                  PAYMENT_SUCCESS: 'success',
                  PAYMENT_FAILURE: 'failure'
                }
              },
              success: {
                entry: [assign({
                  items: [],
                  total: 0,
                  coupon: null,
                  discount: 0
                })],
                on: {
                  CONTINUE_SHOPPING: '#cart.empty'
                }
              },
              failure: {
                on: {
                  RETRY: 'selectingPayment',
                  CANCEL: '#cart.hasItems'
                }
              }
            }
          }
        }
      });

      expect(machine.state).toBe('empty');

      // Add items
      machine.send('ADD_ITEM', { item: { id: 1, name: 'Product 1', price: 10 } });
      expect(machine.state).toBe('hasItems');
      expect(machine.context.items).toHaveLength(1);
      expect(machine.context.total).toBe(10);

      machine.send('ADD_ITEM', { item: { id: 2, name: 'Product 2', price: 20 } });
      expect(machine.context.items).toHaveLength(2);
      expect(machine.context.total).toBe(30);

      // Apply coupon
      machine.send('APPLY_COUPON', { coupon: { valid: true, discount: 10 } });
      expect(machine.context.coupon.discount).toBe(10);
      expect(machine.context.discount).toBe(3);

      // Checkout
      machine.send('CHECKOUT');
      expect(machine.state).toBe('checkout.selectingPayment');

      machine.send('SELECT_PAYMENT');
      expect(machine.state).toBe('checkout.processingPayment');

      // Payment failure
      machine.send('PAYMENT_FAILURE');
      expect(machine.state).toBe('checkout.failure');

      machine.send('RETRY');
      expect(machine.state).toBe('checkout.selectingPayment');

      // Successful payment
      machine.send('SELECT_PAYMENT');
      machine.send('PAYMENT_SUCCESS');
      expect(machine.state).toBe('checkout.success');
      expect(machine.context.items).toHaveLength(0);
      expect(machine.context.total).toBe(0);

      machine.send('CONTINUE_SHOPPING');
      expect(machine.state).toBe('empty');
    });

    test('should handle file upload with progress tracking', async () => {
      const machine = createMachine({
        id: 'fileUpload',
        initial: 'idle',
        context: {
          files: [],
          currentUpload: null,
          progress: 0,
          errors: []
        },
        states: {
          idle: {
            on: {
              SELECT_FILES: {
                target: 'filesSelected',
                actions: [assign(({ context, event }) => ({
                  files: event.files,
                  errors: []
                }))]
              }
            }
          },
          filesSelected: {
            on: {
              START_UPLOAD: 'uploading',
              ADD_FILES: {
                target: 'filesSelected',
                actions: [assign(({ context, event }) => ({
                  files: [...context.files, ...event.files]
                }))]
              },
              REMOVE_FILE: {
                target: 'filesSelected',
                actions: [assign(({ context, event }) => ({
                  files: context.files.filter(file => file.id !== event.fileId)
                }))]
              }
            }
          },
          uploading: {
            initial: 'inProgress',
            entry: [assign(({ context }) => ({
              currentUpload: context.files[0] || null,
              progress: 0
            }))],
            states: {
              inProgress: {
                on: {
                  PROGRESS: {
                    target: 'inProgress',
                    actions: [assign(({ context, event }) => ({
                      progress: event.progress
                    }))]
                  },
                  FILE_COMPLETE: [
                    {
                      target: 'allComplete',
                      cond: ({ context, event }) => {
                        const remainingFiles = context.files.filter(f => f.id !== event.fileId);
                        return remainingFiles.length === 0;
                      },
                      actions: [assign(({ context, event }) => ({
                        files: context.files.filter(f => f.id !== event.fileId),
                        currentUpload: null,
                        progress: 100
                      }))]
                    },
                    {
                      target: 'inProgress',
                      actions: [assign(({ context, event }) => {
                        const remainingFiles = context.files.filter(f => f.id !== event.fileId);
                        return {
                          files: remainingFiles,
                          currentUpload: remainingFiles[0] || null,
                          progress: 0
                        };
                      })]
                    }
                  ],
                  ERROR: {
                    target: 'error',
                    actions: [assign(({ context, event }) => ({
                      errors: [...context.errors, event.error]
                    }))]
                  },
                  CANCEL: 'cancelled'
                }
              },
              error: {
                on: {
                  RETRY: 'inProgress',
                  SKIP: [
                    {
                      target: 'allComplete',
                      cond: ({ context }) => context.files.length <= 1
                    },
                    {
                      target: 'inProgress',
                      actions: [assign(({ context }) => {
                        const remainingFiles = context.files.slice(1);
                        return {
                          files: remainingFiles,
                          currentUpload: remainingFiles[0] || null,
                          progress: 0
                        };
                      })]
                    }
                  ]
                }
              },
              cancelled: {
                on: {
                  RESUME: 'inProgress'
                }
              },
              allComplete: {
                entry: [assign({
                  files: [],
                  currentUpload: null,
                  progress: 0
                })],
                on: {
                  RESET: '#fileUpload.idle'
                }
              }
            }
          }
        }
      });

      expect(machine.state).toBe('idle');

      // Select files
      const files = [
        { id: 1, name: 'file1.jpg', size: 1000 },
        { id: 2, name: 'file2.png', size: 2000 }
      ];
      machine.send('SELECT_FILES', { files });
      expect(machine.state).toBe('filesSelected');
      expect(machine.context.files).toHaveLength(2);

      // Start upload
      machine.send('START_UPLOAD');
      expect(machine.state).toBe('uploading.inProgress');
      expect(machine.context.currentUpload).toEqual(files[0]);

      // Progress updates
      machine.send('PROGRESS', { progress: 25 });
      expect(machine.context.progress).toBe(25);

      machine.send('PROGRESS', { progress: 50 });
      expect(machine.context.progress).toBe(50);

      // First file complete
      machine.send('FILE_COMPLETE', { fileId: 1 });
      expect(machine.state).toBe('uploading.inProgress');
      expect(machine.context.currentUpload).toEqual(files[1]);
      expect(machine.context.files).toHaveLength(1);

      // Second file error
      machine.send('ERROR', { error: 'Network error' });
      expect(machine.state).toBe('uploading.error');
      expect(machine.context.errors).toHaveLength(1);

      // Skip error and complete
      machine.send('SKIP');
      expect(machine.state).toBe('uploading.allComplete');
      expect(machine.context.files).toHaveLength(0);

      machine.send('RESET');
      expect(machine.state).toBe('idle');
    });
  });

  describe('Complex state machine interactions', () => {
    test('should handle parallel workflows', async () => {
      // Simulate a document editor with multiple independent features
      const machine = createMachine({
        id: 'editor',
        initial: 'ready',
        context: {
          document: '',
          saved: true,
          spellCheckEnabled: false,
          autoSaveInterval: null,
          wordCount: 0
        },
        states: {
          ready: {
            initial: 'editing',
            states: {
              editing: {
                on: {
                  TYPE: {
                    target: 'editing',
                    actions: [assign(({ context, event }) => ({
                      document: context.document + event.text,
                      saved: false,
                      wordCount: (context.document + event.text).split(' ').filter(w => w).length
                    }))]
                  },
                  SAVE: {
                    target: 'saving'
                  }
                }
              },
              saving: {
                on: {
                  SAVE_SUCCESS: {
                    target: 'editing',
                    actions: [assign({ saved: true })]
                  },
                  SAVE_ERROR: {
                    target: 'editing'
                  }
                }
              }
            },
            on: {
              TOGGLE_SPELLCHECK: {
                actions: [assign(({ context }) => ({
                  spellCheckEnabled: !context.spellCheckEnabled
                }))]
              },
              START_AUTOSAVE: {
                actions: [assign({ autoSaveInterval: 30000 })]
              },
              STOP_AUTOSAVE: {
                actions: [assign({ autoSaveInterval: null })]
              },
              DELETE_ALL: {
                target: 'ready',
                actions: [assign({
                  document: '',
                  saved: true,
                  wordCount: 0
                })]
              }
            }
          }
        }
      });

      expect(machine.state).toBe('ready.editing');

      // Type some text
      machine.send('TYPE', { text: 'Hello world' });
      expect(machine.context.document).toBe('Hello world');
      expect(machine.context.saved).toBe(false);
      expect(machine.context.wordCount).toBe(2);

      // Toggle spellcheck while editing
      machine.send('TOGGLE_SPELLCHECK');
      expect(machine.context.spellCheckEnabled).toBe(true);
      expect(machine.state).toBe('ready.editing'); // Should stay in editing

      // Start autosave
      machine.send('START_AUTOSAVE');
      expect(machine.context.autoSaveInterval).toBe(30000);

      // Save document
      machine.send('SAVE');
      expect(machine.state).toBe('ready.saving');

      machine.send('SAVE_SUCCESS');
      expect(machine.state).toBe('ready.editing');
      expect(machine.context.saved).toBe(true);

      // Continue typing
      machine.send('TYPE', { text: ' and more text' });
      expect(machine.context.document).toBe('Hello world and more text');
      expect(machine.context.wordCount).toBe(5);

      // Delete all
      machine.send('DELETE_ALL');
      expect(machine.context.document).toBe('');
      expect(machine.context.wordCount).toBe(0);
      expect(machine.context.saved).toBe(true);
    });

    test('should handle deeply nested hierarchical states', () => {
      const machine = createMachine({
        id: 'app',
        initial: 'loading',
        context: { user: null, data: null },
        states: {
          loading: {
            on: {
              LOADED: 'authenticated'
            }
          },
          authenticated: {
            initial: 'dashboard',
            entry: [assign(({ context, event }) => ({ user: event.user }))],
            states: {
              dashboard: {
                initial: 'overview',
                states: {
                  overview: {
                    on: { VIEW_DETAILS: 'details' }
                  },
                  details: {
                    initial: 'info',
                    states: {
                      info: {
                        on: { VIEW_ANALYTICS: 'analytics' }
                      },
                      analytics: {
                        initial: 'charts',
                        states: {
                          charts: {
                            on: { VIEW_TABLES: 'tables' }
                          },
                          tables: {
                            on: { EXPORT: 'exporting' }
                          },
                          exporting: {
                            on: {
                              EXPORT_COMPLETE: 'charts',
                              EXPORT_ERROR: 'charts'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              settings: {
                on: { BACK_TO_DASHBOARD: 'dashboard' }
              }
            },
            on: {
              GO_TO_SETTINGS: '.settings',
              LOGOUT: 'loading'
            }
          }
        }
      });

      expect(machine.state).toBe('loading');

      machine.send('LOADED', { user: 'john' });
      expect(machine.state).toBe('authenticated.dashboard.overview');
      expect(machine.context.user).toBe('john');

      machine.send('VIEW_DETAILS');
      expect(machine.state).toBe('authenticated.dashboard.details.info');

      machine.send('VIEW_ANALYTICS');
      expect(machine.state).toBe('authenticated.dashboard.details.analytics.charts');

      machine.send('VIEW_TABLES');
      expect(machine.state).toBe('authenticated.dashboard.details.analytics.tables');

      machine.send('EXPORT');
      expect(machine.state).toBe('authenticated.dashboard.details.analytics.exporting');

      machine.send('EXPORT_COMPLETE');
      expect(machine.state).toBe('authenticated.dashboard.details.analytics.charts');

      // Navigate to settings from deep nesting
      machine.send('GO_TO_SETTINGS');
      expect(machine.state).toBe('authenticated.settings');

      machine.send('BACK_TO_DASHBOARD');
      expect(machine.state).toBe('authenticated.dashboard.overview'); // Should go to initial

      // Logout
      machine.send('LOGOUT');
      expect(machine.state).toBe('loading');
    });
  });

  describe('Error recovery integration', () => {
    test('should maintain machine integrity after various errors', async () => {
      const machine = createMachine({
        id: 'resilient',
        initial: 'stable',
        context: { errorCount: 0, data: [] },
        states: {
          stable: {
            on: {
              TRIGGER_ACTION_ERROR: {
                target: 'stable',
                actions: [
                  () => { throw new Error('Action error'); }
                ]
              },
              TRIGGER_GUARD_ERROR: {
                target: 'error',
                cond: () => { throw new Error('Guard error'); }
              },
              ADD_DATA: {
                target: 'stable',
                actions: [assign(({ context, event }) => ({
                  data: [...context.data, event.item]
                }))]
              },
              NORMAL_TRANSITION: 'working'
            }
          },
          working: {
            on: {
              BACK: 'stable',
              ASYNC_ERROR: {
                target: 'working',
                actions: [async () => {
                  await new Promise(r => setTimeout(r, 10));
                  throw new Error('Async error');
                }]
              }
            }
          },
          error: {}
        }
      });

      expect(machine.state).toBe('stable');

      // Test action error
      try {
        await machine.send('TRIGGER_ACTION_ERROR');
      } catch (error) {
        expect(error.message).toBe('Action error');
      }
      expect(machine.state).toBe('stable'); // Should remain stable

      // Test guard error
      machine.send('TRIGGER_GUARD_ERROR');
      expect(machine.state).toBe('stable'); // Should stay in stable due to guard failure

      // Test normal operation still works
      machine.send('ADD_DATA', { item: 'test' });
      expect(machine.context.data).toEqual(['test']);

      machine.send('NORMAL_TRANSITION');
      expect(machine.state).toBe('working');

      // Test async error
      try {
        await machine.send('ASYNC_ERROR');
      } catch (error) {
        expect(error.message).toBe('Async error');
      }
      expect(machine.state).toBe('working'); // Should remain in working

      // Test normal operation still works after errors
      machine.send('BACK');
      expect(machine.state).toBe('stable');

      machine.send('ADD_DATA', { item: 'test2' });
      expect(machine.context.data).toEqual(['test', 'test2']);
    });
  });
});