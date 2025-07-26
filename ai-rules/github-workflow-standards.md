# GitHub Workflow Standards

## Core Principle

**Always use `gh` CLI for GitHub operations.** Assume it's authenticated and ready to use.

## Standard Workflow

### Issue → Branch → PR → Merge

```bash
# 1. Create branch for issue (with latest changes)
gh issue view 123                    # Review issue details
git fetch origin                     # Fetch latest changes from remote
git checkout -b feature/issue-123 origin/main  # Create branch from latest origin/main

# 2. Work and commit  
git add .
git commit -m "feat: implement user dashboard for issue #123"

# 3. Push and create PR
git push -u origin feature/issue-123
gh pr create --title "Fix: Issue #123 description" --body-file /tmp/pr-body.md

# 4. Merge and cleanup
gh pr merge --squash --delete-branch
```

## Essential Commands

### Issues
```bash
gh issue list                        # List open issues
gh issue view 123                    # View issue details
gh issue create --title "Bug report" --body-file /tmp/issue-body.md
gh issue close 123                   # Close issue
```

**Important: Do NOT add labels when creating issues**
- Labels should be managed manually through the GitHub web interface
- Avoid using `--label` or `-l` flags with `gh issue create`
- This prevents automatic categorization and ensures proper issue triage

### Pull Requests
```bash
gh pr list                           # List open PRs
gh pr view 456                       # View PR details
gh pr create --draft                 # Create draft PR
gh pr ready                          # Mark PR as ready
gh pr merge --squash --delete-branch # Merge and cleanup
```

### Repository Operations
```bash
gh repo view                         # View repo info
gh repo clone owner/repo             # Clone repository
gh workflow list                     # List GitHub Actions
gh workflow run build.yml           # Trigger workflow
```

## File Management for Long Content

### Use /tmp/ for Long Messages

**Commit Messages:**
```bash
# Always use single-line messages
git commit -m "feat: implement user authentication for issue #123"

# ❌ DON'T: Use multi-line messages or temp files
# echo "long message..." > /tmp/commit-msg.txt
# git commit -F /tmp/commit-msg.txt
```

**Issue Creation:**
```bash
# Write detailed issue description
cat > /tmp/issue-body.md << 'EOF'
## Problem
Describe the issue in detail...

## Expected Behavior
What should happen...

## Steps to Reproduce
1. Step one
2. Step two

## Additional Context
Any other relevant information...
EOF

# Create issue WITHOUT labels - labels should be added manually via web interface
gh issue create --title "Bug: Authentication fails" --body-file /tmp/issue-body.md
```

**Pull Request Body:**
```bash
# Write detailed PR description
cat > /tmp/pr-body.md << 'EOF'
## Changes Made
- Implemented feature X
- Fixed bug Y
- Updated documentation

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related Issues
Closes #123
EOF

gh pr create --title "feat: add authentication" --body-file /tmp/pr-body.md
```

## Label Management

### Policy: No Automatic Labels
- **Never use `--label` or `-l` flags** when creating issues via CLI
- Labels should be applied manually through GitHub web interface
- This ensures proper issue categorization and team review
- Prevents premature or incorrect labeling

### Label Guidelines
```bash
# ❌ DON'T: Add labels during creation
gh issue create --title "Bug report" --label "bug,priority:high" --body-file /tmp/issue.md

# ✅ DO: Create without labels, add them manually later
gh issue create --title "Bug report" --body-file /tmp/issue.md
# Then add labels through GitHub web interface
```

## Best Practices

### Branch Naming
- `feature/issue-123` - New features
- `fix/issue-456` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/cleanup-auth` - Code refactoring

### Commit Messages
- **See git-commit-standards.md for detailed commit message rules**
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Format: `git commit -m "single line message"`

### PR Management
- Create draft PRs for work in progress
- Use `gh pr ready` when ready for review
- Always use `--delete-branch` when merging
- Prefer `--squash` for clean history

### Enhanced Branch Creation Methods

#### Method 1: Safe Branch Creation (Recommended)
```bash
# Always fetch latest and create from origin/main
git fetch origin
git checkout -b feature/issue-123 origin/main
```

#### Method 2: Shell Function (Advanced Users)
Add to your `.bashrc` or `.zshrc`:
```bash
# Enhanced branch creation function
new-branch() {
    if [ -z "$1" ]; then
        echo "Usage: new-branch <branch-name>"
        return 1
    fi
    
    echo "Fetching latest changes from origin..."
    git fetch origin
    
    echo "Creating branch '$1' from origin/main..."
    git checkout -b "$1" origin/main
    
    echo "Branch '$1' created successfully from latest origin/main"
}
```

#### Method 3: Git Alias (Optional)
```bash
# Add this alias to your git config
git config alias.nb '!f() { git fetch origin && git checkout -b "$1" origin/main; }; f'

# Usage: git nb feature/issue-123
```

### Branch Creation Best Practices

#### ✅ DO: Always Fetch Before Creating Branches
```bash
# Good: Ensures branch is based on latest origin/main
git fetch origin
git checkout -b feature/new-feature origin/main
```

#### ❌ DON'T: Create Branches from Stale Local Main
```bash
# Bad: May create branch from outdated local main
git checkout main
git checkout -b feature/new-feature  # Could be based on old commits
```

#### ✅ DO: Verify Branch Base
```bash
# Check what your branch is based on
git log --oneline -1
git show-branch origin/main
```

### Quick Reference
```bash
# Enhanced workflow example
gh issue view 123
git fetch origin                     # Fetch latest changes
git checkout -b fix/issue-123 origin/main  # Create from latest origin/main
# ... make changes ...
git add . && git commit -m "fix: resolve authentication bug for issue #123"
git push -u origin fix/issue-123
echo "Fixes authentication bug. Closes #123" > /tmp/pr-body.md
gh pr create --title "Fix: Authentication bug" --body-file /tmp/pr-body.md
gh pr merge --squash --delete-branch