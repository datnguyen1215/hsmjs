# File Refactoring Workflow

**CRITICAL: Break down files >200 lines and functions >50 lines IMMEDIATELY**

## Size Limits (STRICTLY ENFORCED)

### Function Limits
- **HARD LIMIT: 50 lines per function**
- **Target: 10-20 lines per function**
- Break down immediately when approaching limit

### File Limits  
- **HARD LIMIT: 200 lines per file**
- **Target: 100-150 lines per file**
- Split files BEFORE reaching limit

## Process

### 1. Analyze Target File
- Check function sizes (must be <50 lines)
- Check file size (must be <200 lines)
- Identify feature groupings
- Map dependencies between functions
- Find all import locations in codebase

### 2. Design Feature-Based Structure
- **CRITICAL: Organize by feature, not file type**
- Create feature folders for related code
- Plan files under 150 lines each
- Keep all feature code together

**Example Structure:**
```
features/
├── user-management/
│   ├── user-crud.js         (< 150 lines)
│   ├── user-validation.js   (< 150 lines)
│   ├── user-permissions.js  (< 150 lines)
│   └── index.js            (barrel exports)
├── payment-processing/
│   ├── payment-gateway.js   (< 150 lines)
│   ├── payment-validation.js(< 150 lines)
│   ├── payment-history.js   (< 150 lines)
│   └── index.js
└── notifications/
    ├── email-sender.js      (< 150 lines)
    ├── sms-sender.js        (< 150 lines)
    └── notification-queue.js (< 150 lines)
```

### 3. Execute Refactoring
1. Create feature-based folder structure
2. Break large functions into smaller ones (<50 lines)
3. Move functions to appropriate feature modules
4. Setup barrel exports for each feature folder
5. Update all import paths codebase-wide
6. Remove original oversized files

### 4. Maintain Feature Cohesion
- Keep all feature code in one folder
- Use barrel exports for clean imports
- Minimize cross-feature dependencies
- Make features self-contained

### 5. Verification Checklist
- [ ] **All functions under 50 lines**
- [ ] **All files under 200 lines**
- [ ] Feature-based folder organization
- [ ] Related code grouped together
- [ ] All imports updated
- [ ] Tests pass
- [ ] Original oversized files removed

## When to Refactor

**IMMEDIATELY refactor when:**
- Any function approaches 40 lines
- Any file approaches 150 lines
- Feature code is scattered across multiple locations
- Code organization makes features hard to find

**NO EXCEPTIONS - Size limits are mandatory**