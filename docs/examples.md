# Examples & Patterns

Real-world examples and common patterns for HSMJS state machines.

## Table of Contents

- [Basic Examples](#basic-examples)
- [UI Patterns](#ui-patterns)
- [Data Fetching](#data-fetching)
- [Form Management](#form-management)
- [Game Logic](#game-logic)
- [Background Processes](#background-processes)
- [Testing Patterns](#testing-patterns)

## Basic Examples

### Traffic Light System

```javascript
import { createMachine, assign } from '@datnguyen1215/hsmjs';

const trafficLightMachine = createMachine({
  id: 'trafficLight',
  initial: 'red',
  context: {
    timer: null,
    redDuration: 3000,
    yellowDuration: 1000,
    greenDuration: 2000
  },
  states: {
    red: {
      entry: [
        () => console.log('🔴 STOP'),
        (ctx) => {
          ctx.timer = setTimeout(() => machine.send('TIMER'), ctx.redDuration);
        }
      ],
      exit: [(ctx) => clearTimeout(ctx.timer)],
      on: { TIMER: 'green' }
    },
    green: {
      entry: [
        () => console.log('🟢 GO'),
        (ctx) => {
          ctx.timer = setTimeout(() => machine.send('TIMER'), ctx.greenDuration);
        }
      ],
      exit: [(ctx) => clearTimeout(ctx.timer)],
      on: { TIMER: 'yellow' }
    },
    yellow: {
      entry: [
        () => console.log('🟡 CAUTION'),
        (ctx) => {
          ctx.timer = setTimeout(() => machine.send('TIMER'), ctx.yellowDuration);
        }
      ],
      exit: [(ctx) => clearTimeout(ctx.timer)],
      on: { TIMER: 'red' }
    }
  }
});

// Start the traffic light
const result = await trafficLightMachine.send('TIMER');
```

### Simple Calculator

```javascript
const calculatorMachine = createMachine({
  id: 'calculator',
  initial: 'idle',
  context: {
    display: '0',
    operand1: null,
    operand2: null,
    operator: null
  },
  states: {
    idle: {
      entry: [assign({ display: '0', operand1: null, operand2: null, operator: null })],
      on: {
        NUMBER: {
          target: 'operand1',
          actions: [assign({
            display: (ctx, event) => event.value,
            operand1: (ctx, event) => parseFloat(event.value)
          })]
        }
      }
    },
    operand1: {
      on: {
        NUMBER: {
          actions: [assign({
            display: (ctx, event) => ctx.display + event.value,
            operand1: (ctx, event) => parseFloat(ctx.display + event.value)
          })]
        },
        OPERATOR: {
          target: 'operator',
          actions: [assign({
            operator: (ctx, event) => event.value,
            display: (ctx, event) => event.value
          })]
        },
        CLEAR: 'idle'
      }
    },
    operator: {
      on: {
        NUMBER: {
          target: 'operand2',
          actions: [assign({
            display: (ctx, event) => event.value,
            operand2: (ctx, event) => parseFloat(event.value)
          })]
        },
        CLEAR: 'idle'
      }
    },
    operand2: {
      on: {
        NUMBER: {
          actions: [assign({
            display: (ctx, event) => ctx.display + event.value,
            operand2: (ctx, event) => parseFloat(ctx.display + event.value)
          })]
        },
        EQUALS: {
          target: 'result',
          actions: [assign({
            display: (ctx) => {
              let result;
              switch (ctx.operator) {
                case '+': result = ctx.operand1 + ctx.operand2; break;
                case '-': result = ctx.operand1 - ctx.operand2; break;
                case '*': result = ctx.operand1 * ctx.operand2; break;
                case '/': result = ctx.operand1 / ctx.operand2; break;
                default: result = ctx.operand2;
              }
              return result.toString();
            }
          })]
        },
        OPERATOR: {
          target: 'operator',
          actions: [assign({
            operand1: (ctx) => {
              let result;
              switch (ctx.operator) {
                case '+': result = ctx.operand1 + ctx.operand2; break;
                case '-': result = ctx.operand1 - ctx.operand2; break;
                case '*': result = ctx.operand1 * ctx.operand2; break;
                case '/': result = ctx.operand1 / ctx.operand2; break;
                default: result = ctx.operand2;
              }
              return result;
            },
            operator: (ctx, event) => event.value,
            operand2: null,
            display: (ctx, event) => event.value
          })]
        },
        CLEAR: 'idle'
      }
    },
    result: {
      on: {
        NUMBER: {
          target: 'operand1',
          actions: [assign({
            display: (ctx, event) => event.value,
            operand1: (ctx, event) => parseFloat(event.value),
            operand2: null,
            operator: null
          })]
        },
        OPERATOR: {
          target: 'operator',
          actions: [assign({
            operand1: (ctx) => parseFloat(ctx.display),
            operator: (ctx, event) => event.value,
            operand2: null,
            display: (ctx, event) => event.value
          })]
        },
        CLEAR: 'idle'
      }
    }
  }
});

// Usage
await calculatorMachine.send('NUMBER', { value: '5' });
await calculatorMachine.send('OPERATOR', { value: '+' });
await calculatorMachine.send('NUMBER', { value: '3' });
await calculatorMachine.send('EQUALS');
console.log(calculatorMachine.context.display); // '8'
```

## UI Patterns

### Modal Dialog State

```javascript
const modalMachine = createMachine({
  id: 'modal',
  initial: 'closed',
  context: {
    data: null,
    returnFocus: null
  },
  states: {
    closed: {
      on: {
        OPEN: {
          target: 'opening',
          actions: [assign({
            data: (ctx, event) => event.data,
            returnFocus: () => document.activeElement
          })]
        }
      }
    },
    opening: {
      entry: [
        () => {
          // Disable body scroll
          document.body.style.overflow = 'hidden';
          // Focus trap setup would go here
        }
      ],
      on: {
        OPENED: 'open',
        CLOSE: 'closing'
      }
    },
    open: {
      on: {
        CLOSE: 'closing',
        ESCAPE: 'closing',
        BACKDROP_CLICK: 'closing'
      }
    },
    closing: {
      entry: [
        () => {
          // Re-enable body scroll
          document.body.style.overflow = '';
        }
      ],
      on: {
        CLOSED: {
          target: 'closed',
          actions: [
            (ctx) => {
              // Return focus
              if (ctx.returnFocus) {
                ctx.returnFocus.focus();
              }
            },
            assign({ data: null, returnFocus: null })
          ]
        }
      }
    }
  }
});
```

### Dropdown Menu State

```javascript
const dropdownMachine = createMachine({
  id: 'dropdown',
  initial: 'closed',
  context: {
    selectedIndex: -1,
    options: []
  },
  states: {
    closed: {
      on: {
        TOGGLE: 'open',
        FOCUS: 'open'
      }
    },
    open: {
      entry: [assign({ selectedIndex: -1 })],
      on: {
        TOGGLE: 'closed',
        BLUR: 'closed',
        ESCAPE: 'closed',
        ARROW_DOWN: {
          actions: [assign({
            selectedIndex: (ctx) =>
              Math.min(ctx.selectedIndex + 1, ctx.options.length - 1)
          })]
        },
        ARROW_UP: {
          actions: [assign({
            selectedIndex: (ctx) => Math.max(ctx.selectedIndex - 1, 0)
          })]
        },
        ENTER: [
          {
            target: 'closed',
            cond: (ctx) => ctx.selectedIndex >= 0,
            actions: [(ctx) => {
              const selected = ctx.options[ctx.selectedIndex];
              // Emit selection event
              console.log('Selected:', selected);
            }]
          }
        ],
        SELECT: {
          target: 'closed',
          actions: [(ctx, event) => {
            console.log('Selected:', event.option);
          }]
        }
      }
    }
  }
});
```

## Data Fetching

### Advanced Fetch with Retry and Cache

```javascript
const advancedFetchMachine = createMachine({
  id: 'advancedFetch',
  initial: 'idle',
  context: {
    data: null,
    error: null,
    cache: new Map(),
    retryCount: 0,
    maxRetries: 3,
    cacheKey: null
  },
  states: {
    idle: {
      on: {
        FETCH: [
          {
            target: 'success',
            cond: (ctx, event) => ctx.cache.has(event.url),
            actions: [assign({
              data: (ctx, event) => ctx.cache.get(event.url),
              cacheKey: (ctx, event) => event.url
            })]
          },
          {
            target: 'loading',
            actions: [assign({
              cacheKey: (ctx, event) => event.url,
              retryCount: 0,
              error: null
            })]
          }
        ]
      }
    },
    loading: {
      entry: [async (ctx, event) => {
        try {
          const response = await fetch(event.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          machine.send('SUCCESS', { data });
        } catch (error) {
          machine.send('ERROR', { error: error.message });
        }
      }],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [assign({
            data: (ctx, event) => event.data,
            cache: (ctx, event) => {
              ctx.cache.set(ctx.cacheKey, event.data);
              return ctx.cache;
            }
          })]
        },
        ERROR: [
          {
            target: 'retrying',
            cond: (ctx) => ctx.retryCount < ctx.maxRetries,
            actions: [assign({
              error: (ctx, event) => event.error,
              retryCount: (ctx) => ctx.retryCount + 1
            })]
          },
          {
            target: 'error',
            actions: [assign({ error: (ctx, event) => event.error })]
          }
        ],
        CANCEL: 'idle'
      }
    },
    retrying: {
      entry: [async (ctx) => {
        // Exponential backoff
        const delay = Math.pow(2, ctx.retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        machine.send('RETRY');
      }],
      on: {
        RETRY: 'loading',
        CANCEL: 'idle'
      }
    },
    success: {
      on: {
        FETCH: [
          {
            target: 'success',
            cond: (ctx, event) => ctx.cache.has(event.url),
            actions: [assign({
              data: (ctx, event) => ctx.cache.get(event.url),
              cacheKey: (ctx, event) => event.url
            })]
          },
          {
            target: 'loading',
            actions: [assign({
              cacheKey: (ctx, event) => event.url,
              retryCount: 0,
              error: null
            })]
          }
        ],
        INVALIDATE: {
          target: 'idle',
          actions: [assign({
            cache: (ctx) => {
              ctx.cache.delete(ctx.cacheKey);
              return ctx.cache;
            },
            data: null,
            cacheKey: null
          })]
        }
      }
    },
    error: {
      on: {
        RETRY: {
          target: 'loading',
          actions: [assign({ retryCount: 0, error: null })]
        },
        FETCH: {
          target: 'loading',
          actions: [assign({
            cacheKey: (ctx, event) => event.url,
            retryCount: 0,
            error: null
          })]
        }
      }
    }
  }
});
```

### Paginated Data Loading

```javascript
const paginationMachine = createMachine({
  id: 'pagination',
  initial: 'idle',
  context: {
    items: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalItems: 0,
    loading: false,
    error: null
  },
  states: {
    idle: {
      on: {
        LOAD_PAGE: 'loading',
        REFRESH: {
          target: 'loading',
          actions: [assign({ currentPage: 1, items: [] })]
        }
      }
    },
    loading: {
      entry: [
        assign({ loading: true, error: null }),
        async (ctx, event) => {
          try {
            const page = event?.page || ctx.currentPage;
            const response = await fetch(`/api/items?page=${page}&size=${ctx.pageSize}`);
            const data = await response.json();
            machine.send('SUCCESS', {
              items: data.items,
              totalItems: data.total,
              page
            });
          } catch (error) {
            machine.send('ERROR', { error: error.message });
          }
        }
      ],
      on: {
        SUCCESS: {
          target: 'loaded',
          actions: [assign({
            items: (ctx, event) => event.items,
            currentPage: (ctx, event) => event.page,
            totalItems: (ctx, event) => event.totalItems,
            totalPages: (ctx, event) => Math.ceil(event.totalItems / ctx.pageSize),
            loading: false
          })]
        },
        ERROR: {
          target: 'error',
          actions: [assign({
            error: (ctx, event) => event.error,
            loading: false
          })]
        }
      }
    },
    loaded: {
      on: {
        LOAD_PAGE: [
          {
            target: 'loading',
            cond: (ctx, event) => event.page !== ctx.currentPage &&
                                  event.page > 0 &&
                                  event.page <= ctx.totalPages
          }
        ],
        NEXT_PAGE: [
          {
            target: 'loading',
            cond: (ctx) => ctx.currentPage < ctx.totalPages,
            actions: [assign({ currentPage: (ctx) => ctx.currentPage + 1 })]
          }
        ],
        PREV_PAGE: [
          {
            target: 'loading',
            cond: (ctx) => ctx.currentPage > 1,
            actions: [assign({ currentPage: (ctx) => ctx.currentPage - 1 })]
          }
        ],
        REFRESH: {
          target: 'loading',
          actions: [assign({ items: [] })]
        }
      }
    },
    error: {
      on: {
        RETRY: 'loading',
        REFRESH: {
          target: 'loading',
          actions: [assign({ currentPage: 1, items: [], error: null })]
        }
      }
    }
  }
});
```

## Form Management

### Multi-Step Wizard Form

```javascript
const wizardMachine = createMachine({
  id: 'wizard',
  initial: 'step1',
  context: {
    step1Data: {},
    step2Data: {},
    step3Data: {},
    errors: {},
    currentStep: 1,
    totalSteps: 3
  },
  states: {
    step1: {
      entry: [assign({ currentStep: 1 })],
      on: {
        UPDATE_STEP1: {
          actions: [assign({
            step1Data: (ctx, event) => ({ ...ctx.step1Data, ...event.data }),
            errors: (ctx, event) => {
              const { step1, ...otherErrors } = ctx.errors;
              return otherErrors;
            }
          })]
        },
        NEXT: [
          {
            target: 'step2',
            cond: (ctx) => validateStep1(ctx.step1Data),
            actions: [assign({ errors: {} })]
          },
          {
            actions: [assign({
              errors: (ctx) => ({ ...ctx.errors, step1: getStep1Errors(ctx.step1Data) })
            })]
          }
        ]
      }
    },
    step2: {
      entry: [assign({ currentStep: 2 })],
      on: {
        UPDATE_STEP2: {
          actions: [assign({
            step2Data: (ctx, event) => ({ ...ctx.step2Data, ...event.data }),
            errors: (ctx, event) => {
              const { step2, ...otherErrors } = ctx.errors;
              return otherErrors;
            }
          })]
        },
        NEXT: [
          {
            target: 'step3',
            cond: (ctx) => validateStep2(ctx.step2Data),
            actions: [assign({ errors: {} })]
          },
          {
            actions: [assign({
              errors: (ctx) => ({ ...ctx.errors, step2: getStep2Errors(ctx.step2Data) })
            })]
          }
        ],
        PREV: 'step1'
      }
    },
    step3: {
      entry: [assign({ currentStep: 3 })],
      on: {
        UPDATE_STEP3: {
          actions: [assign({
            step3Data: (ctx, event) => ({ ...ctx.step3Data, ...event.data }),
            errors: (ctx, event) => {
              const { step3, ...otherErrors } = ctx.errors;
              return otherErrors;
            }
          })]
        },
        SUBMIT: [
          {
            target: 'submitting',
            cond: (ctx) => validateStep3(ctx.step3Data),
            actions: [assign({ errors: {} })]
          },
          {
            actions: [assign({
              errors: (ctx) => ({ ...ctx.errors, step3: getStep3Errors(ctx.step3Data) })
            })]
          }
        ],
        PREV: 'step2'
      }
    },
    submitting: {
      entry: [async (ctx) => {
        try {
          const formData = {
            ...ctx.step1Data,
            ...ctx.step2Data,
            ...ctx.step3Data
          };

          const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          if (response.ok) {
            machine.send('SUCCESS');
          } else {
            throw new Error('Submission failed');
          }
        } catch (error) {
          machine.send('ERROR', { error: error.message });
        }
      }],
      on: {
        SUCCESS: 'success',
        ERROR: {
          target: 'step3',
          actions: [assign({
            errors: (ctx, event) => ({
              ...ctx.errors,
              submit: event.error
            })
          })]
        }
      }
    },
    success: {
      on: {
        RESET: {
          target: 'step1',
          actions: [assign({
            step1Data: {},
            step2Data: {},
            step3Data: {},
            errors: {},
            currentStep: 1
          })]
        }
      }
    }
  }
});

// Validation functions
const validateStep1 = (data) => {
  return data.name && data.email && /\S+@\S+\.\S+/.test(data.email);
};

const getStep1Errors = (data) => {
  const errors = {};
  if (!data.name) errors.name = 'Name is required';
  if (!data.email) errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email';
  return errors;
};

const validateStep2 = (data) => {
  return data.address && data.city && data.zipCode;
};

const getStep2Errors = (data) => {
  const errors = {};
  if (!data.address) errors.address = 'Address is required';
  if (!data.city) errors.city = 'City is required';
  if (!data.zipCode) errors.zipCode = 'Zip code is required';
  return errors;
};

const validateStep3 = (data) => {
  return data.cardNumber && data.expiryDate && data.cvv;
};

const getStep3Errors = (data) => {
  const errors = {};
  if (!data.cardNumber) errors.cardNumber = 'Card number is required';
  if (!data.expiryDate) errors.expiryDate = 'Expiry date is required';
  if (!data.cvv) errors.cvv = 'CVV is required';
  return errors;
};
```

## Game Logic

### Tic-Tac-Toe Game

```javascript
const ticTacToeMachine = createMachine({
  id: 'ticTacToe',
  initial: 'playing',
  context: {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    winningLine: null
  },
  states: {
    playing: {
      on: {
        MOVE: [
          {
            target: 'gameOver',
            cond: (ctx, event) => {
              if (ctx.board[event.position] !== null) return false;
              const newBoard = [...ctx.board];
              newBoard[event.position] = ctx.currentPlayer;
              const result = checkWinner(newBoard);
              return result.winner || result.isDraw;
            },
            actions: [assign({
              board: (ctx, event) => {
                const newBoard = [...ctx.board];
                newBoard[event.position] = ctx.currentPlayer;
                return newBoard;
              },
              winner: (ctx, event) => {
                const newBoard = [...ctx.board];
                newBoard[event.position] = ctx.currentPlayer;
                const result = checkWinner(newBoard);
                return result.winner;
              },
              winningLine: (ctx, event) => {
                const newBoard = [...ctx.board];
                newBoard[event.position] = ctx.currentPlayer;
                const result = checkWinner(newBoard);
                return result.winningLine;
              }
            })]
          },
          {
            cond: (ctx, event) => ctx.board[event.position] === null,
            actions: [assign({
              board: (ctx, event) => {
                const newBoard = [...ctx.board];
                newBoard[event.position] = ctx.currentPlayer;
                return newBoard;
              },
              currentPlayer: (ctx) => ctx.currentPlayer === 'X' ? 'O' : 'X'
            })]
          }
        ],
        RESET: {
          actions: [assign({
            board: () => Array(9).fill(null),
            currentPlayer: 'X',
            winner: null,
            winningLine: null
          })]
        }
      }
    },
    gameOver: {
      on: {
        RESET: {
          target: 'playing',
          actions: [assign({
            board: () => Array(9).fill(null),
            currentPlayer: 'X',
            winner: null,
            winningLine: null
          })]
        }
      }
    }
  }
});

const checkWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line, isDraw: false };
    }
  }

  const isDraw = board.every(cell => cell !== null);
  return { winner: null, winningLine: null, isDraw };
};
```

## Background Processes

### File Upload with Progress

```javascript
const fileUploadMachine = createMachine({
  id: 'fileUpload',
  initial: 'idle',
  context: {
    file: null,
    progress: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    result: null,
    error: null,
    abortController: null
  },
  states: {
    idle: {
      on: {
        SELECT_FILE: {
          target: 'selected',
          actions: [assign({
            file: (ctx, event) => event.file,
            totalBytes: (ctx, event) => event.file.size,
            progress: 0,
            uploadedBytes: 0,
            result: null,
            error: null
          })]
        }
      }
    },
    selected: {
      on: {
        UPLOAD: 'uploading',
        SELECT_FILE: {
          actions: [assign({
            file: (ctx, event) => event.file,
            totalBytes: (ctx, event) => event.file.size,
            progress: 0,
            uploadedBytes: 0,
            result: null,
            error: null
          })]
        },
        CLEAR: {
          target: 'idle',
          actions: [assign({
            file: null,
            totalBytes: 0,
            progress: 0,
            uploadedBytes: 0,
            result: null,
            error: null
          })]
        }
      }
    },
    uploading: {
      entry: [
        assign({
          abortController: () => new AbortController()
        }),
        async (ctx) => {
          try {
            const formData = new FormData();
            formData.append('file', ctx.file);

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
              signal: ctx.abortController.signal,
              // Note: In real implementation, you'd use XMLHttpRequest for progress
              onUploadProgress: (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                machine.send('PROGRESS', {
                  progress,
                  uploadedBytes: progressEvent.loaded
                });
              }
            });

            if (response.ok) {
              const result = await response.json();
              machine.send('SUCCESS', { result });
            } else {
              throw new Error(`Upload failed: ${response.statusText}`);
            }
          } catch (error) {
            if (error.name !== 'AbortError') {
              machine.send('ERROR', { error: error.message });
            }
          }
        }
      ],
      on: {
        PROGRESS: {
          actions: [assign({
            progress: (ctx, event) => event.progress,
            uploadedBytes: (ctx, event) => event.uploadedBytes
          })]
        },
        SUCCESS: {
          target: 'completed',
          actions: [assign({
            result: (ctx, event) => event.result,
            progress: 100
          })]
        },
        ERROR: {
          target: 'error',
          actions: [assign({
            error: (ctx, event) => event.error
          })]
        },
        CANCEL: {
          target: 'selected',
          actions: [
            (ctx) => {
              if (ctx.abortController) {
                ctx.abortController.abort();
              }
            },
            assign({
              progress: 0,
              uploadedBytes: 0,
              abortController: null
            })
          ]
        }
      }
    },
    completed: {
      on: {
        UPLOAD_ANOTHER: 'idle',
        CLEAR: {
          target: 'idle',
          actions: [assign({
            file: null,
            progress: 0,
            uploadedBytes: 0,
            totalBytes: 0,
            result: null
          })]
        }
      }
    },
    error: {
      on: {
        RETRY: 'uploading',
        SELECT_FILE: {
          target: 'selected',
          actions: [assign({
            file: (ctx, event) => event.file,
            totalBytes: (ctx, event) => event.file.size,
            progress: 0,
            uploadedBytes: 0,
            error: null
          })]
        },
        CLEAR: {
          target: 'idle',
          actions: [assign({
            file: null,
            progress: 0,
            uploadedBytes: 0,
            totalBytes: 0,
            error: null
          })]
        }
      }
    }
  }
});
```

## Testing Patterns

### Test-Driven State Machine Development

```javascript
// test/machine.test.js
import { createMachine, assign } from '@datnguyen1215/hsmjs';

describe('User Authentication Machine', () => {
  let authMachine;

  beforeEach(() => {
    authMachine = createMachine({
      id: 'auth',
      initial: 'loggedOut',
      context: { user: null, attempts: 0, maxAttempts: 3 },
      states: {
        loggedOut: {
          on: { LOGIN: 'authenticating' }
        },
        authenticating: {
          entry: [async (ctx, event) => {
            // Simulate authentication
            await new Promise(resolve => setTimeout(resolve, 100));

            if (event.credentials?.username === 'admin' &&
                event.credentials?.password === 'password') {
              machine.send('SUCCESS', { user: { username: 'admin' } });
            } else {
              machine.send('FAILURE');
            }
          }],
          on: {
            SUCCESS: {
              target: 'loggedIn',
              actions: [assign({
                user: (ctx, event) => event.user,
                attempts: 0
              })]
            },
            FAILURE: [
              {
                target: 'locked',
                cond: (ctx) => ctx.attempts >= ctx.maxAttempts - 1,
                actions: [assign({ attempts: (ctx) => ctx.attempts + 1 })]
              },
              {
                target: 'loggedOut',
                actions: [assign({ attempts: (ctx) => ctx.attempts + 1 })]
              }
            ]
          }
        },
        loggedIn: {
          on: { LOGOUT: 'loggedOut' }
        },
        locked: {
          on: { UNLOCK: 'loggedOut' }
        }
      }
    });
  });

  test('successful login', async () => {
    expect(authMachine.state).toBe('loggedOut');

    await authMachine.send('LOGIN', {
      credentials: { username: 'admin', password: 'password' }
    });

    expect(authMachine.state).toBe('loggedIn');
    expect(authMachine.context.user.username).toBe('admin');
    expect(authMachine.context.attempts).toBe(0);
  });

  test('failed login increments attempts', async () => {
    await authMachine.send('LOGIN', {
      credentials: { username: 'wrong', password: 'wrong' }
    });

    expect(authMachine.state).toBe('loggedOut');
    expect(authMachine.context.attempts).toBe(1);
  });

  test('locks account after max attempts', async () => {
    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      await authMachine.send('LOGIN', {
        credentials: { username: 'wrong', password: 'wrong' }
      });
    }

    expect(authMachine.state).toBe('locked');
    expect(authMachine.context.attempts).toBe(3);
  });

  test('logout returns to logged out state', async () => {
    // First login
    await authMachine.send('LOGIN', {
      credentials: { username: 'admin', password: 'password' }
    });
    expect(authMachine.state).toBe('loggedIn');

    // Then logout
    await authMachine.send('LOGOUT');
    expect(authMachine.state).toBe('loggedOut');
    expect(authMachine.context.user).toBe(null);
  });
});
```

### Mock Testing Helper

```javascript
// test/helpers/mockMachine.js
export const createMockMachine = (states, initialState = Object.keys(states)[0]) => {
  let currentState = initialState;
  let context = {};
  const subscribers = new Set();

  return {
    get state() { return currentState; },
    get context() { return context; },

    send: (event, payload) => {
      const stateConfig = states[currentState];
      const handler = stateConfig?.on?.[event];

      if (handler) {
        if (typeof handler === 'string') {
          currentState = handler;
        } else if (handler.target) {
          currentState = handler.target;
          if (handler.actions) {
            // Simulate context updates
            handler.actions.forEach(action => {
              if (action.assign) {
                Object.assign(context, action.assign);
              }
            });
          }
        }

        // Notify subscribers
        subscribers.forEach(callback => callback(currentState, context));
      }

      return Promise.resolve({ state: currentState, context });
    },

    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    matches: (state) => currentState === state
  };
};

// Usage in tests
test('mock machine behavior', async () => {
  const mockMachine = createMockMachine({
    idle: { on: { START: 'loading' } },
    loading: { on: { SUCCESS: 'success', ERROR: 'error' } },
    success: {},
    error: { on: { RETRY: 'loading' } }
  });

  expect(mockMachine.state).toBe('idle');

  await mockMachine.send('START');
  expect(mockMachine.state).toBe('loading');

  await mockMachine.send('SUCCESS');
  expect(mockMachine.state).toBe('success');
});
```

These examples demonstrate real-world patterns and use cases for HSMJS. Each pattern can be adapted and extended based on your specific requirements.