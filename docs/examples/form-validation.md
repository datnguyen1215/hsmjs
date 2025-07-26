# Form Validation Example

A form submission flow with validation, error handling, and async submission.

## State Diagram

```
                  ┌─────────┐
                  │ editing │
                  └────┬────┘
                       │ SUBMIT
                       ▼
                  ┌───────────┐
                  │validating │
                  └─────┬─────┘
                    ▼       ▼
              VALID │       │ INVALID
                    ▼       ▼
              ┌──────────┐  │
              │submitting│  │
              └────┬─────┘  │
                ▼     ▼     │
          SUCCESS│    │ERROR│
                ▼     ▼     ▼
           ┌────────┐ ┌─────┐
           │success │ │error│
           └────────┘ └─────┘
```

## Basic Form Validation

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('form');

// Define states
const editing = machine.state('editing');
const validating = machine.state('validating');
const submitting = machine.state('submitting');
const success = machine.state('success');
const error = machine.state('error');

// Validation action
const validateForm = action('validateForm', (ctx, event) => {
  const errors = [];
  const { email, password } = event.data;
  
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }
  
  ctx.errors = errors;
  ctx.formData = event.data;
  
  return { valid: errors.length === 0, errors };
});

// Define transitions
editing
  .on('SUBMIT', validating)
  .do(validateForm);

// Auto-transition based on validation result
validating
  .enter((ctx) => {
    // Automatically proceed based on validation
    setTimeout(() => {
      const event = ctx.errors.length === 0 ? 'VALID' : 'INVALID';
      ctx.instance.send(event);
    }, 0);
  })
  .on('VALID', submitting)
  .on('INVALID', editing);

// Handle submission
submitting
  .on('SUCCESS', success)
    .doAsync(async (ctx) => {
      const response = await api.submitForm(ctx.formData);
      ctx.submissionId = response.id;
      return { id: response.id };
    })
  .on('ERROR', error)
    .do((ctx, event) => {
      ctx.errorMessage = event.error.message;
    });

// Allow retry from error state
error.on('RETRY', editing);
success.on('NEW_FORM', editing);

machine.initial(editing);

// Usage
const form = machine.start({ 
  errors: [], 
  formData: null,
  instance: null // Will be set after creation
});

form.context.instance = form;

// Submit form
await form.send('SUBMIT', {
  data: {
    email: 'user@example.com',
    password: 'securepassword123'
  }
});
```

## Advanced Form with Field-Level Validation

```javascript
import { createMachine, action } from 'hsm';

const machine = createMachine('advanced-form');

// States
const idle = machine.state('idle');
const validating = machine.state('validating');
const submitting = machine.state('submitting');
const success = machine.state('success');
const error = machine.state('error');

// Validation substates
const validateEmail = validating.state('email');
const validatePassword = validating.state('password');
const validateTerms = validating.state('terms');
const validationComplete = validating.state('complete');

validating.initial(validateEmail);

// Field validators
const validators = {
  email: action('validateEmail', async (ctx) => {
    const email = ctx.formData.email;
    
    if (!email) {
      ctx.errors.email = 'Email is required';
      return { valid: false };
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      ctx.errors.email = 'Invalid email format';
      return { valid: false };
    }
    
    // Check if email exists (async validation)
    const exists = await api.checkEmailExists(email);
    if (exists) {
      ctx.errors.email = 'Email already registered';
      return { valid: false };
    }
    
    delete ctx.errors.email;
    return { valid: true };
  }),
  
  password: action('validatePassword', (ctx) => {
    const password = ctx.formData.password;
    const confirmPassword = ctx.formData.confirmPassword;
    
    if (!password) {
      ctx.errors.password = 'Password is required';
      return { valid: false };
    }
    
    if (password.length < 8) {
      ctx.errors.password = 'Password must be at least 8 characters';
      return { valid: false };
    }
    
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      ctx.errors.password = 'Password must contain uppercase and numbers';
      return { valid: false };
    }
    
    if (password !== confirmPassword) {
      ctx.errors.confirmPassword = 'Passwords do not match';
      return { valid: false };
    }
    
    delete ctx.errors.password;
    delete ctx.errors.confirmPassword;
    return { valid: true };
  }),
  
  terms: action('validateTerms', (ctx) => {
    if (!ctx.formData.acceptTerms) {
      ctx.errors.terms = 'You must accept the terms and conditions';
      return { valid: false };
    }
    
    delete ctx.errors.terms;
    return { valid: true };
  })
};

// Validation transitions
validateEmail
  .enter(validators.email)
  .on('NEXT', validatePassword);

validatePassword
  .enter(validators.password)
  .on('NEXT', validateTerms);

validateTerms
  .enter(validators.terms)
  .on('NEXT', validationComplete);

validationComplete
  .enter((ctx) => {
    const hasErrors = Object.keys(ctx.errors).length > 0;
    setTimeout(() => {
      ctx.instance.send(hasErrors ? 'INVALID' : 'VALID');
    }, 0);
  });

// Main transitions
idle
  .on('SUBMIT', validating)
  .do((ctx, event) => {
    ctx.formData = event.data;
    ctx.errors = {};
  });

validating
  .on('VALID', submitting)
  .on('INVALID', idle)
    .do((ctx) => {
      ctx.showErrors = true;
    });

// Submission with retry logic
submitting
  .enter((ctx) => {
    ctx.retryCount = 0;
    ctx.maxRetries = 3;
  })
  .on('SUCCESS', success)
    .doAsync(async (ctx) => {
      try {
        const result = await api.submitForm(ctx.formData);
        return { confirmationNumber: result.confirmationNumber };
      } catch (error) {
        if (ctx.retryCount < ctx.maxRetries) {
          ctx.retryCount++;
          throw new Error(`Submission failed, retry ${ctx.retryCount}/${ctx.maxRetries}`);
        }
        throw error;
      }
    })
  .on('ERROR', error);

machine.initial(idle);

// Usage with field updates
const form = machine.start({ errors: {}, formData: {}, showErrors: false });
form.context.instance = form;

// Real-time field validation
const validateField = async (fieldName, value) => {
  form.context.formData[fieldName] = value;
  
  if (fieldName === 'email' && value.includes('@')) {
    const result = await validators.email(form.context);
    updateFieldError('email', form.context.errors.email);
  }
};
```

## Form with Progress Tracking

```javascript
const machine = createMachine('wizard-form');

// Multi-step form states
const steps = machine.state('steps');
const personalInfo = steps.state('personalInfo');
const addressInfo = steps.state('addressInfo');
const paymentInfo = steps.state('paymentInfo');
const review = steps.state('review');

steps.initial(personalInfo);

// Progress tracking
const updateProgress = action('updateProgress', (ctx) => {
  const totalSteps = 4;
  const currentStep = {
    'steps.personalInfo': 1,
    'steps.addressInfo': 2,
    'steps.paymentInfo': 3,
    'steps.review': 4
  }[ctx.instance.current] || 0;
  
  ctx.progress = {
    current: currentStep,
    total: totalSteps,
    percentage: (currentStep / totalSteps) * 100,
    canGoBack: currentStep > 1,
    canGoNext: currentStep < totalSteps
  };
});

// Add progress tracking to each step
[personalInfo, addressInfo, paymentInfo, review].forEach(state => {
  state.enter(updateProgress);
});

// Step transitions with validation
personalInfo
  .on('NEXT', addressInfo)
    .if((ctx) => ctx.personalData?.firstName && ctx.personalData?.email)
  .on('SAVE_DRAFT', '^.^.drafts');

addressInfo
  .on('BACK', personalInfo)
  .on('NEXT', paymentInfo)
    .if((ctx) => ctx.addressData?.street && ctx.addressData?.city);

paymentInfo
  .on('BACK', addressInfo)
  .on('NEXT', review)
    .if((ctx) => ctx.paymentData?.cardNumber);

review
  .on('BACK', paymentInfo)
  .on('SUBMIT', '^.^.submitting');

// Form-wide states
const drafts = machine.state('drafts');
const submitting = machine.state('submitting');
const complete = machine.state('complete');

// Save draft functionality
machine
  .on('SAVE_DRAFT', drafts)
  .doAsync(async (ctx) => {
    const draftId = await api.saveDraft({
      personal: ctx.personalData,
      address: ctx.addressData,
      payment: ctx.paymentData,
      step: ctx.progress.current
    });
    ctx.draftId = draftId;
    return { draftId };
  });

// Load draft
drafts
  .on('RESUME', (ctx) => {
    const stepMap = {
      1: 'steps.personalInfo',
      2: 'steps.addressInfo',
      3: 'steps.paymentInfo',
      4: 'steps.review'
    };
    return stepMap[ctx.draftStep] || 'steps.personalInfo';
  });
```

## Key Concepts Demonstrated

- Multi-state form flow
- Synchronous and asynchronous validation
- Error handling and display
- Retry logic
- Field-level validation
- Progress tracking
- Draft saving/loading
- Nested states for complex forms
- Guard conditions
- Auto-transitions based on validation results