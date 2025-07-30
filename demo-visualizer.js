#!/usr/bin/env node

/**
 * HSMJS Visualizer Demo
 * 
 * This demo showcases the new visualizer API with a complex hierarchical state machine
 * representing an e-commerce order processing system.
 */

const { createMachine } = require('./src/index.js')

console.log('🚀 HSMJS Visualizer Demo - E-Commerce Order Processing')
console.log('=' .repeat(60))

// Create a complex hierarchical state machine for order processing
const orderMachine = createMachine('ecommerce-order-processing')

// Top-level states
const idle = orderMachine.state('idle')
const processing = orderMachine.state('processing')
const completed = orderMachine.state('completed')
const cancelled = orderMachine.state('cancelled')

// Processing substates (hierarchical)
const validating = processing.state('validating')
const paymentProcessing = processing.state('payment-processing')
const fulfillment = processing.state('fulfillment')

// Fulfillment substates (nested hierarchy)
const packaging = fulfillment.state('packaging')
const shipping = fulfillment.state('shipping')
const inTransit = shipping.state('in-transit')
const delivered = shipping.state('delivered')

// Payment processing substates
const authorizing = paymentProcessing.state('authorizing')
const capturing = paymentProcessing.state('capturing')
const paymentComplete = paymentProcessing.state('payment-complete')

// Define transitions
idle.on('PLACE_ORDER', validating)

// Validation flow
validating.on('VALIDATION_SUCCESS', authorizing)
validating.on('VALIDATION_FAILED', cancelled)

// Payment flow
authorizing.on('AUTH_SUCCESS', capturing)
authorizing.on('AUTH_FAILED', cancelled)
capturing.on('CAPTURE_SUCCESS', paymentComplete)
capturing.on('CAPTURE_FAILED', cancelled)
paymentComplete.on('PROCEED_TO_FULFILLMENT', packaging)

// Fulfillment flow
packaging.on('PACKAGED', inTransit)
inTransit.on('DELIVERED', delivered)
delivered.on('ORDER_COMPLETE', completed)

// Global error transitions
orderMachine.on('CANCEL_ORDER', cancelled)
orderMachine.on('SYSTEM_ERROR', cancelled)

// Set initial state
orderMachine.initial(idle)

console.log('\n📋 State Machine Created:')
console.log(`- Machine: ${orderMachine.name}`)
console.log(`- States: ${orderMachine.getAllStates().length} total`)
console.log(`- Hierarchical levels: 3 levels deep`)
console.log(`- Initial state: ${orderMachine.initialState.id}`)

console.log('\n🔧 Testing Visualizer API...')

async function demonstrateVisualizerAPI() {
  try {
    console.log('\n1️⃣  Testing machine.visualizer().preview()')
    console.log('   Opening browser preview in 3 seconds...')
    
    // Wait a moment for user to see the message
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Open browser preview
    await orderMachine.visualizer().preview()
    
    console.log('   ✅ Browser preview opened!')
    
    // Wait for user to see the preview
    console.log('\n   📖 Check your browser to see the state machine diagram!')
    console.log('   💡 You should see a hierarchical diagram with:')
    console.log('      - Top-level states: idle, processing, completed, cancelled')
    console.log('      - Processing substates: validating, payment-processing, fulfillment')
    console.log('      - Fulfillment substates: packaging, shipping (with in-transit, delivered)')
    console.log('      - Payment substates: authorizing, capturing, payment-complete')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('\n2️⃣  Testing machine.visualizer().save()')
    const savedPath = await orderMachine.visualizer().save('ecommerce-order-demo.mmd')
    console.log(`   ✅ Diagram saved to: ${savedPath}`)
    
    console.log('\n3️⃣  Testing instance with current state highlighting')
    const orderInstance = orderMachine.start()
    console.log(`   Current state: ${orderInstance.current}`)
    
    // Show initial state highlighting
    console.log('   Opening instance preview (current state highlighted)...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    await orderInstance.visualizer().preview()
    
    console.log('   💡 Notice the blue highlighting on the "idle" state!')
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('\n4️⃣  Simulating order flow with state transitions')
    
    // Place order
    console.log('   📦 Placing order...')
    await orderInstance.send('PLACE_ORDER')
    console.log(`   Current state: ${orderInstance.current}`)
    
    // Validation success
    console.log('   ✅ Validation successful...')
    await orderInstance.send('VALIDATION_SUCCESS')
    console.log(`   Current state: ${orderInstance.current}`)
    
    // Authorization success
    console.log('   💳 Authorization successful...')
    await orderInstance.send('AUTH_SUCCESS')
    console.log(`   Current state: ${orderInstance.current}`)
    
    // Capture success
    console.log('   💰 Payment captured...')
    await orderInstance.send('CAPTURE_SUCCESS')
    console.log(`   Current state: ${orderInstance.current}`)
    
    // Proceed to fulfillment
    console.log('   📋 Proceeding to fulfillment...')
    await orderInstance.send('PROCEED_TO_FULFILLMENT')
    console.log(`   Current state: ${orderInstance.current}`)
    
    console.log('\n   🎯 Opening final state preview...')
    await orderInstance.visualizer().preview()
    console.log('   💡 Notice how the current state highlighting moved to "packaging"!')
    
    // Save final state
    const finalStatePath = await orderInstance.visualizer().save('ecommerce-order-final-state.mmd')
    console.log(`   📁 Final state saved to: ${finalStatePath}`)
    
    console.log('\n🎉 Demo Complete!')
    console.log('✨ Key features demonstrated:')
    console.log('  • Complex hierarchical state machine visualization')
    console.log('  • Browser preview with automatic HTML generation')
    console.log('  • File export to .mmd format')
    console.log('  • Current state highlighting in instances')
    console.log('  • Dynamic state updates during transitions')
    
  } catch (error) {
    console.error('❌ Demo error:', error.message)
    console.log('💡 This might be expected in headless environments')
  }
}

// Run the demo
demonstrateVisualizerAPI().then(() => {
  console.log('\n🔚 Demo finished. Check your browser and generated .mmd files!')
}).catch(error => {
  console.error('Demo failed:', error)
})