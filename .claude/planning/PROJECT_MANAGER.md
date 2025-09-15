# Project Manager Guide

## Quick Start

### 1. Choose Your SaaS Type
```bash
# List available templates
ls .claude/planning/templates/

# Copy template for your project
cp .claude/planning/templates/{template-name}.yml .claude/planning/projects/my-project/config.yml
```

### 2. Activate Your Project
```bash
# Set as active project
cp .claude/planning/projects/my-project/config.yml .claude/planning/active/PROJECT.yml
```

### 3. Track Progress
Update the `state` section in your project config:
- `current_phase`: Which phase you're working on
- `completed_tasks`: Tasks you've finished
- `blockers`: Any issues preventing progress
- `next_steps`: Immediate tasks to tackle

## Project Lifecycle

### Starting Fresh
1. Choose a template or create custom config
2. Define your scope and constraints
3. Lock in technology decisions
4. Create implementation roadmap
5. Activate the project

### During Development
- Claude checks `active/PROJECT.yml` for context
- Follows defined constraints and scope
- Suggests next steps based on roadmap
- Prevents feature creep
- Tracks progress automatically

### Switching Context
```bash
# Save current progress
cp .claude/planning/active/PROJECT.yml .claude/planning/projects/current-project/config.yml

# Switch to different project
cp .claude/planning/projects/other-project/config.yml .claude/planning/active/PROJECT.yml
```

### Completing a Project
```bash
# Archive completed project
mv .claude/planning/active/PROJECT.yml .claude/planning/archives/project-name-$(date +%Y%m%d).yml

# Clear active project
rm .claude/planning/active/PROJECT.yml
```

## Best Practices

### 1. Define Clear Boundaries
- List what's included AND excluded
- Set technical constraints
- Define success criteria

### 2. Break Into Phases
- Keep phases to 1-2 weeks
- Define clear deliverables
- Set measurable goals

### 3. Track Decisions
- Document why choices were made
- Note any technical debt
- Record blockers and solutions

### 4. Regular Updates
- Update progress daily
- Move completed tasks promptly
- Adjust timeline if needed

## Configuration Examples

### Minimal Project
```yaml
project:
  name: "Simple Tool"
  type: "utility"

  scope:
    included:
      - Core functionality
    excluded:
      - Advanced features

state:
  current_phase: "development"
  next_steps:
    - Build main feature
```

### Complex Project
See templates for comprehensive examples with:
- Multiple phases
- Feature specifications
- Database schemas
- UI/UX requirements
- Testing strategies
- Deployment plans

## Integration with Claude

Claude will:
1. **Check Active Project**: On each conversation start
2. **Enforce Boundaries**: Prevent out-of-scope additions
3. **Guide Development**: Suggest next steps from roadmap
4. **Track Progress**: Update completed tasks
5. **Maintain Focus**: Keep development on track

## Troubleshooting

### Project Not Loading
- Ensure `PROJECT.yml` exists in `active/` directory
- Validate YAML syntax
- Check file permissions

### Scope Creep
- Review original constraints
- Update excluded items if needed
- Consider creating new project for additional features

### Lost Context
- Check project history in `projects/` directory
- Review completed_tasks in state
- Consult progress tracking

## Advanced Features

### Templates
Create custom templates for:
- Industry-specific SaaS
- Internal tools
- Client projects
- MVPs vs Full products

### Automation
Consider scripts for:
- Project switching
- Progress reports
- Milestone tracking
- Archive management

### Team Collaboration
- Share project configs
- Sync progress updates
- Coordinate phase transitions
- Manage dependencies