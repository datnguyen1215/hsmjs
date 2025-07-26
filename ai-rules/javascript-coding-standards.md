# JavaScript Coding Standards

## Overview

This document extends the [general coding standards](.airules/coding-standards.md) with JavaScript-specific requirements. All general principles of **simplicity over cleverness**, **clarity over brevity**, and **readability over performance** apply.

**JavaScript + JSDoc only. No TypeScript.**

---

## 1. Syntax Requirements

### Arrow Functions Only
- Use arrow functions consistently throughout the codebase
- Provides consistent syntax and lexical `this` binding
- Enhances readability and reduces cognitive load

**Good:**
```javascript
const calculateTotal = (items) => {
	return items.reduce((sum, item) => sum + item.price, 0);
};

const processUser = (user) => {
	if (!user) {
		return null;
	}
	return user.name.toUpperCase();
};
```

**Avoid:**
```javascript
function calculateTotal(items) {
	return items.reduce(function(sum, item) {
		return sum + item.price;
	}, 0);
}
```

### Formatting
- Follow the project's `.prettierrc` configuration
- Ensure blank lines contain no trailing spaces
- Maintain consistent indentation as defined in project settings

---

## 2. Functional Programming Over Classes

### Prefer Composition Over Inheritance
- Use functional composition patterns
- Avoid classes unless absolutely necessary
- Create small, composable functions

**Good:**
```javascript
/**
 * Create a user validator with custom rules
 */
const createUserValidator = (rules) => (user) => {
	return rules.every((rule) => rule(user));
};

/**
 * Validate user email format
 */
const validateEmail = (user) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(user.email);
};

/**
 * Validate user age requirement
 */
const validateAge = (user) => user.age >= 18;

// Usage
const userValidator = createUserValidator([validateEmail, validateAge]);
const isValid = userValidator(userData);
```

**Avoid:**
```javascript
class UserValidator {
	constructor(rules) {
		this.rules = rules;
	}
	
	validate(user) {
		return this.rules.every(rule => rule(user));
	}
}
```

### Pure Functions
- Functions should not have side effects when possible
- Return new data instead of mutating existing data
- Make functions predictable and testable

**Good:**
```javascript
/**
 * Add item to cart and return new cart
 */
const addToCart = (cart, item) => {
	return [...cart, item];
};

/**
 * Update user status and return new user object
 */
const updateUserStatus = (user, status) => {
	return { ...user, status };
};
```

---

## 3. File Organization

### Single Purpose Files
- **CRITICAL: Keep files under 200 lines - NO EXCEPTIONS**
- Target 100-150 lines per file
- Each file should have one clear responsibility
- Use descriptive filenames that indicate purpose

### Feature-Based Organization
- **CRITICAL: Organize by feature, not file type**
- Group all related feature code in one folder
- Make features self-contained and easy to find

**Good feature-based structure:**
```
features/
├── auth/
│   ├── login-handler.js      (< 150 lines)
│   ├── session-manager.js    (< 150 lines)
│   ├── auth-validation.js    (< 150 lines)
│   └── index.js             (barrel exports)
├── product-catalog/
│   ├── product-search.js     (< 150 lines)
│   ├── product-filter.js     (< 150 lines)
│   ├── product-display.js    (< 150 lines)
│   └── index.js
└── checkout/
    ├── cart-calculator.js    (< 150 lines)
    ├── payment-processor.js  (< 150 lines)
    ├── order-creator.js      (< 150 lines)
    └── index.js
```

### File Header Documentation
- Every file must start with a brief description
- Explain the file's purpose and main exports
- Keep descriptions concise and focused

**Good:**
```javascript
/**
 * User validation utilities
 * Provides functions for validating user input and data integrity
 */

/**
 * Validate email address format
 */
const validateEmail = (email) => {
	// implementation
};
```

### Modular Exports
- Use named exports for better tree-shaking
- Export functions individually for clarity
- Avoid default exports unless exporting a single main function

**Good:**
```javascript
export const validateEmail = (email) => { /* ... */ };
export const validatePhone = (phone) => { /* ... */ };
export const validateAge = (age) => { /* ... */ };
```

**Avoid:**
```javascript
export default {
	validateEmail,
	validatePhone,
	validateAge
};
```

---

## 4. JSDoc Documentation

### Required Documentation
- Every function must have a short description
- Include essential tags only: `@param`, `@throws`, `@returns`
- Only include `@returns` when the exact type is certain
- Exclude `@author`, `@file`, and `@module` tags

**Good:**
```javascript
/**
 * Calculate total price with tax
 * @param {number} price - Base price
 * @param {number} taxRate - Tax rate as decimal
 * @returns {number} Total price including tax
 */
const calculateTotalPrice = (price, taxRate) => {
	return price * (1 + taxRate);
};

/**
 * Validate user permissions for resource access
 * @param {Object} user - User object
 * @param {string} resource - Resource identifier
 * @throws {Error} When user lacks required permissions
 */
const validatePermissions = (user, resource) => {
	if (!user.permissions.includes(resource)) {
		throw new Error(`Access denied for resource: ${resource}`);
	}
};
```

**Avoid unnecessary tags:**
```javascript
/**
 * @file user-utils.js
 * @author John Doe
 * @module UserUtils
 * @since 1.0.0
 * @deprecated Use new validation system
 */
```

---

## 5. Module Imports and Exports

### Static Imports Preferred
- Use static imports for better bundling and tree-shaking
- Dynamic imports only when truly necessary (lazy loading, conditional loading)
- Group imports logically with clear separation

**Good:**
```javascript
// External dependencies
import { format } from 'date-fns';
import { debounce } from 'lodash-es';

// Internal modules
import { validateEmail } from './validation.js';
import { formatCurrency } from './formatting.js';
import { apiRequest } from './api.js';
```

**Dynamic imports only when necessary:**
```javascript
/**
 * Load heavy chart library only when needed
 */
const loadChartLibrary = async () => {
	const { Chart } = await import('./chart-library.js');
	return Chart;
};
```

### Clear Export Patterns
- Use descriptive names for exports
- Group related functions in the same file
- Maintain consistent naming conventions

---

## 6. Error Handling

### Functional Error Handling
- Use explicit error handling over try-catch when possible
- Return error objects or use Result patterns
- Make error states predictable and handleable

**Good:**
```javascript
/**
 * Parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @returns {Object} Result object with data or error
 */
const parseJSON = (jsonString) => {
	try {
		const data = JSON.parse(jsonString);
		return { success: true, data };
	} catch (error) {
		return { success: false, error: error.message };
	}
};

/**
 * Validate and process user data
 * @param {Object} userData - Raw user data
 * @returns {Object} Processing result
 */
const processUserData = (userData) => {
	const validationResult = validateUser(userData);
	if (!validationResult.success) {
		return validationResult;
	}
	
	const processedData = transformUserData(validationResult.data);
	return { success: true, data: processedData };
};
```

### Early Returns for Error Cases
- Handle error conditions first
- Reduce nesting with early returns
- Make the happy path clear and prominent

**Good:**
```javascript
/**
 * Process payment with validation
 * @param {Object} paymentData - Payment information
 * @returns {Object} Payment result
 */
const processPayment = (paymentData) => {
	if (!paymentData) {
		return { success: false, error: 'Payment data required' };
	}
	
	if (!paymentData.amount || paymentData.amount <= 0) {
		return { success: false, error: 'Valid amount required' };
	}
	
	if (!paymentData.method) {
		return { success: false, error: 'Payment method required' };
	}
	
	// Happy path - process the payment
	const result = chargePayment(paymentData);
	return { success: true, data: result };
};
```

---

## 7. CRITICAL SIZE LIMITS (JavaScript Specific)

### Function Size Requirements
- **HARD LIMIT: 50 lines per function**
- **Target: 10-20 lines per function**
- Break complex logic into smaller functions
- Use function composition for complex operations

**Good - Small focused functions:**
```javascript
/**
 * Calculate order total with discounts
 */
const calculateOrderTotal = (items, discounts) => {
    const subtotal = calculateSubtotal(items);
    const discount = calculateTotalDiscount(subtotal, discounts);
    const tax = calculateTax(subtotal - discount);
    return subtotal - discount + tax;
};

/**
 * Calculate subtotal from items
 */
const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

/**
 * Calculate total discount amount
 */
const calculateTotalDiscount = (subtotal, discounts) => {
    return discounts.reduce((total, discount) => {
        return total + applyDiscount(subtotal, discount);
    }, 0);
};
```

**Bad - Function too long:**
```javascript
// NEVER write functions this long!
const processOrder = (orderData) => {
    // 60+ lines of code mixing validation, calculation, 
    // API calls, error handling, etc.
    // This MUST be broken down immediately!
};
```

## 8. Key JavaScript Guidelines

1. **Functions under 50 lines** - NO EXCEPTIONS
2. **Files under 200 lines** - Split immediately when approaching
3. **Feature-based folders** - Group related code together
4. **Arrow functions only** for consistency and clarity
5. **Functional composition** over class inheritance
6. **Static imports** unless dynamic loading is truly necessary
7. **Pure functions** when possible for predictability
8. **Explicit error handling** with clear return patterns
9. **Minimal JSDoc** with essential information only
10. **Follow project's Prettier** configuration for formatting

---

## Summary

JavaScript code should be:
- **Small** - Functions under 50 lines, files under 200 lines
- **Organized** - Feature-based folders keeping related code together
- **Functional** - Prefer composition and pure functions
- **Modular** - Focused files with clear exports
- **Documented** - Essential JSDoc comments on all functions
- **Consistent** - Arrow functions and formatting standards
- **Predictable** - Explicit error handling and clear data flow

Remember: Write JavaScript that tells a clear story of what the code does and why it exists.

**ENFORCE SIZE LIMITS STRICTLY - NO EXCEPTIONS**