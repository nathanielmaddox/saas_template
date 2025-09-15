# Quick Start Guide - Planning System

## 🚀 Start a New SaaS Project in 3 Steps

### Step 1: Choose Your SaaS Type
```bash
# View available templates
ls .claude/planning/templates/

# Available templates:
# - e-commerce-saas.yml     (Marketplace/Store)
# - crm-saas.yml           (Customer Management)
# - analytics-saas.yml     (Data & Dashboards)
# - base-template.yml      (Custom/Other)
```

### Step 2: Create Your Project
```bash
# Create project directory
mkdir .claude/planning/projects/my-awesome-saas

# Copy and customize template
cp .claude/planning/templates/e-commerce-saas.yml \
   .claude/planning/projects/my-awesome-saas/config.yml

# Edit to customize (optional)
# Update: name, description, specific features, etc.
```

### Step 3: Activate & Start Building
```bash
# Set as active project
cp .claude/planning/projects/my-awesome-saas/config.yml \
   .claude/planning/active/PROJECT.yml

# Now Claude will follow this project plan!
```

## 📋 What Happens Next?

Once activated, Claude will:
- ✅ Follow your project's scope and constraints
- ✅ Use specified technology stack
- ✅ Work through phases systematically
- ✅ Track progress automatically
- ✅ Prevent feature creep
- ✅ Suggest next steps from roadmap

## 🔄 Switching Projects

### Save Current Work
```bash
# Update your project with current state
cp .claude/planning/active/PROJECT.yml \
   .claude/planning/projects/current-project/config.yml
```

### Switch to Different Project
```bash
# Activate different project
cp .claude/planning/projects/other-project/config.yml \
   .claude/planning/active/PROJECT.yml
```

## 📁 Directory Structure
```
.claude/planning/
├── active/           # Currently active project
│   └── PROJECT.yml   # Claude reads this
├── projects/         # All your projects
├── templates/        # Starter templates
└── archives/         # Completed projects
```

## 💡 Pro Tips

1. **Start Small**: Use phase_1 goals to get MVP running quickly
2. **Be Specific**: Clear constraints prevent scope creep
3. **Track Progress**: Update `state.completed_tasks` regularly
4. **Use Templates**: Don't start from scratch - modify templates
5. **Archive Completed**: Move finished projects to archives

## 🎯 Example: Starting an E-Commerce Project

```bash
# 1. Create project
mkdir .claude/planning/projects/my-store

# 2. Use e-commerce template
cp .claude/planning/templates/e-commerce-saas.yml \
   .claude/planning/projects/my-store/config.yml

# 3. Activate it
cp .claude/planning/projects/my-store/config.yml \
   .claude/planning/active/PROJECT.yml

# 4. Tell Claude to start
# "Let's build the e-commerce platform following the active project plan"
```

## ❓ Common Commands

```bash
# Check active project
cat .claude/planning/active/PROJECT.yml | head -20

# List all projects
ls .claude/planning/projects/

# Archive completed project
mv .claude/planning/active/PROJECT.yml \
   .claude/planning/archives/project-$(date +%Y%m%d).yml

# Reset (no active project)
rm .claude/planning/active/PROJECT.yml
```

## 🚦 Project States

Your project config tracks:
- **current_phase**: Where you are in development
- **completed_tasks**: What's done
- **blockers**: What's stopping progress
- **next_steps**: What to do next

Claude uses these to guide development and maintain focus.

## Need Help?

- See `PROJECT_MANAGER.md` for detailed guide
- Check `templates/` for more examples
- Review `README.md` for system overview