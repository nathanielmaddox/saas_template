# CLAUDE.md - AI Assistant Context Template

## Project Overview
[Describe your project here - e.g., Building a SaaS platform, e-commerce site, mobile app, etc.]

## Tech Stack (Latest Versions - 2024)
- **Frontend**: [Framework] - [Version]+ ([Key Features])
- **Backend**: [Service/Framework] - [Version]+ ([Key Features])
- **Database**: [Database] - [Version]+ ([Key Features])
- **Styling**: [CSS Framework] - [Version]+ ([Key Features])
- **Testing**: [Testing Framework] - [Version]+ ([Key Features])

## Key Architecture Decisions

### [Architecture Pattern Name]
- [Decision 1]
- [Decision 2]
- [Decision 3]

### [Another Architecture Pattern]
- [Decision 1]
- [Decision 2]
- [Decision 3]

## Version Management Standards

### Technology Stack Monitoring
- **Daily**: Security vulnerability scanning with appropriate tools
- **Weekly**: Dependency updates with update checking tools
- **Monthly**: Performance benchmarking with latest tools
- **Quarterly**: Major version upgrade planning

### Breaking Change Management
1. **Identify**: Monitor changelogs and migration guides
2. **Test**: Create feature branch for version updates
3. **Validate**: Run full test suite and performance checks
4. **Document**: Update CLAUDE.md and team knowledge base
5. **Deploy**: Gradual rollout with monitoring

### Critical Version Requirements
- Always use **latest stable** versions for security
- **Never** use deprecated packages or APIs
- **Monitor** latest framework best practices
- **Leverage** latest performance optimizations
- **Implement** latest security standards

## Development Standards

### File Structure
```
/[your-project-structure]
  /[directory1]
  /[directory2]
  /[directory3]
```

### Naming Conventions
- Components: [Convention] ([Example])
- Utilities: [Convention] ([Example])
- API routes: [Convention] ([Example])
- Database tables: [Convention] ([Example])

## API Structure (if applicable)

### Base Endpoints
```
[Category 1]:
[METHOD] /[endpoint]  # [Description]
[METHOD] /[endpoint]  # [Description]

[Category 2]:
[METHOD] /[endpoint]  # [Description]
[METHOD] /[endpoint]  # [Description]
```

### API Authentication
[Describe authentication method and headers required]

## Latest Technology Implementation

### [Framework] Features to Use
- **[Feature 1]**: [Description and usage]
- **[Feature 2]**: [Description and usage]
- **[Feature 3]**: [Description and usage]

### [Language] Features to Leverage
- **[Feature 1]**: [Description and usage]
- **[Feature 2]**: [Description and usage]
- **[Feature 3]**: [Description and usage]

### Performance Optimization (2024)
- **[Optimization 1]**: [Tool/technique and implementation]
- **[Optimization 2]**: [Tool/technique and implementation]
- **[Optimization 3]**: [Tool/technique and implementation]

## Component Guidelines

### [Component Type] Components
Each component should:
1. [Guideline 1]
2. [Guideline 2]
3. [Guideline 3]
4. [Guideline 4]
5. [Guideline 5]

### Example Pattern
```[language]
// Standard component structure
interface [ComponentName]Props {
  [prop]: [type]
  [prop]: [type]
  [prop]: [type]
}
```

## Testing Approach
- [Test Type 1] for [Purpose]
- [Test Type 2] for [Purpose]
- [Test Type 3] for [Purpose]
- Test commands: `[command1]`, `[command2]`

## Deployment Process
1. [Step 1]: `[command]`
2. [Step 2]: `[command]`
3. [Step 3]: `[command]`
4. [Step 4]: [Description]

## Common Tasks

### [Task Category 1]
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Step 4]
5. [Step 5]
6. [Step 6]

### [Task Category 2]
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Step 4]

## Environment Variables
```
[VAR_NAME]=
[VAR_NAME]=
[VAR_NAME]=
[VAR_NAME]=
```

## Performance Considerations
- [Consideration 1]
- [Consideration 2]
- [Consideration 3]
- [Consideration 4]
- [Consideration 5]

## Security Notes
- [Security Practice 1]
- [Security Practice 2]
- [Security Practice 3]
- [Security Practice 4]
- [Security Practice 5]

## Current Status
- [ ] [Task/Feature 1]
- [ ] [Task/Feature 2]
- [ ] [Task/Feature 3]
- [ ] [Task/Feature 4]
- [ ] [Task/Feature 5]
- [ ] [Task/Feature 6]
- [ ] [Task/Feature 7]
- [ ] [Task/Feature 8]
- [ ] [Task/Feature 9]
- [ ] [Task/Feature 10]

## Known Issues
[List any known issues or technical debt]

## Useful Commands
```bash
# Development
[command]

# Testing
[command]

# Linting
[command]

# Build
[command]

# Production
[command]
```

## Project-Specific Notes
[Add any project-specific context, patterns, or requirements that the AI should know about]

---

**Instructions for Use:**
1. Copy this template to your project root as `CLAUDE.md`
2. Replace all placeholders `[...]` with project-specific information
3. Remove sections that don't apply to your project
4. Add additional sections as needed for your specific use case
5. Keep the technology stack versions updated regularly
6. Reference the latest versions from `TECHNOLOGY_STACK_VERSIONS.md`