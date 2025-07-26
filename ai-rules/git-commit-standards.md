# Git Commit Standards

## Core Principles

### Single-Line Messages Only
- **ALWAYS use single-line commit messages** - no multi-line messages
- **NO author tags** - never add "Co-Authored-By" or similar attribution  
- **NO multi-line descriptions** - keep everything in one line
- Format: `git commit -m "single line message"`

### Message Structure
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Reference issue numbers: `Closes #123`
- Keep message under 50 characters when possible
- Be descriptive but concise

## Examples

### ✅ Good Commit Messages
```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login validation bug"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify auth logic"
git commit -m "feat: implement user dashboard for issue #123"
```

### ❌ Bad Commit Messages
```bash
# DON'T: Multi-line messages
git commit -m "feat: add authentication

This commit adds user authentication with:
- Login validation
- Session management
- Password hashing

Co-Authored-By: Someone <email@example.com>"

# DON'T: Author attribution
git commit -m "feat: add auth

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# DON'T: Using temp files for simple messages
echo "feat: add authentication" > /tmp/commit-msg.txt
git commit -F /tmp/commit-msg.txt
```

## Implementation Rules

### Always Use -m Flag
```bash
# ✅ Correct way
git commit -m "feat: implement user dashboard"

# ❌ Wrong way - opens editor
git commit

# ❌ Wrong way - uses temp file unnecessarily  
git commit -F /tmp/message.txt
```

### No Heredoc for Simple Messages
```bash
# ❌ DON'T: Use heredoc for simple commits
git commit -m "$(cat <<'EOF'
feat: add authentication
EOF
)"

# ✅ DO: Direct single-line message
git commit -m "feat: add authentication"
```

## Conventional Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Formatting, missing semi colons, etc
- `refactor:` - Code refactoring
- `test:` - Adding missing tests
- `chore:` - Updating build tasks, package manager configs, etc

## Length Guidelines

- **Ideal**: Under 50 characters
- **Maximum**: 72 characters
- Focus on the "what" and "why", not the "how"