# Checkpoint Pattern - Quick Reference Card

## 🎯 Purpose
Make agents work longer without hallucinating by using **iterative checkpoints** with evidence-based progress tracking.

## 🚀 Quick Setup

### Windows (PowerShell)
```powershell
cd .claude/scripts
.\Add-CheckpointsToAgents.ps1
```

### Mac/Linux (Node.js)
```bash
cd .claude/scripts
node add-checkpoints-to-agents.js
```

## 📋 The Checkpoint Cycle

```
┌─────────────────────────────────────┐
│ 1. PLAN → TodoWrite → Report → STOP │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. DO 2-3 items → Evidence → Report │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. CHECKPOINT → Summary → STOP      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. REPEAT steps 2-3 until complete  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. VALIDATE → Test → Report → Done  │
└─────────────────────────────────────┘
```

## ✅ Agent Rules (Copy-Paste for Prompts)

```
Use the checkpoint pattern:
1. Create TodoWrite list first, report plan, STOP
2. Work on 2-3 items with file:line evidence
3. Report progress every 3 completed items
4. Keep ONE todo in_progress at a time
5. Never claim code exists without reading it
6. Stop when blocked or uncertain
```

## 📝 Prompt Templates

### Basic Task
```
"Implement [feature]. Use checkpoint pattern with progress reports every 2-3 items."
```

### Complex Feature
```
"Build [feature]. Create TodoWrite list first, then work in small batches.
Report progress with file:line evidence. Checkpoint every 3 items."
```

### Bug Fix
```
"Fix [bug]. Work in phases:
1. Reproduce & analyze (report findings)
2. Implement fix (verify with evidence)
3. Add tests (report results)"
```

### Refactoring
```
"Refactor [component]. Break into batches of 2-3 files.
Checkpoint after each batch with verification."
```

## 🎯 Expected Agent Behavior

### ✅ Good Signs
- Creates TodoWrite list immediately
- Reports plan and stops for approval
- Provides file:line references (e.g., `src/app.ts:45`)
- Reports after 2-3 completions
- ONE todo in_progress at a time
- Stops when uncertain

### 🚩 Red Flags
- No TodoWrite list
- Claims code exists without reading
- Batches 5+ completions
- Multiple todos in_progress
- No file:line evidence
- Continues when should stop

## 💬 Mid-Task Commands

### Speed Up
```
"Auto-approve next 3 checkpoints for straightforward work"
"Work on 4-5 items before next checkpoint"
```

### Slow Down
```
"Checkpoint after EVERY item"
"Show me evidence before marking each complete"
```

### Course Correct
```
"Stop current work, let's reassess"
"That's not what I wanted, let's adjust the plan"
```

### Demand Evidence
```
"Show me the file:line reference for that"
"Read the file to verify it's actually there"
```

## 📊 Progress Report Format

Agents should report like this:

```markdown
## Progress Checkpoint (3/10 tasks)

### ✅ Completed
- Added user model (src/models/user.ts:15-45)
- Created API endpoint (src/app/api/users/route.ts:20)
- Implemented validation (src/lib/validate.ts:30)

### 🔄 Current
- Working on: Database migration

### ⚠️ Issues
- None (or list blockers)

### ⏭️ Next
- Add tests
- Update documentation

Continue to next batch?
```

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Agent doesn't checkpoint | Add to prompt: "Use checkpoint pattern" |
| Agent hallucinating | Demand: "Show file:line evidence" |
| Too many checkpoints | "Checkpoint every 5 items" |
| Agent stuck | "Stop, let's reassess the approach" |
| No TodoWrite list | "Create TodoWrite list first" |

## 📈 Task Type Patterns

### Large Feature (6 checkpoints)
```
CP1: Plan & TodoWrite
CP2: Models/types (2-3 files)
CP3: Business logic (2-3 files)
CP4: API routes (2-3 files)
CP5: UI components (2-3 files)
CP6: Tests & validation
```

### Bug Fix (5 checkpoints)
```
CP1: Reproduce & analyze
CP2: Identify root cause
CP3: Implement fix
CP4: Add tests
CP5: Validate resolution
```

### Refactoring (4 checkpoints)
```
CP1: Analyze & plan
CP2: Refactor batch 1
CP3: Refactor batch 2
CP4: Tests & validation
```

## 🎨 Customization

### In Agent YAML Files
Add to `Interaction Guidelines` section:

```yaml
## Workflow and Checkpoint Strategy

- TodoWrite First: Start with comprehensive task list
- Small Batches: Work on 2-3 items, then report
- One In Progress: Exactly ONE todo in_progress at a time
- Evidence Required: Provide file:line for all claims
- Checkpoint Frequency: Report every 3 completed items
- Stop When Blocked: Report issues immediately
```

### In Your Prompts
```
"Use checkpoint workflow:
- TodoWrite first
- 2-3 items per batch
- Evidence for all claims
- Stop every 3 items"
```

## 🏆 Best Practices

1. **Always Start with TodoWrite**
   - Clear task breakdown
   - Visible progress tracking
   - Easy to redirect

2. **Demand Evidence**
   - File:line references
   - Test output
   - Screenshot paths

3. **Small Batches**
   - 2-3 items default
   - Adjust based on complexity
   - More checkpoints = more control

4. **Stop Points**
   - After planning
   - Every 3 items
   - When uncertain
   - Before major changes

5. **Clear Communication**
   - Explicit checkpoint requests
   - Evidence requirements
   - Approval/rejection

## 📱 One-Liners

**Setup:**
```powershell
.\.claude\scripts\Add-CheckpointsToAgents.ps1
```

**Test:**
```
"Implement X using checkpoint pattern"
```

**Demand Evidence:**
```
"Show file:line proof"
```

**Adjust Frequency:**
```
"Checkpoint every 2 items"
```

**Auto-Approve:**
```
"Auto-approve next 3 checkpoints"
```

---

## 🎓 Remember

**Checkpoints = Control + Quality + Transparency**

- 🎯 Small verifiable steps
- 📍 Evidence at each checkpoint
- 🛑 Stop to validate
- 🔄 Iterate with confidence

**Print this reference and keep it handy!** 📌
