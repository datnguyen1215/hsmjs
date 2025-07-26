# Documentation Standards

## Core Principles

**Clarity over cleverness. User-focused over author-focused. Actionable over theoretical.**

These standards guide AI to write documentation that any reader can understand and use immediately.

---

## 1. Documentation Purpose

### User-Centered Approach
- Write for the reader, not the author
- Focus on what users need to accomplish
- Provide clear next steps and actionable guidance
- Eliminate unnecessary complexity

### Clear Intent
- State the document's purpose in the first paragraph
- Use descriptive titles that indicate content and scope
- Structure content to match user mental models
- Make navigation intuitive and predictable

---

## 2. Document Structure Standards

### Required Header Format
Every document must start with:
```markdown
# Document Title

Brief description of purpose and scope in 1-2 sentences.

## Overview (if needed)
Additional context or summary for longer documents.
```

### Required Footer Format
Every document must end with:
```markdown
---

**Last Updated**: Month Year  
**Documentation Version**: X.X  
**Target Audience**: Specific audience description
```

### Navigation Requirements
- Include clear section headings with consistent hierarchy
- Use descriptive headings that indicate content
- Provide cross-references to related documents
- Include "What's Next" or "Related Documentation" sections

---

## 3. Document Types and Standards

### README Files
**Purpose**: Project introduction and quick start guidance

**Required Sections**:
- Project description (1-2 sentences)
- Quick start instructions (under 5 minutes)
- Installation/setup steps
- Basic usage examples
- Links to detailed documentation

**Good Example**:
```markdown
# ResumeBypass Frontend

AI-powered resume optimization platform built with SvelteKit.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 to view the application.

## Next Steps
- [Development Setup](../docs/getting-started/development-setup.md)
- [Component Library](../docs/frontend/component-library.md)
```

### API Documentation
**Purpose**: Technical reference for developers

**Required Sections**:
- Endpoint overview with HTTP methods
- Request/response examples with real data
- Error handling and status codes
- Authentication requirements
- Rate limiting information

### Component Documentation
**Purpose**: Usage guide for UI components

**Required Sections**:
- Component purpose (1 sentence)
- Props with types and descriptions
- Usage examples with code
- Integration guidelines
- Related components

### Guide Documentation
**Purpose**: Step-by-step instructions for tasks

**Required Sections**:
- Prerequisites clearly stated
- Numbered steps with expected outcomes
- Troubleshooting common issues
- Success verification steps
- Next steps or related tasks

---

## 4. Writing Style Guidelines

### Tone and Voice
- **Direct and Professional**: Avoid conversational filler
- **Confident**: Use declarative statements, not tentative language
- **Helpful**: Focus on enabling user success
- **Consistent**: Maintain same voice throughout document

**Good**:
```markdown
Install dependencies with npm install.
The application starts on port 5173.
```

**Avoid**:
```markdown
You might want to try installing dependencies with npm install.
The application should probably start on port 5173.
```

### Technical Writing Standards
- Use active voice over passive voice
- Write in present tense for current state
- Use imperative mood for instructions
- Keep sentences under 25 words when possible

### Formatting Consistency
- Use **bold** for UI elements and important terms
- Use `code formatting` for commands, file names, and code
- Use > blockquotes for important warnings or notes
- Use numbered lists for sequential steps
- Use bullet lists for non-sequential items

---

## 5. Content Organization Rules

### Information Hierarchy
- Most important information first
- General to specific progression
- Prerequisites before instructions
- Examples after explanations

### Section Length Guidelines
- Keep sections under 200 words when possible
- Break long sections into subsections
- Use clear subheadings for navigation
- Provide section summaries for complex topics

### Code Examples Standards
- Include complete, runnable examples
- Use realistic data, not placeholder text
- Show expected output when relevant
- Explain non-obvious code sections

**Good**:
```javascript
/**
 * Calculate user conversion rate
 * @param {number} paidUsers - Number of paying users
 * @param {number} totalUsers - Total registered users
 * @returns {number} Conversion rate as percentage
 */
const calculateConversionRate = (paidUsers, totalUsers) => {
  return Math.round((paidUsers / totalUsers) * 100);
};

// Example usage
const conversionRate = calculateConversionRate(850, 4250);
console.log(`Conversion rate: ${conversionRate}%`); // Output: Conversion rate: 20%
```

---

## 6. Maintenance Standards

### Update Requirements
- Update "Last Updated" date when content changes
- Increment version number for significant changes
- Review and update cross-references when moving content
- Verify all links and examples still work

### Review Cycle
- Technical documentation: Review every 3 months
- Process documentation: Review every 6 months
- Business documentation: Review every 12 months
- Component documentation: Review with each major release

### Ownership Guidelines
- Each document should have a clear maintainer
- Include contact information for questions
- Document review and approval process
- Establish deprecation procedures for outdated content

---

## 7. Cross-Reference Standards

### Linking Guidelines
- Use descriptive link text, not "click here"
- Link to specific sections when relevant
- Verify links work before publishing
- Use relative paths for internal documentation

**Good**:
```markdown
See the [Component Library](../frontend/component-library.md) for UI development guidelines.
Review [Svelte 5 standards](.airules/svelte5-coding-standards.md) for reactive state management.
```

**Avoid**:
```markdown
Click [here](../frontend/component-library.md) for more information.
See this [link](.airules/svelte5-coding-standards.md).
```

### Navigation Patterns
- Include breadcrumb navigation for deep documents
- Provide "Up" links to parent sections
- Create clear document hierarchies
- Use consistent navigation terminology

---

## 8. Examples and Anti-Patterns

### Effective Documentation Structure
**Good**:
```markdown
# File Upload Component

Handles file upload with drag-and-drop support and validation.

## Props
- `accept`: Array of file extensions (default: ['.pdf', '.doc'])
- `maxSize`: Maximum file size in bytes (default: 5MB)
- `onUpload`: Callback function for successful uploads

## Usage
```javascript
<FileUpload
  accept={['.pdf', '.docx']}
  maxSize={mbToBytes(10)}
  onUpload={handleFileUpload}
/>
```

## Integration
Import the component and required utilities:
```javascript
import FileUpload from '$lib/components/ui/FileUpload.svelte';
import { mbToBytes } from '$lib/utils/fileSize.js';
```
```

### Common Documentation Problems
**Avoid**:
- Vague titles like "Component Documentation"
- Missing examples or outdated code samples
- Inconsistent formatting and structure
- Technical jargon without explanation
- Missing prerequisites or setup instructions

---

## 9. Accessibility in Documentation

### Inclusive Writing
- Use clear, simple language
- Define technical terms on first use
- Provide multiple ways to understand concepts
- Consider non-native English speakers

### Visual Accessibility
- Use descriptive headings for screen readers
- Provide alt text for images and diagrams
- Ensure sufficient contrast in code examples
- Structure content with proper heading hierarchy

---

## Key Documentation Guidelines

1. **User-focused content** - Write for the reader's needs, not the author's convenience
2. **Consistent structure** - Follow established patterns for predictable navigation
3. **Actionable information** - Provide clear next steps and practical examples
4. **Regular maintenance** - Keep content current and verify accuracy
5. **Clear cross-references** - Link related content with descriptive text
6. **Accessible language** - Use simple, direct language that serves all readers

---

## Summary

Good documentation is:
- **Clear** - Purpose and content are immediately obvious
- **Complete** - Contains all information needed to succeed
- **Current** - Reflects the actual state of the system
- **Consistent** - Follows predictable patterns and structure
- **Actionable** - Enables readers to accomplish their goals

Remember: Documentation is read far more often than it's written. Optimize for the reader's success.