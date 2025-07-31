# NPM Consumer Tests

This directory contains comprehensive tests that validate the dual ESM/CJS package architecture by simulating real-world npm package consumption patterns.

## Architecture Overview

```mermaid
graph TB
    A[Built Package] --> B[tests/npm-consumers/]
    B --> C[esm-consumer/]
    B --> D[cjs-consumer/] 
    B --> E[browser-consumer/]
    B --> F[typescript-consumer/]
    B --> G[test-runner.js]
    
    C --> C1[package.json - type: module]
    C --> C2[import-test.js - ESM imports]
    C --> C3[node_modules/@datnguyen1215/hsmjs - symlink]
    
    D --> D1[package.json - default CJS]
    D --> D2[require-test.js - CJS requires]
    D --> D3[node_modules/@datnguyen1215/hsmjs - symlink]
    
    E --> E1[index.html - UMD script]
    E --> E2[browser-test.js - Global access]
    
    F --> F1[package.json - type: module]
    F --> F2[types-test.ts - TypeScript imports]
    F --> F3[tsconfig.json - TS configuration]
    
    G --> H[Automated Testing]
    H --> I[npm link simulation]
    H --> J[Cross-format validation]
    H --> K[CI/CD integration]
```

## Test Strategy

### 1. ESM Consumer Test
- **Location**: `esm-consumer/`
- **Purpose**: Test ES module imports using the dual package `import` export
- **Features**:
  - Package.json with `"type": "module"`
  - Native ES6 import syntax
  - Top-level await support
  - Tree-shaking validation

### 2. CJS Consumer Test  
- **Location**: `cjs-consumer/`
- **Purpose**: Test CommonJS requires using the dual package `require` export
- **Features**:
  - Traditional package.json (no type field)
  - CommonJS require() syntax
  - Module.exports compatibility
  - Node.js interop validation

### 3. Browser Consumer Test
- **Location**: `browser-consumer/`
- **Purpose**: Test UMD build in browser environments
- **Features**:
  - HTML script tag loading
  - Global namespace access (window.HSM)
  - No bundler required
  - Browser compatibility testing

### 4. TypeScript Consumer Test
- **Location**: `typescript-consumer/`
- **Purpose**: Test TypeScript integration and type definitions
- **Features**:
  - TypeScript import syntax
  - Type checking validation
  - IntelliSense support testing
  - Declaration file validation

## Test Execution Flow

1. **Build Package**: Ensure dist/ contains all formats (CJS, ESM, UMD, types)
2. **Setup Consumers**: Create isolated consumer environments with proper configs
3. **Link Package**: Simulate npm install using symlinks to dist/ files
4. **Run Tests**: Execute import/require tests in each consumer environment
5. **Validate Results**: Ensure all consumption patterns work correctly
6. **Report**: Generate comprehensive test results and compatibility matrix

## Integration Points

- **Jest Integration**: Tests run as part of main test suite
- **CI/CD Pipeline**: Validates package architecture on every change
- **Pre-publish Hook**: Ensures package works before npm publish
- **Development Workflow**: Quick validation during development

## Usage

```bash
# Run all npm consumer tests
npm run test:npm-consumers

# Run specific consumer tests
npm run test:esm-consumer
npm run test:cjs-consumer
npm run test:browser-consumer
npm run test:typescript-consumer

# Setup consumer environments (for development)
npm run setup:npm-consumers

# Clean consumer environments
npm run clean:npm-consumers
```

## Validation Matrix

| Format | Import Syntax | Module Type | File Extension | Status |
|--------|---------------|-------------|----------------|---------|
| ESM | `import { }` | module | .js | ✅ |
| CJS | `require()` | commonjs | .js | ✅ |
| UMD | `<script>` | browser | .js | ✅ |
| TypeScript | `import { }` | module | .ts | ✅ |

## Error Handling

Each consumer test includes comprehensive error handling:
- Import/require failures
- Runtime execution errors
- Type checking errors
- Browser loading errors
- Cross-platform compatibility issues

## Performance Validation

Tests also validate performance characteristics:
- Bundle size verification
- Load time measurement
- Memory usage tracking
- Tree-shaking effectiveness