# Examples & Patterns

Real-world examples and common patterns for HSMJS state machines.

## Table of Contents

- [Basic Examples](#basic-examples)
- [UI Patterns](#ui-patterns)
- [Data Fetching](#data-fetching)
- [Form Management](#form-management)
- [Game Logic](#game-logic)
- [Background Processes](#background-processes)
- [State History & Undo](#state-history--undo)
- [Testing Patterns](#testing-patterns)

## Basic Examples

### Traffic Light System

A complete traffic light state machine with timing and visual indicators. Demonstrates basic state transitions, context usage, and async actions with timers.

- **File**: [example/traffic-light.js](../example/traffic-light.js)
- **Run**: `node example/traffic-light.js`

### Simple Calculator

A fully functional calculator with support for basic operations, chaining calculations, and error handling. Shows complex state management and conditional transitions.

- **File**: [example/calculator.js](../example/calculator.js)
- **Run**: `node example/calculator.js`

## UI Patterns

### Modal Dialog State

Complete modal dialog management including focus trapping, scroll locking, and accessibility features. Handles opening, closing, and cleanup actions.

- **File**: [example/modal-dialog.js](../example/modal-dialog.js)
- **Run**: `node example/modal-dialog.js`

### Dropdown Menu State

Keyboard-navigable dropdown menu with arrow key support, selection handling, and proper focus management. Demonstrates event-driven UI patterns.

- **File**: [example/dropdown-menu.js](../example/dropdown-menu.js)
- **Run**: `node example/dropdown-menu.js`

## Data Fetching

### Advanced Fetch with Retry and Cache

Sophisticated data fetching with exponential backoff retry logic, caching, and error handling. Shows how to manage network operations effectively.

- **File**: [example/fetch-retry-cache.js](../example/fetch-retry-cache.js)
- **Run**: `node example/fetch-retry-cache.js`

### Paginated Data Loading

Complete pagination system with loading states, error handling, and navigation controls. Handles page boundaries and refresh operations.

- **File**: [example/paginated-data.js](../example/paginated-data.js)
- **Run**: `node example/paginated-data.js`

## Form Management

### Multi-Step Wizard Form

Complex multi-step form with validation, error handling, and step navigation. Demonstrates form state management and user flow control.

- **File**: [example/wizard-form.js](../example/wizard-form.js)
- **Run**: `node example/wizard-form.js`

## Game Logic

### Tic-Tac-Toe Game

Complete tic-tac-toe implementation with win detection, turn management, and game reset functionality. Shows game state management patterns.

- **File**: [example/tic-tac-toe.js](../example/tic-tac-toe.js)
- **Run**: `node example/tic-tac-toe.js`

## Background Processes

### File Upload with Progress

File upload system with progress tracking, cancellation support, and error handling. Demonstrates long-running process management.

- **File**: [example/file-upload.js](../example/file-upload.js)
- **Run**: `node example/file-upload.js`

## State History & Undo

### Basic Undo Button

Simple undo functionality for user actions using HSMJS built-in history features. Shows how to implement rollback operations.

- **File**: [example/undo-button.js](../example/undo-button.js)
- **Run**: `node example/undo-button.js`

### Text Editor with Character-by-Character Undo

Advanced text editor with granular undo support for every keystroke. Demonstrates fine-grained history management for editing operations.

- **File**: [example/text-editor-undo.js](../example/text-editor-undo.js)
- **Run**: `node example/text-editor-undo.js`

### Debug Helper with State History

Debugging tool that uses state history to analyze application flow and troubleshoot issues. Shows how to leverage history for development tools.

- **File**: [example/debug-history.js](../example/debug-history.js)
- **Run**: `node example/debug-history.js`

### History-Based Testing

Testing approach that uses rollback functionality to isolate test scenarios and ensure clean state between tests.

- **File**: [example/history-testing.js](../example/history-testing.js)
- **Run**: `node example/history-testing.js`

## Testing Patterns

### Test-Driven State Machine Development

Complete test suite showing how to develop state machines using test-driven development practices. Includes authentication flow testing.

- **File**: [example/test-driven.js](../example/test-driven.js)
- **Run**: `node example/test-driven.js`

### Mock Testing Helper

Mock state machine implementation for fast unit testing and component testing. Shows how to create lightweight test doubles.

- **File**: [example/mock-testing.js](../example/mock-testing.js)
- **Run**: `node example/mock-testing.js`

---

These examples demonstrate real-world patterns and use cases for HSMJS. Each pattern can be adapted and extended based on your specific requirements. Run any example to see it in action, or use them as starting points for your own state machine implementations.