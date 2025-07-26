# Svelte 5 Coding Standards

## Overview

This document extends the [JavaScript coding standards](.airules/javascript-coding-standards.md) and [general coding standards](.airules/coding-standards.md) with Svelte 5-specific requirements. All general principles of **simplicity over cleverness**, **clarity over brevity**, and **readability over performance** apply.

**Svelte 5 with runes only. No stores. No legacy Svelte patterns.**

---

## 1. Svelte 5 Runes Requirements

### Use Runes for All State Management
- Use `$state()` for all component-level reactive state
- Use `$derived()` for computed values that depend on reactive state
- Use `$effect()` for side effects and lifecycle-like behavior
- Never use Svelte stores or legacy reactive declarations

### State Declaration Patterns
- Declare all state variables at the top of the script block
- Use descriptive names that clearly indicate the data being stored
- Initialize state with appropriate default values
- Group related state declarations together

### Derived State Guidelines
- Use `$derived()` for any computed values that depend on reactive state
- Keep derived computations simple and focused on a single calculation
- Avoid complex logic inside derived expressions
- Extract complex derived logic into separate functions

### Effect Usage Rules
- Use `$effect()` for side effects like API calls, DOM manipulation, or cleanup
- Keep effects focused on a single responsibility
- Always clean up resources in effect cleanup functions when necessary
- Avoid creating effects inside conditional blocks or loops

---

## 2. Component Structure Standards

### Script Block Organization
- Place all imports at the top of the script block
- Declare props using destructuring with `$props()`
- Declare all state variables using `$state()`
- Define all derived values using `$derived()`
- Place all functions after state and derived declarations
- Place all effects at the bottom of the script block

### Props Handling Requirements
- Use destructuring assignment with `$props()` for all component props
- Provide default values for optional props in the destructuring
- Use JSDoc comments to document prop types and purposes
- Validate props early in the component if validation is needed
- Never mutate props directly

### Component Naming Conventions
- Use PascalCase for component file names
- Use descriptive names that clearly indicate component purpose
- Avoid generic names like "Component" or "Item"
- Keep component names concise but meaningful

---

## 3. Event Handling Standards

### Event Declaration Patterns
- Use arrow functions for all event handlers
- Keep event handlers simple and delegate complex logic to separate functions
- Use descriptive names for event handler functions
- Always prevent default behavior explicitly when needed

### Custom Event Guidelines
- Create custom events using `createEventDispatcher()` from `svelte`
- Use descriptive event names that clearly indicate what happened
- Include relevant data in event detail objects
- Document custom events in component JSDoc comments

### Event Binding Rules
- Use `on:` directive for all event bindings
- Avoid inline event handlers for complex logic
- Use event modifiers (`preventDefault`, `stopPropagation`) when appropriate
- Bind events to the most specific element possible

---

## 4. Templating Best Practices

### Conditional Rendering Guidelines
- Use `{#if}` blocks for conditional rendering
- Keep conditional logic simple and readable
- Avoid nested conditional blocks when possible
- Use early returns in functions to reduce template complexity

### Loop Rendering Standards
- Use `{#each}` blocks for rendering lists
- Always provide a unique key when rendering dynamic lists
- Keep loop bodies simple and extract complex rendering to child components
- Handle empty states explicitly with `{:else}` blocks

### Template Expression Rules
- Keep template expressions simple and readable
- Extract complex expressions into derived values or functions
- Use parentheses to clarify expression precedence when needed
- Avoid multiple chained method calls in templates

---

## 5. Styling Integration with TailwindCSS

### TailwindCSS-First Approach
- Use TailwindCSS utility classes for all styling needs
- Prefer utility classes over custom CSS in all cases
- Use Tailwind's responsive prefixes for responsive design
- Leverage Tailwind's state variants for hover, focus, and active states

### Custom CSS Restrictions
- Only use custom CSS when TailwindCSS utilities are insufficient
- Place custom CSS in component `<style>` blocks, not external files
- Use CSS custom properties for dynamic values that can't be handled by Tailwind
- Document why custom CSS was necessary in comments

### Class Management Patterns
- Group related utility classes together for readability
- Use consistent spacing and color utilities throughout the application
- Extract commonly used class combinations into reusable patterns
- Use Tailwind's arbitrary value syntax sparingly and only when necessary

### PostCSS Integration Guidelines
- Use PostCSS plugins only for TailwindCSS processing
- Avoid PostCSS plugins that conflict with Svelte's scoped styling
- Keep PostCSS configuration minimal and focused on Tailwind
- Document any custom PostCSS plugins and their purposes

---

## 6. Accessibility Requirements

### Semantic HTML Standards
- Use semantic HTML elements for their intended purposes
- Provide appropriate ARIA labels and roles when semantic HTML is insufficient
- Ensure proper heading hierarchy in component templates
- Use landmark elements to structure page content

### Keyboard Navigation Support
- Ensure all interactive elements are keyboard accessible
- Implement proper focus management for dynamic content
- Use appropriate tabindex values only when necessary
- Test keyboard navigation paths through components

### Screen Reader Compatibility
- Provide descriptive alt text for all images
- Use ARIA live regions for dynamic content updates
- Ensure form labels are properly associated with inputs
- Provide context for screen readers when visual cues are used

---

## 7. Performance Optimization Patterns

### Reactive Efficiency Guidelines
- Minimize the number of reactive dependencies in derived values
- Avoid creating unnecessary reactive state for static values
- Use `$effect.pre()` for effects that need to run before DOM updates
- Batch related state updates to minimize reactive recalculations

### Component Optimization Rules
- Keep components small and focused on single responsibilities
- Avoid passing large objects as props when only specific properties are needed
- Use component composition over complex prop drilling
- Extract reusable logic into utility functions outside components

### Memory Management Standards
- Clean up event listeners and subscriptions in effect cleanup functions
- Avoid creating closures that capture unnecessary variables
- Use weak references for large objects when appropriate
- Monitor component memory usage during development

---

## 8. Error Handling and Validation

### Error Boundary Patterns
- Handle errors at appropriate component boundaries
- Provide meaningful error messages for user-facing errors
- Log detailed error information for debugging purposes
- Implement graceful degradation for non-critical failures

### Input Validation Standards
- Validate all user inputs at the component level
- Provide immediate feedback for validation errors
- Use consistent validation patterns across similar components
- Separate validation logic from presentation logic

### Error State Management
- Use reactive state to track error conditions
- Clear error states when appropriate user actions occur
- Provide clear recovery paths for error states
- Avoid showing technical error details to end users

---

## 9. JSDoc Documentation Standards

### Component Documentation Requirements
- Document all components with a brief description of their purpose
- Document all props with their types and descriptions
- Document custom events emitted by components
- Include usage examples in component documentation when helpful

### Function Documentation Guidelines
- Document all exported functions with their purpose and parameters
- Use `@param` tags for function parameters with types and descriptions
- Use `@returns` tags when functions return specific types
- Keep documentation concise and focused on essential information

### Type Annotation Patterns
- Use JSDoc type annotations for complex object parameters
- Document union types and optional parameters clearly
- Avoid over-documenting obvious functionality
- Update documentation when component interfaces change

---

## 10. Lifecycle Management and Cleanup

### Effect Cleanup Patterns
- Return cleanup functions from effects that create subscriptions or listeners
- Clean up DOM modifications made in effects
- Cancel pending async operations in cleanup functions
- Remove event listeners added in effects

### Resource Management Guidelines
- Track resources that need cleanup in component state
- Use consistent patterns for resource acquisition and release
- Handle cleanup for both normal and error conditions
- Test cleanup behavior during component unmounting

### Async Operation Handling
- Cancel pending promises when components unmount
- Use AbortController for cancellable fetch requests
- Handle race conditions in async effects
- Provide loading states for async operations

---

## 11. Anti-Patterns and Compiler Warning Avoidance

### Forbidden Patterns
- Never use Svelte stores (`writable`, `readable`, `derived`) in Svelte 5 components
- Avoid legacy reactive declarations (`$:`) in favor of runes
- Don't mix runes with legacy Svelte patterns in the same component
- Never mutate props or state from outside the component

### Compiler Warning Prevention
- Always provide keys for dynamic lists in `{#each}` blocks
- Avoid unused variables in component scripts
- Don't access undefined properties without proper checks
- Use proper TypeScript-style JSDoc annotations for better tooling

### Common Mistakes to Avoid
- Don't create effects inside conditional blocks or loops
- Avoid creating derived values that don't actually depend on reactive state
- Don't use `$effect()` for computations that should be `$derived()`
- Never call runes conditionally or inside regular functions

---

## 12. File Organization and Module Structure

### Component File Standards
- Keep component files under 200 lines when possible
- Use single-file components with script, template, and style sections
- Place complex logic in separate utility modules
- Group related components in feature-specific directories

### Import and Export Patterns
- Use named exports for utility functions and constants
- Import only the specific functions needed from utility modules
- Group imports by type: external dependencies, internal modules, components
- Use consistent import ordering throughout the application

### Module Boundaries
- Keep component-specific logic within component files
- Extract shared logic into utility modules
- Use clear interfaces between components and utility modules
- Avoid circular dependencies between modules

---

## Key Svelte 5 Guidelines Summary

1. **Runes Only** - Use `$state`, `$derived`, and `$effect` for all reactivity
2. **No Stores** - Avoid Svelte stores completely in favor of runes
3. **TailwindCSS First** - Use utility classes over custom CSS
4. **Instruction-Based** - Follow clear, actionable guidelines
5. **Compiler Compliant** - Write code that produces no warnings
6. **Accessible** - Ensure all components meet accessibility standards
7. **Performant** - Optimize for reactive efficiency and memory usage
8. **Well-Documented** - Use JSDoc for all public interfaces

---

## Summary

Svelte 5 components should be:
- **Reactive** - Use runes for all state management and reactivity
- **Accessible** - Follow WCAG guidelines and semantic HTML practices
- **Performant** - Optimize reactive dependencies and component structure
- **Styled** - Use TailwindCSS utilities with minimal custom CSS
- **Documented** - Include JSDoc comments for all public interfaces
- **Clean** - Follow consistent patterns and avoid anti-patterns

Remember: Write Svelte 5 code that leverages runes effectively while maintaining the simplicity and clarity principles of the existing codebase.