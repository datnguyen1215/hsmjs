# Release Process

## Versioning Without Auto-Commit

This project uses custom npm scripts to bump versions without creating automatic commits.

### Commands

- **Patch release** (bug fixes): `npm run version:patch`
- **Minor release** (new features): `npm run version:minor`
- **Major release** (breaking changes): `npm run version:major`

### Release Steps

1. Make your changes and commit them
2. Run the appropriate version command:
   ```bash
   npm run version:patch  # or minor/major
   ```
3. This will:
   - Update version in package.json
   - Create a git tag (e.g., v1.1.1)
   - NOT create a commit

4. Include the version change in your commit:
   ```bash
   git add package.json
   git commit -m "Release v1.1.1: Fix state transition bug"
   ```

5. Push the commit and tag:
   ```bash
   git push origin main
   git push origin v1.1.1  # or use --tags to push all tags
   ```

6. The GitHub Actions workflow will automatically:
   - Run tests
   - Build the library
   - Create a GitHub release
   - Publish to npm

### Benefits

- Version bumps can be included with related changes in a single commit
- More meaningful commit messages that describe what's in the release
- Cleaner git history without separate "version bump" commits