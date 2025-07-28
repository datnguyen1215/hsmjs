# Changelog

## [1.1.4](https://github.com/datnguyen1215/hsmjs/compare/v1.1.3...v1.1.4) (2025-07-28)

### Changes

* fix YAML syntax error in manual-release workflow ([0c330b2](https://github.com/datnguyen1215/hsmjs/commit/0c330b2827ba6cabd6d465ecd915261a3d1c8343))
* Merge pull request #6 from datnguyen1215/test-manual-workflow ([f84ced8](https://github.com/datnguyen1215/hsmjs/commit/f84ced825655a8f613888c11a95360a688ca63b2))
* add test manual workflow to debug run workflow button ([c618432](https://github.com/datnguyen1215/hsmjs/commit/c61843290b46734194d9defe50a9b58efdb49829))
* Merge pull request #5 from datnguyen1215/release-please ([1150e51](https://github.com/datnguyen1215/hsmjs/commit/1150e51d5db4ce354239b5860ade670f919514e3))
* add release workflow. ([35801c1](https://github.com/datnguyen1215/hsmjs/commit/35801c1ecf03199c1af39911f60e1d4dc079c970))
* Merge pull request #4 from datnguyen1215/update-README ([b372581](https://github.com/datnguyen1215/hsmjs/commit/b3725814a6cc05011c422b549a94a9495625a80d))
* update README.md ([964a523](https://github.com/datnguyen1215/hsmjs/commit/964a5236eab805ca7b87739d5fd1dd9d4e4cd380))
* Merge pull request #3 from datnguyen1215/cleanup ([8c33165](https://github.com/datnguyen1215/hsmjs/commit/8c33165cb24d08cbfa03aaf6a6287d844b741f35))
* cleanup rules. ([c0e426f](https://github.com/datnguyen1215/hsmjs/commit/c0e426f180b62b4953767a5b5c2a019f2cbd0d09))
* Merge pull request #2 from datnguyen1215/fix/timing-tests-and-scoped-package ([771136f](https://github.com/datnguyen1215/hsmjs/commit/771136fb6a4d5358ff31cd26db45afe918ed1dcf))
* Release v1.1.3: Fix flaky timing tests ([10de501](https://github.com/datnguyen1215/hsmjs/commit/10de5013e3bbcce1ffbff4ed646d98c2dac70cbb))


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3](https://github.com/datnguyen1215/hsmjs/releases/tag/v1.1.3) (2024-07-28)

### Features

* Comprehensive hierarchical state machine implementation
* Support for async actions with proper lifecycle management
* Event-driven architecture with subscription support
* Transition guards and conditional state changes
* Context management and state persistence
* Fire-and-forget action patterns
* Global transition support across all states

### Build System

* Dual package support (CommonJS and ES modules)
* Babel-based transpilation pipeline
* Jest testing framework integration
* NPM publishing automation

### Tests

* 204 comprehensive test cases across 12 test suites
* 100% test coverage for core functionality
* Integration tests for complex state scenarios
* Async action testing with proper cleanup
* Edge case validation for state transitions

### Documentation

* Complete API documentation
* Usage examples and best practices
* Migration guide from v1.0.x
* TypeScript definitions (coming soon)