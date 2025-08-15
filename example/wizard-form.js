import { createMachine, assign } from '../src/index.js';

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

const runExample = async () => {
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

            console.log('Submitting form data:', formData);
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            wizardMachine.send('SUCCESS');
          } catch (error) {
            wizardMachine.send('ERROR', { error: error.message });
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

  // Usage demonstration
  console.log('Multi-Step Wizard Form Example:');
  console.log('Initial state:', wizardMachine.state);
  console.log('Current step:', wizardMachine.context.currentStep);

  // Step 1: Personal info
  console.log('\n--- Step 1: Personal Information ---');
  await wizardMachine.send('UPDATE_STEP1', { data: { name: 'John Doe', email: 'john@example.com' } });
  console.log('Step 1 data:', wizardMachine.context.step1Data);

  await wizardMachine.send('NEXT');
  console.log('After validation - Current step:', wizardMachine.context.currentStep);

  // Step 2: Address info
  console.log('\n--- Step 2: Address Information ---');
  await wizardMachine.send('UPDATE_STEP2', {
    data: { address: '123 Main St', city: 'Anytown', zipCode: '12345' }
  });
  console.log('Step 2 data:', wizardMachine.context.step2Data);

  await wizardMachine.send('NEXT');
  console.log('After validation - Current step:', wizardMachine.context.currentStep);

  // Step 3: Payment info
  console.log('\n--- Step 3: Payment Information ---');
  await wizardMachine.send('UPDATE_STEP3', {
    data: { cardNumber: '4111111111111111', expiryDate: '12/25', cvv: '123' }
  });
  console.log('Step 3 data:', wizardMachine.context.step3Data);

  await wizardMachine.send('SUBMIT');
  console.log('After submission - Final state:', wizardMachine.state);

  // Test validation error
  console.log('\n--- Testing Validation Errors ---');
  await wizardMachine.send('RESET');
  await wizardMachine.send('UPDATE_STEP1', { data: { name: '', email: 'invalid-email' } });
  await wizardMachine.send('NEXT');
  console.log('Validation errors:', wizardMachine.context.errors);
};

runExample().catch(console.error);