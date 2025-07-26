# CLAUDE.md

This file provides guidance to Claude Code when working with any codebase.

## 🚨 MANDATORY: AI Rules Discovery

**IMMEDIATELY run these commands when starting ANY new conversation or continued session:**

1. `Glob tool: ai-rules/**/*` - List all available ai-rules
2. Read relevant ai-rules files based on the task type (see mapping below)
3. `Glob tool: docs/**/*` - Discover available documentation

**This must happen BEFORE attempting any work - no exceptions.**

## AI Rules File Mapping

**Read relevant files based on task type:**
   - **Coding/Implementation** → coding-standards.md, javascript-coding-standards.md, svelte5-coding-standards.md
   - **Testing** → testing-standards.md
   - **Documentation** → documentation-standards.md
   - **Git/GitHub operations** → github-workflow-standards.md
   - **Refactoring** → file-refactoring-workflow.md
   - **General conversations** → coding-standards.md (for context about project conventions)

## Trigger Conditions (When to re-read ai-rules)

**ALWAYS read ai-rules when:**
- Starting new conversations about the project
- User asks about standards, conventions, or "how should I..."  
- Making commits or GitHub operations (ALWAYS read git-commit-standards.md)
- Creating or organizing tests (ALWAYS read testing-standards.md)
- Writing documentation (ALWAYS read documentation-standards.md)
- Refactoring existing code (ALWAYS read file-refactoring-workflow.md)
- User mentions following project patterns/standards
- **Any time you're about to write code or make changes**

**Read multiple ai-rules files** when tasks overlap (e.g., testing + git operations)

## Project Commands

Discover development commands by checking:
- `package.json` scripts section
- Root directory config files
- README files

Common patterns:
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run lint` - Code formatting

## Documentation

If docs/ directory exists, use `Glob tool: docs/**/*` to discover available documentation before asking questions about project architecture, setup, or features.

## Enforcement Notes

**For Claude Code to consistently follow these rules:**

1. **Session Start Protocol**: The first action in ANY conversation should be:
   ```
   Glob ai-rules/**/*
   Glob docs/**/*  
   Read relevant ai-rules files based on the user's initial request
   ```

2. **Before Major Tasks**: Before committing, coding, testing, or documenting, always check if relevant ai-rules need to be re-read

3. **System Reminders**: When you see system reminders about ai-rules in the context, immediately read the relevant files

4. **User Cues**: When user mentions "follow project standards" or asks "how should I...", this is a trigger to read ai-rules

## Code and Content Standards

**NEVER include signatures, attributions, or generated-by messages in any content:**
- No "Generated with Claude Code" messages
- No "Co-Authored-By: Claude" attributions  
- No signatures in code, reports, documentation, or commit messages
- All work must be clean and signature-free