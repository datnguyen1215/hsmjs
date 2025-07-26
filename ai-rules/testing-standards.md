# Testing Standards

## Overview

This document extends the [JavaScript coding standards](.airules/javascript-coding-standards.md) and [general coding standards](.airules/coding-standards.md) with testing-specific requirements. All general principles of **simplicity over cleverness**, **clarity over brevity**, and **readability over performance** apply.

**Integration tests only. Avoid unit tests. Test the system as a whole.**

---

## 1. Core Testing Principles

### CRITICAL: Granular Test Steps
- **One assertion per test case - NO EXCEPTIONS**
- Each test should verify exactly one thing
- Break complex workflows into individual test steps
- Make failure points immediately obvious

**Good - Granular Tests:**
```javascript
describe('Login Page', () => {
  it('should load the page', async () => {
    await driver.get(BASE_URL);
    expect(await driver.getTitle()).toBe('Login');
  });
  
  it('should display username input', async () => {
    const usernameInput = await driver.findElement(By.id('username'));
    expect(await usernameInput.isDisplayed()).toBe(true);
  });
  
  it('should display password input', async () => {
    const passwordInput = await driver.findElement(By.id('password'));
    expect(await passwordInput.isDisplayed()).toBe(true);
  });
  
  it('should display login button', async () => {
    const loginButton = await driver.findElement(By.id('login-btn'));
    expect(await loginButton.isDisplayed()).toBe(true);
  });
});
```

**Bad - Combined Tests:**
```javascript
// NEVER do this!
it('should have all login elements', async () => {
  await driver.get(BASE_URL);
  expect(await driver.getTitle()).toBe('Login');
  expect(await driver.findElement(By.id('username'))).toBeTruthy();
  expect(await driver.findElement(By.id('password'))).toBeTruthy();
  expect(await driver.findElement(By.id('login-btn'))).toBeTruthy();
});
```

### Integration-First Approach
- Focus on testing complete user workflows, not isolated functions
- Test how components work together in realistic scenarios
- Verify the entire feature flow from user interaction to final result
- Avoid testing implementation details or internal component state

### Test Suite Reusability
- Create reusable test patterns for common workflows
- Avoid repetitive setup and teardown across test files
- Build upon previous test steps instead of starting fresh each time
- Share test utilities and helper functions across test suites

### Minimal but Effective Testing
- Write only the tests necessary to ensure features work correctly
- Focus on critical user paths and error scenarios
- Avoid excessive test coverage for the sake of metrics
- Prioritize tests that catch real bugs over theoretical edge cases

### Debuggable Test Structure
- **CRITICAL: One test = one check**
- Structure tests as clear, sequential steps
- Make test failures pinpoint exact issues
- Use descriptive test names that explain what is being verified

---

## 2. Testing Framework Requirements

### Jest Setup for API Integration Tests
- Use Jest as the primary test runner and assertion library
- Focus on API integration tests that test against running server
- Use minimal Jest configuration without framework-specific transforms
- Assume the development server is already running on default port
- Tests should be framework-agnostic and only test HTTP endpoints

### Test Environment Configuration  
- Use Node.js environment for API integration tests (default Jest environment)
- No framework transformations or build tools required
- Use native Node.js fetch() for HTTP requests (available in Node.js 18+)
- Use real data and services whenever possible
- Only mock external dependencies when absolutely necessary
- Tests should run without any frontend build process

### Server Assumptions
- Never start or stop the development server in tests
- Assume server is running on localhost with default port
- Use environment variables to configure test endpoints
- Mock all external API calls to avoid server dependencies

---

## 3. File Organization and Naming

### CRITICAL: Test File Size Limits
- **HARD LIMIT: 200 lines per test file**
- **Target: 100-150 lines per test file**
- Split test files IMMEDIATELY when approaching limit
- One feature aspect = one test file

### Feature-Based Test Organization
- **CRITICAL: Organize tests by feature, not by file type**
- Create feature folders to group related tests
- Keep each test file focused on specific functionality
- Make tests easy to find and maintain

**Good Test Structure:**
```
tests/
├── features/
│   ├── auth/
│   │   ├── login-form.test.js        (< 150 lines)
│   │   ├── login-validation.test.js  (< 150 lines)
│   │   ├── logout-flow.test.js       (< 150 lines)
│   │   └── session-timeout.test.js   (< 150 lines)
│   ├── resume-upload/
│   │   ├── file-selection.test.js    (< 150 lines)
│   │   ├── file-validation.test.js   (< 150 lines)
│   │   ├── upload-progress.test.js   (< 150 lines)
│   │   └── upload-errors.test.js     (< 150 lines)
│   └── job-matching/
│       ├── match-display.test.js     (< 150 lines)
│       ├── filter-options.test.js    (< 150 lines)
│       └── match-scoring.test.js     (< 150 lines)
└── mock/
    └── test-data/
```

### Test File Structure
- Place all tests in a `tests/` directory at the project root
- Create a `mock/` directory within `tests/` for test data and utilities
- Use feature-based structure, NOT source code structure
- Use descriptive directory names that match feature areas
- Group related test files together by functionality

### Independent Test Project Structure
- **tests/** should be a completely separate project with its own package.json
- Tests should have zero dependencies on frontend build tools or frameworks
- Use minimal Jest configuration: `export default {}` (let Jest use defaults)
- Install only test-specific dependencies in the tests project
- Frontend package.json should contain NO test-related dependencies
- Tests should use native Node.js APIs (fetch, crypto, etc.) instead of external libraries
- Run tests from tests directory: `cd tests/ && npm test`

### Mock Directory Organization
- Place all test data, setup, and teardown functions in `tests/mock/`
- Organize mock directory by feature or data type
- Use real data files whenever possible instead of generated mock data
- Create reusable setup and teardown functions for common test scenarios
```

### Test File Naming Conventions
- Use `.test.js` suffix for all test files
- Name test files after the feature or component being tested
- Use kebab-case for test file names
- Include the word "workflow" for end-to-end feature tests

### Test Case Naming Standards
- Use descriptive test names that explain the scenario being tested
- Start test names with action verbs when testing user interactions
- Include expected outcomes in test descriptions
- Use "should" or "can" to describe expected behavior

---

## 4. Test Granularity Requirements

### CRITICAL: One Assertion Rule
- **Each test case must have exactly ONE assertion**
- **NO combining multiple checks in a single test**
- Test name must describe the ONE thing being tested
- Failure should immediately identify the exact issue

### Granular Workflow Testing
**Good - Step-by-Step Workflow:**
```javascript
describe('User Registration Flow', () => {
  describe('Registration Page Load', () => {
    it('should load registration page', async () => {
      await driver.get(`${BASE_URL}/register`);
      expect(await driver.getCurrentUrl()).toContain('/register');
    });
    
    it('should display page title', async () => {
      const title = await driver.findElement(By.tagName('h1'));
      expect(await title.getText()).toBe('Create Account');
    });
  });
  
  describe('Form Elements', () => {
    it('should display email input', async () => {
      const email = await driver.findElement(By.id('email'));
      expect(await email.isDisplayed()).toBe(true);
    });
    
    it('should display password input', async () => {
      const password = await driver.findElement(By.id('password'));
      expect(await password.isDisplayed()).toBe(true);
    });
    
    it('should display submit button', async () => {
      const submit = await driver.findElement(By.id('submit'));
      expect(await submit.isDisplayed()).toBe(true);
    });
  });
  
  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      await driver.findElement(By.id('submit')).click();
      const error = await driver.findElement(By.id('email-error'));
      expect(await error.getText()).toBe('Email is required');
    });
  });
});
```

**Bad - Combined Assertions:**
```javascript
// NEVER DO THIS!
it('should validate form', async () => {
  await driver.get(`${BASE_URL}/register`);
  // Multiple assertions in one test - FORBIDDEN
  expect(await driver.findElement(By.id('email'))).toBeTruthy();
  expect(await driver.findElement(By.id('password'))).toBeTruthy();
  expect(await driver.findElement(By.id('submit'))).toBeTruthy();
  await driver.findElement(By.id('submit')).click();
  expect(await driver.findElement(By.id('error'))).toBeTruthy();
});
```

### Test Naming for Granularity
- Start with "should" for expected behavior
- Be specific about what ONE thing is tested
- Include context in the test name
- Make failures self-documenting

**Good Test Names:**
- `should display login button`
- `should show error message for invalid email`
- `should navigate to dashboard after login`
- `should disable submit button while loading`

**Bad Test Names:**
- `should work correctly` (too vague)
- `should validate and submit form` (multiple actions)
- `test login` (not descriptive)
- `should display all elements` (multiple checks)

---

## 5. Test Suite Organization and Reusability

### Reusable Test Patterns
- Create shared setup functions for common test scenarios
- Build test suites that can be extended for different use cases
- Use helper functions to reduce code duplication
- Establish consistent patterns for similar test types

### Sequential Test Building
- Build test suites that progress through user workflows step by step
- Reuse previous test setup in subsequent test cases
- Avoid tearing down and rebuilding the same state repeatedly
- Create logical test progression that mirrors user experience

### Shared Test Utilities
- Create utility functions for common test operations
- Share mock data and fixtures across test files
- Build reusable component rendering helpers
- Establish consistent patterns for user event simulation

---

## 5. Setup and Teardown Best Practices

### Mock Directory Setup Functions
- Create setup functions in `tests/mock/` for each test scenario
- Use real data files stored in the mock directory structure
- Setup functions should prepare actual test data, not generate fake data
- Keep setup functions focused on single responsibilities

### Teardown and Cleanup Patterns
- Create corresponding teardown functions for each setup function
- Clean up any real data or state changes made during tests
- Use teardown functions to reset databases or file systems to clean state
- Ensure teardown runs even when tests fail

### Real Data Management
- Store actual resume files, job descriptions, and API responses in mock directory
- Use setup functions to copy real data to test locations
- Use teardown functions to remove test data and restore clean state
- Track all resources created during setup for proper cleanup

### Resource Lifecycle Management
- Document what each setup function creates and what teardown removes
- Use consistent naming patterns for setup and teardown function pairs
- Handle both successful test completion and test failure scenarios
- Avoid leaving test artifacts that could affect subsequent test runs

---

## 6. User Workflow Testing Guidelines

### Complete User Journey Testing
- Test entire user workflows from start to finish
- Include navigation between different pages and components
- Verify data persistence across workflow steps
- Test both happy path and error scenarios

### Realistic User Interactions
- Use realistic timing for user interactions
- Test with actual file uploads and form submissions
- Include keyboard navigation and accessibility testing
- Simulate real user behavior patterns

### Cross-Component Integration
- Test how different components communicate with each other
- Verify prop passing and event handling between components
- Test state management across component boundaries
- Ensure consistent behavior across the entire application

### Error Scenario Coverage
- Test error handling at each step of user workflows
- Verify graceful degradation when services are unavailable
- Test recovery from error states
- Ensure error messages are user-friendly and actionable

---

## 7. Real Data and Minimal Mocking

### Real Data First Approach
- Use real data and actual services whenever possible
- Only mock external dependencies when absolutely necessary
- Prefer integration with actual APIs over mocked responses
- Use real file uploads and form submissions in tests

### When Mocking is Necessary
- Mock only when external services are unreliable or unavailable
- Mock third-party APIs that require authentication or payment
- Mock services that would cause side effects (emails, payments, etc.)
- Mock only at the boundary level, never internal application logic

### Mock Directory Structure
- Place all mock-related files in `tests/mock/` directory
- Organize by feature: `tests/mock/resume-analysis/`, `tests/mock/file-upload/`
- Include setup and teardown functions for each mock scenario
- Store real data files that can be used across multiple tests

### Mock Data Management
- Use actual production-like data in mock files
- Store real resume files, job descriptions, and API responses
- Create setup functions that prepare real test data
- Create teardown functions that clean up test data after use
- Keep mock data synchronized with actual API schemas

---

## 8. Debugging and Error Handling
## 9. Test Execution Strategy

### Targeted Test Execution
- Run only specific tests during development and debugging
- Use Jest's pattern matching to run targeted test suites
- Only run full test suite after completing feature development
- Focus on the specific functionality being developed or debugged

### Test Execution Workflow
- Start with targeted tests for the specific feature being worked on
- Run related component tests to ensure integration works
- Run workflow tests that include the modified functionality
- Only run complete test suite when ready to verify entire system

### Jest Command Patterns for Targeted Testing
- Run specific test file during development
- Run tests matching a pattern for related functionality
- Run tests in watch mode for continuous feedback during development
- Use describe block filtering for granular test execution

### Full Test Suite Execution
- Run complete test suite only after targeted tests pass
- Use full suite execution for final verification before commits
- Run full suite in CI/CD pipeline for comprehensive validation
- Schedule full suite runs for regression testing

---

### Test Failure Diagnosis
- Write tests that fail with clear, actionable error messages
- Include relevant context in test assertions
- Use descriptive variable names in test setup
- Structure tests to isolate failure points

### Debugging Tools and Techniques
- Use screen.debug() to inspect DOM state during test failures
- Add console.log statements strategically for debugging
- Use Jest's --verbose flag for detailed test output
- Take advantage of Testing Library's query debugging features

### Error Recovery Patterns
- Test error boundaries and fallback components
- Verify error state cleanup and recovery
- Test user actions that should clear error states
- Ensure errors don't cascade to unrelated components

### Test Maintenance Strategies
- Keep tests simple to reduce maintenance burden
- Update tests when component interfaces change
- Remove obsolete tests that no longer provide value
- Refactor tests to improve clarity and maintainability

---

## 9. Performance and Efficiency

### Test Execution Optimization
- Group related tests to minimize setup overhead
- Use beforeAll and afterAll hooks efficiently
- Avoid unnecessary DOM queries and operations
- Keep test suites focused and fast-running

### Resource Usage Guidelines
- Minimize memory usage in test setup
- Clean up event listeners and subscriptions
- Avoid creating unnecessary DOM elements
- Use efficient selectors for element queries

### Parallel Test Execution
- Structure tests to run independently
- Avoid shared state between test files
- Use Jest's parallel execution capabilities
- Isolate tests that require specific timing

---

## 10. Accessibility Testing Integration

### Accessibility Standards in Tests
- Include basic accessibility checks in integration tests
- Test keyboard navigation paths
- Verify ARIA labels and roles are present
- Ensure proper focus management

### Screen Reader Compatibility
- Test that important content is accessible to screen readers
- Verify form labels are properly associated
- Test dynamic content announcements
- Include alt text verification for images

### Keyboard Navigation Testing
- Test all interactive elements with keyboard navigation
- Verify tab order is logical and complete
- Test escape key functionality for modals and overlays
- Ensure focus indicators are visible and appropriate

---

## Key Testing Guidelines Summary

1. **ONE ASSERTION PER TEST** - Each test verifies exactly ONE thing - NO EXCEPTIONS
2. **Granular Test Steps** - Break workflows into individual checks (page load → button 1 → button 2 → text → done)
3. **Small Test Files** - Keep test files under 200 lines, split by feature aspect
4. **Feature-Based Organization** - Group tests by feature in logical folders
5. **Integration Focus** - Test complete user workflows, not isolated units
6. **Real Data First** - Use actual data and services, avoid mocking unless necessary
7. **Independent Test Project** - Separate tests project with own package.json and minimal dependencies
8. **Targeted Execution** - Run specific tests during development, full suite only when complete
9. **Descriptive Test Names** - Each name describes the ONE thing being tested
10. **Proper Cleanup** - Use teardown functions to maintain clean test state

**ENFORCE GRANULARITY STRICTLY - NO COMBINED ASSERTIONS**

---

## 11. Selenium Browser Testing Guidelines

### Selenium Test Organization
- Place all Selenium tests in `tests/selenium/` directory
- Use separate directory structure from API integration tests
- Follow Jest integration with proper test configuration
- Use descriptive test file names ending with `.test.js`

### Page Load Optimization
- **Minimize page reloads** - Group related tests to share single page load
- Use nested `describe()` blocks to organize test groups by page load requirements
- Load page once in `beforeAll()` for element verification tests
- Only reload page when testing navigation or when fresh state is required

### Test Structure Pattern
```javascript
describe('Page Name', () => {
  let driver;
  
  beforeAll(() => {
    // Initialize driver once
  });
  
  describe('Page Elements', () => {
    beforeAll(async () => {
      await driver.get(BASE_URL);
      // Wait for page to be ready
    });
    
    it('should display specific element', () => {
      // Test individual elements - no page reload
    });
  });
  
  describe('Navigation', () => {
    it('should navigate correctly', async () => {
      await driver.get(BASE_URL); // Fresh page load for navigation
      // Test navigation behavior
    });
  });
});
```

### CRITICAL: Granular Test Cases
- **ONE element/check per test case - NO EXCEPTIONS**
- **NEVER combine multiple assertions in one test**
- Each test must verify exactly ONE thing
- Test names must describe the ONE specific check

**Example of Required Granularity:**
```javascript
describe('Homepage Elements', () => {
  it('should display logo', async () => {
    const logo = await driver.findElement(By.className('logo'));
    expect(await logo.isDisplayed()).toBe(true);
  });
  
  it('should display navigation menu', async () => {
    const nav = await driver.findElement(By.id('main-nav'));
    expect(await nav.isDisplayed()).toBe(true);
  });
  
  it('should display search button', async () => {
    const search = await driver.findElement(By.id('search-btn'));
    expect(await search.isDisplayed()).toBe(true);
  });
  
  it('should display user profile link', async () => {
    const profile = await driver.findElement(By.id('profile-link'));
    expect(await profile.isDisplayed()).toBe(true);
  });
});
```

### Headless Configuration
- **Default to headless mode** for CI/CD and automated testing
- Make headless configurable via `HEADLESS=false` environment variable
- Use consistent Chrome options for stability across environments
- Include proper window sizing and stability flags

### Selenium Best Practices
- Use explicit waits (`until.elementLocated`) instead of implicit waits
- Wait for elements to be visible before interacting with them
- Use `findElement()` for pre-loaded pages, `wait()` for dynamic loading
- Handle animations with appropriate delays (`driver.sleep()` when necessary)
- Use robust selectors (XPath with `contains()` for nested elements)

### Error Tracking and Debugging
- Structure tests so failures clearly indicate which specific element failed
- Use meaningful assertion messages and element identification
- Group related functionality while maintaining individual test granularity
- Include proper cleanup in `afterAll()` to close browser sessions

### Example Structure
```
tests/
├── selenium/
│   ├── landing-page.test.js
│   ├── analyze-page.test.js
│   └── results-page.test.js
├── frontend/
│   └── api/
└── fixtures/
```

### Performance Guidelines
- **Target 1-2 page loads per test file** maximum
- Group 5-10 element checks per page load when possible  
- Keep total test execution under 5 seconds for single page tests
- Use efficient selectors and minimize unnecessary DOM queries
- Share browser instances across related test groups when appropriate

---

## Summary

Good integration tests are:
- **Granular** - ONE assertion per test, making failures instantly identifiable
- **Small** - Test files under 200 lines, organized by feature
- **Step-by-Step** - Break workflows into individual checks (load → check 1 → check 2 → done)
- **Feature-Organized** - Tests grouped in feature folders for easy maintenance
- **Workflow-Focused** - Test complete user journeys from start to finish
- **Real Data Driven** - Use actual data and services instead of mocks whenever possible
- **Well-Organized** - Use `tests/mock/` directory for data, setup, and teardown functions
- **Debuggable** - Each test failure points to exactly ONE issue
- **Clean** - Proper setup and teardown functions maintain test environment integrity
- **Maintainable** - Simple structure that's easy to update as features evolve

Remember: Write granular tests where each test verifies exactly ONE thing. This makes failures immediately obvious and tests easy to maintain.

**CRITICAL RULES:**
- **One assertion per test - NO EXCEPTIONS**
- **Test files under 200 lines - split by feature aspect**
- **Organize by feature, not by file type**
- **Break complex workflows into individual test steps**