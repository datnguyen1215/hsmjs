# E-commerce Checkout Example

A comprehensive checkout flow with cart management, shipping, payment processing, and order confirmation.

## State Diagram

```
┌──────┐     ┌─────────────────────────────┐     ┌────────────┐
│ cart │ --> │          checkout           │ --> │ processing │
└──────┘     │ ┌────────┐ ┌───────┐ ┌─────┐│     └─────┬──────┘
             │ │shipping│->│payment│->│review│           │
             │ └────────┘ └───────┘ └─────┘│      ┌─────▼─────┐
             └─────────────────────────────┘       │ complete  │
                                                   └───────────┘
```

## Complete Checkout Implementation

```javascript
import { createMachine, action } from '@datnguyen1215/hsmjs';

const machine = createMachine('checkout');

// Main states
const browsing = machine.state('browsing');
const cart = machine.state('cart');
const checkout = machine.state('checkout');
const processing = machine.state('processing');
const complete = machine.state('complete');
const failed = machine.state('failed');

// Checkout substates
const shipping = checkout.state('shipping');
const payment = checkout.state('payment');
const review = checkout.state('review');

checkout.initial(shipping);

// Cart management actions
const cartActions = {
  addItem: action('addItem', (ctx, event) => {
    const { productId, quantity = 1, price, name } = event;
    const existingItem = ctx.items.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      ctx.items.push({
        productId,
        name,
        price,
        quantity,
        subtotal: price * quantity
      });
    }
    
    recalculateTotals(ctx);
    return { itemCount: ctx.items.length };
  }),
  
  removeItem: action('removeItem', (ctx, event) => {
    ctx.items = ctx.items.filter(item => item.productId !== event.productId);
    recalculateTotals(ctx);
  }),
  
  updateQuantity: action('updateQuantity', (ctx, event) => {
    const item = ctx.items.find(item => item.productId === event.productId);
    if (item) {
      item.quantity = event.quantity;
      item.subtotal = item.price * item.quantity;
      
      if (item.quantity <= 0) {
        ctx.items = ctx.items.filter(i => i.productId !== event.productId);
      }
    }
    recalculateTotals(ctx);
  })
};

function recalculateTotals(ctx) {
  ctx.subtotal = ctx.items.reduce((sum, item) => sum + item.subtotal, 0);
  ctx.tax = ctx.subtotal * (ctx.taxRate || 0.08);
  ctx.shipping = ctx.shippingMethod?.cost || 0;
  ctx.total = ctx.subtotal + ctx.tax + ctx.shipping;
}

// Browsing state - can add items from anywhere
browsing
  .on('ADD_TO_CART', browsing)
    .do(cartActions.addItem)
    .fire((ctx, event) => {
      // Show notification
      notifications.show(`${event.name} added to cart`);
    })
  .on('VIEW_CART', cart);

// Cart state
cart
  .enter((ctx) => {
    ctx.cartView = true;
  })
  .exit((ctx) => {
    ctx.cartView = false;
  })
  .on('UPDATE_QUANTITY', cart)
    .do(cartActions.updateQuantity)
  .on('REMOVE_ITEM', cart)
    .do(cartActions.removeItem)
  .on('CHECKOUT', shipping)
    .if((ctx) => ctx.items.length > 0)
    .doAsync(async (ctx) => {
      // Validate inventory before checkout
      const availability = await api.checkInventory(ctx.items);
      const unavailable = availability.filter(item => !item.available);
      
      if (unavailable.length > 0) {
        ctx.inventoryErrors = unavailable;
        throw new Error('Some items are out of stock');
      }
      
      // Reserve inventory
      ctx.reservationId = await api.reserveInventory(ctx.items);
      return { reserved: true };
    })
  .on('CONTINUE_SHOPPING', browsing);

// Shipping state
shipping
  .enter(async (ctx) => {
    // Load saved addresses if user is logged in
    if (ctx.user) {
      ctx.savedAddresses = await api.getSavedAddresses(ctx.user.id);
    }
    
    // Get shipping options
    ctx.shippingOptions = await api.getShippingOptions({
      items: ctx.items,
      destination: ctx.shippingAddress?.zip
    });
  })
  .on('SELECT_ADDRESS', shipping)
    .do((ctx, event) => {
      ctx.shippingAddress = event.address;
      
      // Recalculate shipping options based on address
      return { addressSelected: true };
    })
  .on('SELECT_SHIPPING_METHOD', shipping)
    .do((ctx, event) => {
      ctx.shippingMethod = event.method;
      recalculateTotals(ctx);
    })
  .on('SAVE_ADDRESS', shipping)
    .doAsync(async (ctx, event) => {
      if (ctx.user) {
        const savedAddress = await api.saveAddress({
          userId: ctx.user.id,
          address: event.address
        });
        ctx.savedAddresses.push(savedAddress);
      }
    })
  .on('NEXT', payment)
    .if((ctx) => ctx.shippingAddress && ctx.shippingMethod);

// Payment state
payment
  .enter(async (ctx) => {
    // Load saved payment methods
    if (ctx.user) {
      ctx.savedPaymentMethods = await api.getSavedPaymentMethods(ctx.user.id);
    }
    
    // Initialize payment processor
    ctx.paymentProcessor = await initializePaymentSDK();
  })
  .on('SELECT_PAYMENT', payment)
    .do((ctx, event) => {
      ctx.paymentMethod = event.method;
    })
  .on('ADD_CARD', payment)
    .doAsync(async (ctx, event) => {
      // Tokenize card details
      const token = await ctx.paymentProcessor.tokenize({
        number: event.cardNumber,
        exp: event.expiry,
        cvv: event.cvv
      });
      
      ctx.paymentMethod = {
        type: 'card',
        token: token.id,
        last4: event.cardNumber.slice(-4),
        brand: token.card.brand
      };
      
      // Save card if requested
      if (event.saveCard && ctx.user) {
        await api.savePaymentMethod({
          userId: ctx.user.id,
          token: token.id
        });
      }
      
      return { tokenized: true };
    })
  .on('APPLY_COUPON', payment)
    .doAsync(async (ctx, event) => {
      const coupon = await api.validateCoupon({
        code: event.code,
        items: ctx.items,
        subtotal: ctx.subtotal
      });
      
      if (coupon.valid) {
        ctx.coupon = coupon;
        ctx.discount = coupon.discount;
        recalculateTotals(ctx);
        return { discount: coupon.discount };
      } else {
        throw new Error(coupon.error || 'Invalid coupon');
      }
    })
  .on('BACK', shipping)
  .on('NEXT', review)
    .if((ctx) => ctx.paymentMethod);

// Review state
review
  .enter((ctx) => {
    // Prepare order summary
    ctx.orderSummary = {
      items: ctx.items.map(item => ({
        ...item,
        total: item.subtotal
      })),
      shipping: {
        address: ctx.shippingAddress,
        method: ctx.shippingMethod
      },
      payment: {
        method: ctx.paymentMethod.type,
        last4: ctx.paymentMethod.last4
      },
      totals: {
        subtotal: ctx.subtotal,
        tax: ctx.tax,
        shipping: ctx.shipping,
        discount: ctx.discount || 0,
        total: ctx.total
      }
    };
  })
  .on('EDIT_SHIPPING', shipping)
  .on('EDIT_PAYMENT', payment)
  .on('PLACE_ORDER', processing);

// Processing state - handle payment and order creation
processing
  .enter((ctx) => {
    ctx.processingSteps = {
      payment: 'pending',
      order: 'pending',
      inventory: 'pending',
      confirmation: 'pending'
    };
  })
  .on('SUCCESS', complete)
    .doAsync(async (ctx) => {
      try {
        // Step 1: Process payment
        ctx.processingSteps.payment = 'processing';
        const charge = await api.processPayment({
          amount: ctx.total,
          currency: 'USD',
          paymentMethod: ctx.paymentMethod,
          metadata: {
            items: ctx.items.map(i => i.productId)
          }
        });
        ctx.chargeId = charge.id;
        ctx.processingSteps.payment = 'complete';
        
        // Step 2: Create order
        ctx.processingSteps.order = 'processing';
        const order = await api.createOrder({
          items: ctx.items,
          shipping: ctx.shippingAddress,
          shippingMethod: ctx.shippingMethod,
          payment: {
            chargeId: charge.id,
            method: ctx.paymentMethod.type
          },
          totals: ctx.orderSummary.totals,
          userId: ctx.user?.id
        });
        ctx.orderId = order.id;
        ctx.orderNumber = order.number;
        ctx.processingSteps.order = 'complete';
        
        // Step 3: Confirm inventory
        ctx.processingSteps.inventory = 'processing';
        await api.confirmInventoryReservation(ctx.reservationId, order.id);
        ctx.processingSteps.inventory = 'complete';
        
        // Step 4: Send confirmation
        ctx.processingSteps.confirmation = 'processing';
        await api.sendOrderConfirmation({
          orderId: order.id,
          email: ctx.user?.email || ctx.shippingAddress.email
        });
        ctx.processingSteps.confirmation = 'complete';
        
        return {
          orderId: order.id,
          orderNumber: order.number,
          estimatedDelivery: order.estimatedDelivery
        };
        
      } catch (error) {
        // Rollback on failure
        if (ctx.chargeId) {
          await api.refundPayment(ctx.chargeId);
        }
        if (ctx.orderId) {
          await api.cancelOrder(ctx.orderId);
        }
        await api.releaseInventoryReservation(ctx.reservationId);
        
        throw error;
      }
    })
    .fire(async (ctx) => {
      // Analytics and other non-critical tasks
      analytics.track('purchase_complete', {
        orderId: ctx.orderId,
        total: ctx.total,
        items: ctx.items.length
      });
      
      // Update inventory cache
      await inventory.refresh();
      
      // Send to fulfillment system
      await fulfillment.notifyNewOrder(ctx.orderId);
    })
  .on('ERROR', failed)
    .do((ctx, event) => {
      ctx.processingError = event.error;
      ctx.failedStep = Object.entries(ctx.processingSteps)
        .find(([_, status]) => status === 'processing')?.[0];
    });

// Order complete
complete
  .enter((ctx) => {
    // Clear cart
    ctx.items = [];
    ctx.total = 0;
    
    // Clear sensitive payment data
    delete ctx.paymentMethod.token;
    delete ctx.paymentProcessor;
  })
  .on('VIEW_ORDER', complete)
    .doAsync(async (ctx) => {
      ctx.orderDetails = await api.getOrder(ctx.orderId);
      ctx.trackingInfo = await api.getTracking(ctx.orderId);
    })
  .on('CONTINUE_SHOPPING', browsing);

// Failed state
failed
  .on('RETRY', processing)
    .if((ctx) => ctx.retryCount < 3)
    .do((ctx) => {
      ctx.retryCount = (ctx.retryCount || 0) + 1;
    })
  .on('BACK_TO_CART', cart)
    .do((ctx) => {
      // Restore cart state
      delete ctx.processingError;
      delete ctx.chargeId;
      delete ctx.orderId;
    });

// Initialize
machine.initial(browsing);

// Usage
const shop = machine.start({
  items: [],
  subtotal: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  taxRate: 0.08,
  user: currentUser
});

// Add items while browsing
await shop.send('ADD_TO_CART', {
  productId: 'PROD-123',
  name: 'Wireless Headphones',
  price: 99.99,
  quantity: 1
});

// Start checkout
await shop.send('VIEW_CART');
await shop.send('CHECKOUT');

// Complete checkout flow
await shop.send('SELECT_ADDRESS', {
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zip: '12345'
  }
});

await shop.send('SELECT_SHIPPING_METHOD', {
  method: {
    id: 'standard',
    name: 'Standard Shipping',
    cost: 5.99,
    estimatedDays: 5
  }
});

await shop.send('NEXT'); // To payment

await shop.send('ADD_CARD', {
  cardNumber: '4242424242424242',
  expiry: '12/25',
  cvv: '123',
  saveCard: true
});

await shop.send('NEXT'); // To review
await shop.send('PLACE_ORDER'); // Process order

console.log('Order complete:', shop.context.orderNumber);
```

## Key Concepts Demonstrated

- Complex multi-step checkout flow
- Inventory management and reservation
- Payment processing with tokenization
- Order creation and confirmation
- Error handling and rollback
- State persistence across steps
- Progressive data collection
- Integration with external services
- Analytics and tracking
- Security considerations (token handling)