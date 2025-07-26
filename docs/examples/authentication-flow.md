# Authentication Flow Example

A complete authentication system with login, registration, password reset, and two-factor authentication.

## State Diagram

```
┌──────────────────────────────────────┐
│          unauthenticated             │
│  ┌─────────┐ ┌──────────┐ ┌──────┐  │
│  │  login  │ │ register │ │ 2fa  │  │
│  └─────────┘ └──────────┘ └──────┘  │
└──────────────┬───────────────────────┘
               │ SUCCESS
               ▼
        ┌──────────────┐
        │authenticated │
        └──────────────┘
```

## Complete Authentication System

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('auth');

// Top-level states
const unauthenticated = machine.state('unauthenticated');
const authenticating = machine.state('authenticating');
const authenticated = machine.state('authenticated');
const refreshing = machine.state('refreshing');

// Unauthenticated substates
const login = unauthenticated.state('login');
const register = unauthenticated.state('register');
const forgotPassword = unauthenticated.state('forgotPassword');
const resetPassword = unauthenticated.state('resetPassword');
const twoFactor = unauthenticated.state('twoFactor');

unauthenticated.initial(login);

// Authenticated substates
const dashboard = authenticated.state('dashboard');
const profile = authenticated.state('profile');
const settings = authenticated.state('settings');

authenticated.initial(dashboard);

// Authentication actions
const authenticate = action('authenticate', async (ctx, event) => {
  try {
    const response = await api.login({
      email: event.email,
      password: event.password
    });
    
    ctx.user = response.user;
    ctx.tokens = {
      access: response.accessToken,
      refresh: response.refreshToken
    };
    ctx.tokenExpiry = Date.now() + response.expiresIn * 1000;
    
    // Store tokens securely
    await tokenStorage.save(ctx.tokens);
    
    return { 
      userId: response.user.id,
      requires2FA: response.requires2FA 
    };
  } catch (error) {
    ctx.authError = error.message;
    throw error;
  }
});

const refreshToken = action('refreshToken', async (ctx) => {
  const response = await api.refreshToken(ctx.tokens.refresh);
  ctx.tokens.access = response.accessToken;
  ctx.tokenExpiry = Date.now() + response.expiresIn * 1000;
  await tokenStorage.save(ctx.tokens);
});

// Login flow
login
  .on('SUBMIT', authenticating)
    .do(authenticate)
  .on('REGISTER', register)
  .on('FORGOT_PASSWORD', forgotPassword);

// Registration flow
register
  .on('SUBMIT', authenticating)
    .doAsync(async (ctx, event) => {
      // Validate registration data
      const errors = validateRegistration(event);
      if (errors.length > 0) {
        ctx.errors = errors;
        throw new Error('Validation failed');
      }
      
      // Create account
      const response = await api.register({
        email: event.email,
        password: event.password,
        name: event.name
      });
      
      // Auto-login after registration
      return authenticate(ctx, {
        email: event.email,
        password: event.password
      });
    })
  .on('LOGIN', login);

// Forgot password flow
forgotPassword
  .on('SUBMIT', forgotPassword)
    .doAsync(async (ctx, event) => {
      await api.requestPasswordReset(event.email);
      ctx.resetEmailSent = true;
      ctx.resetEmail = event.email;
    })
    .fire((ctx) => {
      // Analytics
      analytics.track('password_reset_requested');
    })
  .on('RESET_TOKEN', resetPassword)
  .on('BACK', login);

// Reset password with token
resetPassword
  .on('SUBMIT', login)
    .doAsync(async (ctx, event) => {
      await api.resetPassword({
        token: event.token,
        newPassword: event.password
      });
      ctx.passwordReset = true;
    })
  .on('EXPIRED', forgotPassword);

// Two-factor authentication
twoFactor
  .enter((ctx) => {
    ctx.attemptsRemaining = 3;
  })
  .on('VERIFY', authenticated)
    .if((ctx) => ctx.attemptsRemaining > 0)
    .doAsync(async (ctx, event) => {
      const response = await api.verify2FA({
        userId: ctx.pendingUserId,
        code: event.code
      });
      
      ctx.user = response.user;
      ctx.tokens = {
        access: response.accessToken,
        refresh: response.refreshToken
      };
      
      return { verified: true };
    })
  .on('RESEND', twoFactor)
    .doAsync(async (ctx) => {
      await api.resend2FACode(ctx.pendingUserId);
      ctx.lastCodeSent = Date.now();
    })
  .on('CANCEL', login);

// Handle authentication results
authenticating
  .on('SUCCESS', authenticated)
  .on('NEEDS_2FA', twoFactor)
    .do((ctx, event) => {
      ctx.pendingUserId = event.userId;
    })
  .on('ERROR', login)
    .do((ctx, event) => {
      ctx.loginError = event.error;
      ctx.loginAttempts = (ctx.loginAttempts || 0) + 1;
    });

// Authenticated state management
authenticated
  .enter((ctx) => {
    // Start token refresh timer
    const timeUntilExpiry = ctx.tokenExpiry - Date.now();
    const refreshTime = timeUntilExpiry - 60000; // Refresh 1 minute before expiry
    
    ctx.refreshTimer = setTimeout(() => {
      ctx.instance.send('REFRESH_TOKEN');
    }, refreshTime);
  })
  .exit((ctx) => {
    // Clear refresh timer
    if (ctx.refreshTimer) {
      clearTimeout(ctx.refreshTimer);
      ctx.refreshTimer = null;
    }
  });

// Global logout handler
machine
  .on('LOGOUT', unauthenticated)
  .do(action('logout', async (ctx) => {
    // Call logout API
    try {
      await api.logout(ctx.tokens.access);
    } catch (error) {
      console.error('Logout API error:', error);
    }
    
    // Clear local state
    ctx.user = null;
    ctx.tokens = null;
    ctx.tokenExpiry = null;
    
    // Clear stored tokens
    await tokenStorage.clear();
  }))
  .fire(() => {
    analytics.track('user_logout');
  });

// Token refresh
authenticated
  .on('REFRESH_TOKEN', refreshing);

refreshing
  .on('SUCCESS', authenticated)
    .doAsync(refreshToken)
  .on('ERROR', unauthenticated)
    .do((ctx) => {
      ctx.sessionExpired = true;
    });

// Initialize
machine.initial(unauthenticated);

// Usage
const auth = machine.start({
  user: null,
  tokens: null,
  errors: [],
  instance: null
});

auth.context.instance = auth;

// Check for existing session on startup
const existingTokens = await tokenStorage.load();
if (existingTokens && existingTokens.refresh) {
  auth.context.tokens = existingTokens;
  await auth.send('REFRESH_TOKEN');
}
```

## Social Authentication

```javascript
// Add social auth states
const socialAuth = unauthenticated.state('socialAuth');
const socialCallback = unauthenticated.state('socialCallback');

// Social auth providers
const providers = ['google', 'github', 'facebook'];

providers.forEach(provider => {
  login
    .on(`LOGIN_${provider.toUpperCase()}`, socialAuth)
    .do((ctx) => {
      ctx.provider = provider;
      // Redirect to OAuth provider
      window.location.href = api.getOAuthUrl(provider);
    });
});

// Handle OAuth callback
socialCallback
  .enter(async (ctx) => {
    // Extract code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code) {
      try {
        const response = await api.exchangeOAuthCode({
          provider: ctx.provider,
          code,
          state
        });
        
        ctx.user = response.user;
        ctx.tokens = {
          access: response.accessToken,
          refresh: response.refreshToken
        };
        
        // Transition to authenticated
        setTimeout(() => {
          ctx.instance.send('SUCCESS');
        }, 0);
      } catch (error) {
        ctx.socialAuthError = error.message;
        setTimeout(() => {
          ctx.instance.send('ERROR');
        }, 0);
      }
    }
  })
  .on('SUCCESS', authenticated)
  .on('ERROR', login);
```

## Session Management

```javascript
// Add session monitoring
const sessionMonitor = action('sessionMonitor', (ctx) => {
  // Monitor user activity
  const activityHandler = () => {
    ctx.lastActivity = Date.now();
    
    // Reset inactivity timer
    if (ctx.inactivityTimer) {
      clearTimeout(ctx.inactivityTimer);
    }
    
    ctx.inactivityTimer = setTimeout(() => {
      ctx.instance.send('INACTIVE_TIMEOUT');
    }, 15 * 60 * 1000); // 15 minutes
  };
  
  // Listen for user activity
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, activityHandler);
  });
  
  // Store cleanup function
  ctx.cleanupActivity = () => {
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.removeEventListener(event, activityHandler);
    });
  };
  
  // Start inactivity timer
  activityHandler();
});

authenticated
  .enter(sessionMonitor)
  .exit((ctx) => {
    // Cleanup activity monitoring
    if (ctx.cleanupActivity) {
      ctx.cleanupActivity();
    }
    if (ctx.inactivityTimer) {
      clearTimeout(ctx.inactivityTimer);
    }
  });

// Handle timeouts
machine
  .on('INACTIVE_TIMEOUT', unauthenticated)
  .do((ctx) => {
    ctx.logoutReason = 'inactivity';
  })
  .fire(() => {
    notifications.show('You have been logged out due to inactivity');
  });
```

## Permission-Based States

```javascript
// Add role-based substates
const adminPanel = authenticated.state('adminPanel');
const userDashboard = authenticated.state('userDashboard');

// Dynamic initial state based on role
authenticated
  .enter((ctx) => {
    // Navigate to appropriate dashboard based on role
    const targetState = ctx.user.role === 'admin' ? 'adminPanel' : 'userDashboard';
    setTimeout(() => {
      ctx.instance.send('NAVIGATE', { target: targetState });
    }, 0);
  })
  .on('NAVIGATE', (ctx, event) => event.target);

// Protect admin routes
adminPanel
  .enter((ctx) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
  });
```

## Key Concepts Demonstrated

- Hierarchical authentication states
- OAuth/social login integration
- Two-factor authentication flow
- Token refresh management
- Session timeout handling
- Permission-based routing
- Error handling and recovery
- Secure token storage
- Activity monitoring
- Global logout from any state