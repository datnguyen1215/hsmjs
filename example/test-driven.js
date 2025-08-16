import { createMachine, assign } from '../src/index.js';

// Mock test framework functions for Node.js
const describe = (name, fn) => {
  console.log(`\n=== ${name} ===`);
  return fn();
};

const test = (name, fn) => {
  console.log(`\nTest: ${name}`);
  return fn();
};

const expect = (actual) => ({
  toBe: (expected) => {
    if (actual === expected) {
      console.log(`✓ Expected ${expected}, got ${actual}`);
    } else {
      console.log(`✗ Expected ${expected}, got ${actual}`);
      throw new Error(`Expected ${expected}, got ${actual}`);
    }
  }
});

const beforeEach = (fn) => {
  console.log('Setting up test...');
  return fn();
};

const runExample = async () => {
  console.log('Test-Driven State Machine Development Example:');

  await describe('User Authentication Machine', async () => {
    let authMachine;

    await beforeEach(() => {
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
                authMachine.send('SUCCESS', { user: { username: 'admin' } });
              } else {
                authMachine.send('FAILURE');
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

    await test('successful login', async () => {
      expect(authMachine.state).toBe('loggedOut');

      await authMachine.send('LOGIN', {
        credentials: { username: 'admin', password: 'password' }
      });

      // Wait for async authentication
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(authMachine.state).toBe('loggedIn');
      expect(authMachine.context.user.username).toBe('admin');
      expect(authMachine.context.attempts).toBe(0);
    });

    await test('failed login increments attempts', async () => {
      await authMachine.send('LOGIN', {
        credentials: { username: 'wrong', password: 'wrong' }
      });

      // Wait for async authentication
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(authMachine.state).toBe('loggedOut');
      expect(authMachine.context.attempts).toBe(1);
    });

    await test('locks account after max attempts', async () => {
      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await authMachine.send('LOGIN', {
          credentials: { username: 'wrong', password: 'wrong' }
        });
        // Wait for async authentication
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      expect(authMachine.state).toBe('locked');
      expect(authMachine.context.attempts).toBe(3);
    });

    await test('logout returns to logged out state', async () => {
      // First login
      await authMachine.send('LOGIN', {
        credentials: { username: 'admin', password: 'password' }
      });
      // Wait for async authentication
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(authMachine.state).toBe('loggedIn');

      // Then logout
      await authMachine.send('LOGOUT');
      expect(authMachine.state).toBe('loggedOut');
      expect(authMachine.context.user).toBe(null);
    });

    console.log('\n--- Test Summary ---');
    console.log('All authentication tests completed successfully!');
    console.log('Final machine state:', authMachine.state);
    console.log('Final context:', authMachine.context);
  });
};

runExample().catch(console.error);