# Planning System for SaaS Projects

This planning system helps maintain focus and consistency when building different types of SaaS applications using this template.

## Directory Structure

```
.claude/planning/
├── active/              # Currently active project plan
│   └── PROJECT.yml      # Active project configuration
├── projects/            # Individual project plans
│   ├── {project-name}/  # Each project gets its own folder
│   │   ├── config.yml   # Project configuration
│   │   ├── roadmap.md   # Implementation roadmap
│   │   ├── features.yml # Feature specifications
│   │   ├── tech-stack.yml # Technology decisions
│   │   └── progress.md  # Progress tracking
├── templates/           # Reusable planning templates
│   └── ...             # Various SaaS type templates
└── archives/           # Completed or paused projects
```

## How It Works

### 1. Starting a New Project
When you decide on a SaaS type:
1. Create a new project folder in `projects/`
2. Use or customize a template from `templates/`
3. Symlink or copy to `active/` to mark as current
4. Claude will follow the active project plan

### 2. Project Context Persistence
- The active project configuration persists across conversations
- Claude checks `active/PROJECT.yml` for current context
- Prevents scope creep and maintains focus

### 3. Switching Projects
```bash
# Archive current project
mv .claude/planning/active/PROJECT.yml .claude/planning/archives/

# Activate different project
cp .claude/planning/projects/{project-name}/config.yml .claude/planning/active/PROJECT.yml
```

### 4. Resetting for New Task
- Simply update or replace the active project
- Previous projects remain in `projects/` for reference

## Project Configuration (config.yml)

Each project configuration includes:
- **type**: SaaS category (e-commerce, CRM, analytics, etc.)
- **scope**: Features and boundaries
- **constraints**: What NOT to include
- **tech_decisions**: Locked technology choices
- **milestones**: Implementation phases
- **current_phase**: Active development phase

## Benefits

1. **Focus**: Clear boundaries prevent feature creep
2. **Consistency**: Decisions persist across sessions
3. **Flexibility**: Easy to switch between projects
4. **History**: Archive completed projects for reference
5. **Templates**: Reuse successful patterns

## Usage Examples

### Creating a CRM SaaS Project
```bash
# Use CRM template
cp .claude/planning/templates/crm-saas.yml .claude/planning/projects/my-crm/config.yml

# Activate it
cp .claude/planning/projects/my-crm/config.yml .claude/planning/active/PROJECT.yml
```

### Claude Integration
Claude will:
1. Check active project on each conversation
2. Enforce project constraints
3. Track progress against milestones
4. Suggest next steps based on roadmap
5. Prevent out-of-scope additions