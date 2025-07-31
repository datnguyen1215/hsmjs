# NPM Consumer Testing Architecture

## 🏗️ Architecture Overview

This npm consumer testing system validates the dual ESM/CJS package architecture by simulating real-world npm package consumption patterns. The architecture ensures that the `@datnguyen1215/hsmjs` package works correctly across all major JavaScript environments and module systems.

## 📊 System Architecture Diagram

```mermaid
graph TB
    subgraph "Built Package"
        A[dist/cjs/] --> A1[CommonJS Files]
        B[dist/esm/] --> B1[ES Module Files]
        C[dist/umd/] --> C1[Browser UMD Build]
        D[dist/types/] --> D1[TypeScript Definitions]
        E[package.json] --> E1[Dual Exports Config]
    end
    
    subgraph "Test Architecture"
        F[tests/npm-consumers/]
        F --> G[test-runner.js]
        F --> H[npm-consumer.test.js]
        
        G --> I[Environment Setup]
        G --> J[Test Execution]
        G --> K[Result Reporting]
        
        I --> L[NPM Link Simulation]
        I --> M[Symlink Creation]
        
        J --> N[Parallel Test Runner]
        N --> O[ESM Consumer]
        N --> P[CJS Consumer]
        N --> Q[TypeScript Consumer]
        N --> R[Browser Consumer]
    end
    
    subgraph "Consumer Environments"
        O --> O1[package.json type:module]
        O --> O2[import-test.js]
        O --> O3[node_modules/@datnguyen1215/hsmjs → symlink]
        
        P --> P1[package.json default CJS]
        P --> P2[require-test.js]
        P --> P3[node_modules/@datnguyen1215/hsmjs → symlink]
        
        Q --> Q1[tsconfig.json strict]
        Q --> Q2[types-test.ts]
        Q --> Q3[TypeScript compilation]
        
        R --> R1[index.html]
        R --> R2[browser-test.js]
        R --> R3[UMD script loading]
    end
    
    subgraph "Test Validation"
        S[Package Resolution]
        T[Import/Require Testing]
        U[Functionality Validation]
        V[Performance Metrics]
        W[Error Handling]
        X[Type Safety]
    end
    
    A1 --> P2
    B1 --> O2
    C1 --> R2
    D1 --> Q2
    E1 --> L
```

## 🎯 Core Components

### 1. Test Runner (`test-runner.js`)

**Purpose**: Orchestrates the entire testing process with parallel execution and comprehensive reporting.

**Key Features**:
- **NPM Link Simulation**: Creates symlinks to simulate `npm install`
- **Parallel Execution**: Runs all consumer tests simultaneously for speed
- **Environment Management**: Sets up and tears down test environments
- **Performance Tracking**: Measures execution times and resource usage
- **Comprehensive Reporting**: Generates detailed compatibility matrices

**Architecture Pattern**: Command Pattern with Factory Method for test creation

### 2. Consumer Test Environments

#### ESM Consumer (`esm-consumer/`)
```json
{
  "type": "module",
  "dependencies": {
    "@datnguyen1215/hsmjs": "file:../../../"
  }
}
```

**Validates**:
- ES Module `import` syntax
- Package.json `exports.import` resolution
- Tree-shaking compatibility
- Top-level await support
- Async/await patterns

#### CJS Consumer (`cjs-consumer/`)
```json
{
  "dependencies": {
    "@datnguyen1215/hsmjs": "file:../../../"
  }
}
```

**Validates**:
- CommonJS `require()` syntax
- Package.json `exports.require` resolution
- Multiple require patterns (destructured, full module, property access)
- Module caching behavior
- CommonJS globals (__dirname, __filename)

#### TypeScript Consumer (`typescript-consumer/`)
```json
{
  "type": "module",
  "devDependencies": {
    "typescript": "^5.8.3",
    "ts-node": "^10.0.0"
  }
}
```

**Validates**:
- TypeScript definition loading
- Strict type checking
- Generic type constraints
- IntelliSense support
- Compilation without errors

#### Browser Consumer (`browser-consumer/`)
```html
<script src="../../../dist/umd/hsmjs.min.js"></script>
<script src="browser-test.js"></script>
```

**Validates**:
- UMD module loading
- Global namespace access (`window.HSM`)
- Browser compatibility (ES5+)
- Script tag integration
- Performance in browser environment

### 3. Jest Integration (`npm-consumer.test.js`)

**Purpose**: Integrates npm consumer tests into the main Jest test suite for CI/CD pipelines.

**Features**:
- **Test Suite Integration**: Runs as part of `npm test`
- **CI/CD Compatibility**: Works in GitHub Actions and other CI systems
- **Timeout Management**: Handles long-running npm operations
- **Error Isolation**: Ensures failing consumer tests don't break main suite

## 🔄 Test Execution Flow

### Phase 1: Prerequisites Check
1. Verify `dist/` directory exists
2. Check all required build artifacts:
   - `dist/cjs/index.js`
   - `dist/esm/index.js`
   - `dist/umd/hsmjs.min.js`
   - `dist/types/index.d.ts`
3. Validate package.json exports configuration

### Phase 2: Environment Setup
1. Create `node_modules` directories in each consumer
2. Create `@datnguyen1215` namespace directories
3. Symlink project root to simulate npm installation
4. Verify symlinks are correctly created

### Phase 3: Parallel Test Execution
```javascript
await Promise.all([
  this.runESMConsumerTest(),
  this.runCJSConsumerTest(),
  this.runTypeScriptConsumerTest(),
  this.runBrowserConsumerTest()
]);
```

### Phase 4: Result Aggregation
1. Collect results from all consumer tests
2. Calculate performance metrics
3. Generate compatibility matrix
4. Create comprehensive report

### Phase 5: Cleanup
1. Remove symlinks safely
2. Clean up temporary files
3. Restore environment state

## 📊 Performance Architecture

### Metrics Tracking
- **Load Time**: Time to import/require package
- **Execution Time**: Time to create machines and run transitions
- **Memory Usage**: Heap usage during test execution
- **File Size**: Validation of build artifact sizes

### Optimization Strategies
- **Parallel Execution**: All tests run simultaneously
- **Efficient Symlinks**: Fast npm link simulation
- **Silent Output**: Reduced I/O overhead during testing
- **Cached Dependencies**: Reuse installed dependencies

## 🔒 Security Architecture

### Sandboxing
- Each consumer runs in isolated directory
- Symlinks prevent file system pollution
- Temporary environments are cleaned up

### Validation
- Build artifact integrity checking
- Package.json export validation
- Type definition verification
- Error boundary implementation

## 🎯 Usage Patterns

### Development Workflow
```bash
# Run all consumer tests
npm run test:npm-consumers

# Test specific consumers
npm run test:esm-consumer
npm run test:cjs-consumer
npm run test:typescript-consumer

# Setup development environment
npm run setup:npm-consumers

# Cleanup after testing
npm run clean:npm-consumers
```

### CI/CD Integration
```bash
# In GitHub Actions
npm run build
npm run test:npm-consumers  # Validates package works as published
npm test                    # Includes npm-consumer.test.js
```

### Manual Testing
```bash
# Interactive browser testing
open tests/npm-consumers/browser-consumer/index.html

# Direct consumer testing
cd tests/npm-consumers/esm-consumer && npm test
```

## 📈 Scalability Considerations

### Adding New Consumers
1. Create new consumer directory: `tests/npm-consumers/new-consumer/`
2. Add package.json with dependency on parent package
3. Create test script with comprehensive validation
4. Update test-runner.js to include new consumer
5. Add npm script in main package.json

### Performance Scaling
- Tests run in parallel by default
- Can be configured for sequential execution if needed
- Memory usage scales linearly with consumer count
- Execution time remains constant due to parallelization

## 🔧 Configuration Architecture

### Environment Variables
- `NODE_ENV`: Controls production vs development testing
- `VERBOSE`: Enables detailed logging
- `TIMEOUT`: Configures test timeout values

### Configuration Files
- Each consumer has independent package.json
- TypeScript consumer includes tsconfig.json
- Browser consumer uses HTML configuration
- Main package.json includes all npm scripts

## 🚀 Future Enhancements

### Planned Features
1. **Multi-Version Testing**: Test against multiple Node.js versions
2. **Bundle Analyzer Integration**: Size regression prevention
3. **Performance Benchmarking**: Historical performance tracking
4. **CDN Testing**: Validate unpkg/jsdelivr distribution
5. **Framework Integration**: Test with React, Vue, Angular

### Architecture Extensions
1. **Plugin System**: Allow custom consumer tests
2. **Config-Driven Setup**: JSON configuration for consumers  
3. **Docker Integration**: Containerized testing environments
4. **Cloud Testing**: Integration with cloud testing services

## 📋 Quality Assurance

### Test Coverage
- ✅ ESM import syntax and resolution
- ✅ CommonJS require syntax and patterns
- ✅ TypeScript integration and type safety
- ✅ Browser UMD loading and globals
- ✅ Error handling and edge cases
- ✅ Performance characteristics
- ✅ Package.json exports validation

### Validation Checklist
- [ ] All consumer tests pass
- [ ] Performance within acceptable limits
- [ ] No memory leaks detected
- [ ] Type definitions work correctly
- [ ] Browser compatibility verified
- [ ] CI/CD integration functional

This architecture ensures comprehensive validation of the dual ESM/CJS package, providing confidence that the package works correctly across all JavaScript environments and consumption patterns.