/**
 * Practical TypeScript usage examples for hsmjs
 * These examples demonstrate real-world usage patterns
 */

import { createMachine, action, type EventPayload } from '../../types/index';

// ============================================================================
// Authentication Flow Example
// ============================================================================

interface AuthContext {
  user: { id: string; email: string; name: string } | null;
  token: string | null;
  error: string | null;
  isLoading: boolean;
}

type AuthEvents = 
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'LOGIN_SUCCESS'; user: any; token: string }
  | { type: 'LOGIN_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' };

const authMachine = createMachine<AuthContext>('auth');

// Define states
const idle = authMachine.state('idle');
const loading = authMachine.state('loading');
const authenticated = authMachine.state('authenticated');
const error = authMachine.state('error');

// Configure transitions
idle
  .on('LOGIN', loading)
  .if((ctx, event: EventPayload<AuthEvents, 'LOGIN'>) => {
    return event.email.includes('@') && event.password.length > 0;
  })
  .do((ctx) => {
    ctx.isLoading = true;
    ctx.error = null;
  })
  .doAsync(async (ctx, event: EventPayload<AuthEvents, 'LOGIN'>) => {
    // Simulate API call
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: event.email, 
        password: event.password 
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return { user: data.user, token: data.token };
    } else {
      throw new Error('Login failed');
    }
  });

loading
  .on('LOGIN_SUCCESS', authenticated)
  .do((ctx, event: EventPayload<AuthEvents, 'LOGIN_SUCCESS'>) => {
    ctx.user = event.user;
    ctx.token = event.token;
    ctx.isLoading = false;
  })
  .on('LOGIN_ERROR', error)
  .do((ctx, event: EventPayload<AuthEvents, 'LOGIN_ERROR'>) => {
    ctx.error = event.message;
    ctx.isLoading = false;
  });

authenticated
  .on('LOGOUT', idle)
  .do((ctx) => {
    ctx.user = null;
    ctx.token = null;
  })
  .fire(async () => {
    // Analytics tracking
    await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event: 'logout' })
    });
  });

error
  .on('CLEAR_ERROR', idle)
  .do((ctx) => {
    ctx.error = null;
  })
  .on('LOGIN', loading); // Allow retry from error state

authMachine.initial(idle);

// Usage
const authInstance = authMachine.start({
  user: null,
  token: null,
  error: null,
  isLoading: false
});

// ============================================================================
// E-commerce Shopping Cart Example
// ============================================================================

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ShoppingContext {
  items: CartItem[];
  total: number;
  checkoutStatus: 'idle' | 'processing' | 'complete' | 'failed';
  paymentMethod: string | null;
}

type ShoppingEvents =
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'UPDATE_QUANTITY'; id: string; quantity: number }
  | { type: 'CHECKOUT'; paymentMethod: string }
  | { type: 'PAYMENT_SUCCESS' }
  | { type: 'PAYMENT_FAILED'; error: string }
  | { type: 'CLEAR_CART' };

const shoppingMachine = createMachine<ShoppingContext>('shopping-cart');

const cartEmpty = shoppingMachine.state('empty');
const cartFilled = shoppingMachine.state('filled');
const checkout = shoppingMachine.state('checkout');
const complete = shoppingMachine.state('complete');

// Helper actions
const calculateTotal = action('calculateTotal', (ctx: ShoppingContext) => {
  ctx.total = ctx.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

const addItemAction = action('addItem', (ctx: ShoppingContext, event: EventPayload<ShoppingEvents, 'ADD_ITEM'>) => {
  const existingItem = ctx.items.find(item => item.id === event.item.id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    ctx.items.push({ ...event.item, quantity: 1 });
  }
});

// Configure cart transitions
cartEmpty
  .on('ADD_ITEM', cartFilled)
  .do(addItemAction)
  .do(calculateTotal);

cartFilled
  .on('ADD_ITEM', cartFilled)
  .do(addItemAction)
  .do(calculateTotal)
  .on('REMOVE_ITEM', (ctx, event) => ctx.items.length > 1 ? cartFilled : cartEmpty)
  .do((ctx, event: EventPayload<ShoppingEvents, 'REMOVE_ITEM'>) => {
    ctx.items = ctx.items.filter(item => item.id !== event.id);
  })
  .do(calculateTotal)
  .on('UPDATE_QUANTITY', cartFilled)
  .if((ctx, event: EventPayload<ShoppingEvents, 'UPDATE_QUANTITY'>) => event.quantity > 0)
  .do((ctx, event: EventPayload<ShoppingEvents, 'UPDATE_QUANTITY'>) => {
    const item = ctx.items.find(item => item.id === event.id);
    if (item) {
      item.quantity = event.quantity;
    }
  })
  .do(calculateTotal)
  .on('CHECKOUT', checkout)
  .if((ctx) => ctx.items.length > 0 && ctx.total > 0)
  .do((ctx, event: EventPayload<ShoppingEvents, 'CHECKOUT'>) => {
    ctx.paymentMethod = event.paymentMethod;
    ctx.checkoutStatus = 'processing';
  });

checkout
  .enter((ctx) => {
    ctx.checkoutStatus = 'processing';
  })
  .on('PAYMENT_SUCCESS', complete)
  .do((ctx) => {
    ctx.checkoutStatus = 'complete';
  })
  .on('PAYMENT_FAILED', cartFilled)
  .do((ctx, event: EventPayload<ShoppingEvents, 'PAYMENT_FAILED'>) => {
    ctx.checkoutStatus = 'failed';
    console.error('Payment failed:', event.error);
  });

complete
  .enter((ctx) => {
    ctx.checkoutStatus = 'complete';
  })
  .on('CLEAR_CART', cartEmpty)
  .do((ctx) => {
    ctx.items = [];
    ctx.total = 0;
    ctx.checkoutStatus = 'idle';
    ctx.paymentMethod = null;
  });

shoppingMachine.initial(cartEmpty);

// ============================================================================
// Traffic Light Example with Timing
// ============================================================================

interface TrafficContext {
  currentColor: 'red' | 'yellow' | 'green';
  duration: number;
  emergency: boolean;
}

type TrafficEvents =
  | { type: 'TIMER' }
  | { type: 'EMERGENCY' }
  | { type: 'RESUME' };

const trafficMachine = createMachine<TrafficContext>('traffic-light');

const red = trafficMachine.state('red');
const yellow = trafficMachine.state('yellow');
const green = trafficMachine.state('green');
const emergency = trafficMachine.state('emergency');

// Normal flow
red
  .enter((ctx) => { 
    ctx.currentColor = 'red'; 
    ctx.duration = 30000; // 30 seconds
  })
  .on('TIMER', green);

green
  .enter((ctx) => { 
    ctx.currentColor = 'green'; 
    ctx.duration = 45000; // 45 seconds
  })
  .on('TIMER', yellow);

yellow
  .enter((ctx) => { 
    ctx.currentColor = 'yellow'; 
    ctx.duration = 5000; // 5 seconds
  })
  .on('TIMER', red);

// Global emergency handling
trafficMachine
  .on('EMERGENCY', emergency)
  .do((ctx) => {
    ctx.emergency = true;
    ctx.currentColor = 'red';
  });

emergency
  .on('RESUME', red)
  .do((ctx) => {
    ctx.emergency = false;
  });

trafficMachine.initial(red);

// ============================================================================
// Export for Testing
// ============================================================================

export {
  authMachine,
  authInstance,
  shoppingMachine,
  trafficMachine
};

export type {
  AuthContext,
  AuthEvents,
  ShoppingContext,
  ShoppingEvents,
  TrafficContext,
  TrafficEvents
};