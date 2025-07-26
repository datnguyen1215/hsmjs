# AI Coding Standards

## Core Principles

**Simplicity over cleverness. Clarity over brevity. Readability over performance.**

These standards guide AI to write code that any developer can understand immediately.

---

## 1. Code Simplicity

### Prefer Simple Over Clever
- Choose straightforward solutions over complex optimizations
- Avoid nested ternary operators, complex one-liners, or "clever" tricks
- Write code that explains itself

**Good:**
```
if (user.isActive && user.hasPermission) {
    return allowAccess();
}
return denyAccess();
```

**Avoid:**
```
return user.isActive && user.hasPermission ? allowAccess() : denyAccess();
```

### Clear Intent
- Make the purpose of code obvious at first glance
- Use explicit conditions instead of implicit logic
- Prefer verbose clarity over concise ambiguity

---

## 2. Clarity Standards

### Readable Code
- Write code as if explaining to a colleague
- Use whitespace to separate logical sections
- Keep indentation consistent and meaningful

### Obvious Logic Flow
- Structure code in the order it executes
- Avoid jumping between contexts
- Use early returns to reduce nesting

**Good:**
```
function processUser(user) {
    if (!user) {
        return null;
    }
    
    if (!user.isValid) {
        return handleInvalidUser(user);
    }
    
    return processValidUser(user);
}
```

### Minimal Cognitive Load
- Limit the number of concepts per function
- Avoid deep nesting (max 3 levels)
- Keep related code close together

---

## 3. Function Design

### Single Purpose
- Each function should do exactly one thing
- If you need "and" to describe a function, split it
- Functions should be predictable and focused

### Short Length
- **CRITICAL: Keep functions under 50 lines - NO EXCEPTIONS**
- Ideal length is 10-20 lines
- If approaching 50 lines, refactor immediately
- Extract complex logic into separate functions
- Break down long functions into smaller, focused pieces

### Clear Naming
- Function names should describe what they do
- Use verbs for actions: `calculateTotal()`, `validateInput()`
- Use nouns for data: `getUserData()`, `getFormattedDate()`

**Good:**
```
function calculateTotalPrice(items) { ... }
function validateEmailFormat(email) { ... }
function getUserPermissions(userId) { ... }
```

**Avoid:**
```
function calc(items) { ... }
function check(email) { ... }
function get(id) { ... }
```

---

## 4. File Organization

### Small Files
- **CRITICAL: Keep files under 200 lines - NO EXCEPTIONS**
- Aim for 100-150 lines per file
- Split large files immediately when approaching limit
- One feature = one file (or folder if complex)

### Feature-Based Organization
- **CRITICAL: Group all related code for a feature in one folder**
- Each feature gets its own directory
- Keep feature dependencies self-contained
- Make features easy to find and maintain

**Good Structure:**
```
features/
├── auth/
│   ├── login.js
│   ├── logout.js
│   ├── validation.js
│   └── utils.js
├── shopping-cart/
│   ├── cart-manager.js
│   ├── cart-ui.js
│   ├── cart-storage.js
│   └── cart-validation.js
└── user-profile/
    ├── profile-display.js
    ├── profile-edit.js
    └── profile-validation.js
```

### Clear Structure
- Organize by feature, not by file type
- Keep related code close together
- Use descriptive folder and file names
- Make navigation intuitive

---

## 5. Naming Conventions

### Clarity Over Brevity
- Use full words instead of abbreviations
- Make names searchable and descriptive
- Avoid mental mapping

**Good:**
```
const userAccountBalance = 1000;
const isEmailValidationEnabled = true;
function calculateMonthlyPayment() { ... }
```

**Avoid:**
```
const bal = 1000;
const emailVal = true;
function calcPmt() { ... }
```

### Self-Documenting Names
- Names should explain purpose without comments
- Use domain-specific terminology consistently
- Avoid misleading or ambiguous names

### Boolean Naming
- Use `is`, `has`, `can`, `should` prefixes
- Make true/false states obvious
- Avoid negative boolean names

**Good:**
```
isUserActive
hasPermission
canEditProfile
shouldShowWarning
```

**Avoid:**
```
userStatus
permission
editProfile
warning
```

---

## 6. Simple vs Complex Examples

### Data Processing
**Simple:**
```
function getActiveUsers(users) {
    const activeUsers = [];
    
    for (const user of users) {
        if (user.isActive) {
            activeUsers.push(user);
        }
    }
    
    return activeUsers;
}
```

**Complex (Avoid):**
```
const getActiveUsers = users => users.filter(u => u.isActive);
```

### Error Handling
**Simple:**
```
function saveUserData(userData) {
    if (!userData) {
        throw new Error('User data is required');
    }
    
    if (!userData.email) {
        throw new Error('Email is required');
    }
    
    return database.save(userData);
}
```

**Complex (Avoid):**
```
const saveUserData = userData => 
    !userData ? (() => { throw new Error('User data is required'); })() :
    !userData.email ? (() => { throw new Error('Email is required'); })() :
    database.save(userData);
```

---

## 7. CRITICAL SIZE LIMITS (ENFORCED)

### Function Size Limits
1. **HARD LIMIT: 50 lines per function**
2. **Target: 10-20 lines per function**
3. **NO EXCEPTIONS - refactor immediately if approaching limit**

### File Size Limits
1. **HARD LIMIT: 200 lines per file**
2. **Target: 100-150 lines per file**
3. **Split files BEFORE reaching limit**

### When Limits Are Exceeded
- Stop immediately and refactor
- Break functions into smaller pieces
- Split files into feature-based modules
- Create folders for complex features
- NO temporary exceptions allowed

---

## 8. Key Guidelines for AI

1. **Always choose readability over performance** unless performance is critical
2. **Write code that explains the business logic** clearly
3. **Use consistent patterns** throughout the codebase
4. **Avoid abstractions** until they're absolutely necessary
5. **Make debugging easy** with clear variable names and simple logic
6. **Write code for humans first**, computers second

---

## Summary

Good code is:
- **Small** - Functions under 50 lines, files under 200 lines
- **Simple** - Easy to understand at first glance
- **Clear** - Purpose is obvious without explanation
- **Organized** - Feature-based folders for easy navigation
- **Focused** - Each piece has a single responsibility
- **Readable** - Flows naturally like well-written prose

Remember: Code is read far more often than it's written. Optimize for the reader.

**ENFORCE SIZE LIMITS STRICTLY - NO EXCEPTIONS**