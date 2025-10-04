# Checkpoint Workflow Guide for AI Agents

## Overview

This guide shows you how to make your AI agents work in **iterative checkpoint cycles** - allowing them to work longer without hallucinating while maintaining control through regular progress updates.

## The Problem

When agents work on complex tasks, they can:
- Hallucinate and claim things are done when they're not
- Lose track of progress on long tasks
- Continue working when they should stop and ask
- Batch multiple completions making debugging hard

## The Solution: Checkpoint Pattern

Agents work in **small batches** with **mandatory stops** for verification:

```
Plan → Report → STOP
  ↓
Implement 2-3 items → Report → STOP
  ↓
Implement 2-3 items → Report → STOP
  ↓
Validate → Report → Done
```

## Quick Start

### Option 1: Automatic Update (Recommended)

Update all your agents automatically:

**Windows (PowerShell):**
```powershell
cd .claude/scripts
.\Add-CheckpointsToAgents.ps1 -DryRun    # Preview changes
.\Add-CheckpointsToAgents.ps1            # Apply changes
```

**Mac/Linux (Node.js):**
```bash
cd .claude/scripts
node add-checkpoints-to-agents.js --dry-run    # Preview changes
node add-checkpoints-to-agents.js              # Apply changes
```

### Option 2: Manual Update

Copy the checkpoint pattern from `.claude/yaml/CHECKPOINT_PATTERN.md` and add it to your agent YAML files before the "Interaction Guidelines" section.

## How It Works

### Phase 1: Planning (Mandatory Stop)
```
Agent:
1. Analyzes the requirements
2. Searches/reads relevant files
3. Creates TodoWrite list
4. Reports plan with evidence
5. STOPS and waits for approval

You:
- Review the plan
- Approve or adjust
- Agent continues only after approval
```

### Phase 2: Implementation (Checkpoint Every 2-3 Items)
```
Agent:
1. Marks 1 todo as in_progress
2. Implements the change
3. Verifies by reading file
4. Reports: "✅ Completed X (src/file.ts:123)"
5. Marks todo complete
6. Repeats for next item

After 3 items → Mandatory checkpoint
```

### Phase 3: Progress Checkpoint (Every 3 Items)
```
Agent stops and reports:

## Progress Update
✅ Completed (3/10 tasks)
- Created user model (src/models/user.ts:15)
- Added API endpoint (src/app/api/users/route.ts:25)
- Implemented validation (src/lib/validate.ts:45)

🔄 Next Up
- Add database migration
- Create tests

⚠️ Issues: None
```

### Phase 4: Validation (Before Completion)
```
Agent:
1. Runs tests
2. Reviews all changes
3. Reports results with evidence
4. Marks remaining todos complete
```

## Key Rules for Agents

### ✅ DO:
- Create TodoWrite list at the start
- Work on 2-3 items then report
- Keep ONE todo in_progress at a time
- Provide file:line evidence for all claims
- Report progress every 3 completed items
- Stop when blocked or uncertain

### ❌ DON'T:
- Claim code exists without reading the file
- Mark todos complete without verification
- Batch multiple completions together
- Continue when encountering errors
- Have multiple todos in_progress
- Make assumptions instead of asking

## Example Agent Prompts

### Good Prompts (With Checkpoints)
```
"Please implement user authentication.
Work in small checkpoints and report progress every 2-3 completed items."

"Add a dashboard feature.
Create a TodoWrite list first, then work in batches with evidence."

"Refactor the API layer.
Break it into phases and checkpoint after each phase."
```

### Agent Response Pattern
```
Phase 1: Analysis
I'll analyze the requirements and create a plan.

*reads files*
*creates TodoWrite*

## Plan
1. Create user model with auth fields
2. Add login API endpoint
3. Implement JWT token generation
4. Add middleware for auth
5. Create login UI component
6. Add tests

Ready to proceed? [STOPS]

---

Phase 2: Implementation (after approval)
Starting implementation...

✅ Completed: Created user model (src/models/user.ts:15-45)
  - Added email, password, tokens fields
  - Verified by reading file

🔄 Working on: Login API endpoint...

✅ Completed: Login endpoint (src/app/api/auth/login/route.ts:10)
  - POST /api/auth/login
  - Validated credentials
  - Verified by reading file

## Progress Checkpoint (2/5 items complete) [STOPS]
Want me to continue with JWT token generation?

---

Phase 3: Continue (after approval)
Continuing implementation...

✅ Completed: JWT token generation (src/lib/auth.ts:20)
  - Token creation with user payload
  - Verified by reading file

## Progress Checkpoint (3/5 items complete) [STOPS]
Next: Auth middleware. Continue?
```

## Configuration Files

### Created Files

1. **`.claude/yaml/CHECKPOINT_PATTERN.md`**
   - Copy-paste checkpoint patterns
   - Implementation guide
   - Agent-specific customizations

2. **`.claude/yaml/_checkpoint_pattern_example.yaml`**
   - Complete example agent with checkpoints
   - Reference implementation

3. **`.claude/scripts/Add-CheckpointsToAgents.ps1`**
   - PowerShell script for Windows
   - Automatic agent updating

4. **`.claude/scripts/add-checkpoints-to-agents.js`**
   - Node.js script for Mac/Linux
   - Automatic agent updating

## Testing Your Enhanced Agents

### Test Command
```bash
# Pick any agent and test with:
"Please implement [feature] using the checkpoint pattern"
```

### Expected Behavior
1. ✅ Agent creates TodoWrite list
2. ✅ Reports plan and stops for approval
3. ✅ Implements 2-3 items with file:line evidence
4. ✅ Reports checkpoint after 3 items
5. ✅ Continues in this pattern until done

### Red Flags (Agent Needs Fixing)
1. ❌ No TodoWrite list created
2. ❌ Claims code exists without reading file
3. ❌ Batches 5+ completions at once
4. ❌ Doesn't stop for checkpoints
5. ❌ Multiple todos in_progress

## Benefits

### For You
- 🎯 **Control**: Stop/redirect at any checkpoint
- 👀 **Visibility**: See exactly what's happening
- 🐛 **Debug**: Catch issues early before cascading
- 📊 **Progress**: Clear status of long-running tasks

### For Agents
- 🧠 **Less Hallucination**: Evidence required at each step
- 🔄 **Better Context**: Work in manageable chunks
- ✅ **Quality**: Validation at each checkpoint
- 🛡️ **Safety**: Stop when uncertain

## Advanced Patterns

### For Different Task Types

#### Large Feature
```
Checkpoint 1: Architecture plan (TodoWrite)
Checkpoint 2: Models/types (2-3 files)
Checkpoint 3: Business logic (2-3 files)
Checkpoint 4: API routes (2-3 files)
Checkpoint 5: UI components (2-3 files)
Checkpoint 6: Tests & validation
```

#### Bug Fix
```
Checkpoint 1: Reproduce & understand
Checkpoint 2: Identify root cause
Checkpoint 3: Implement fix & verify
Checkpoint 4: Add tests
Checkpoint 5: Validate resolution
```

#### Refactoring
```
Checkpoint 1: Analyze & plan
Checkpoint 2: Refactor batch 1 (2-3 modules)
Checkpoint 3: Refactor batch 2 (2-3 modules)
Checkpoint 4: Update tests
Checkpoint 5: Final validation
```

### Agent Collaboration

When multiple agents work together:

```
Agent 1 (Backend):
1. Complete backend work
2. Report with file references
3. Notify Agent 2
4. STOP

Agent 2 (Frontend):
1. Review Agent 1's work
2. Implement frontend
3. Report progress
4. Notify Agent 3
5. STOP

Agent 3 (Testing):
1. Review all changes
2. Run comprehensive tests
3. Report results
4. DONE
```

## Troubleshooting

### Agent Doesn't Follow Checkpoints
1. Check agent YAML has checkpoint pattern in Interaction Guidelines
2. Explicitly request in prompt: "Use checkpoint pattern"
3. Interrupt and say: "Please work in smaller batches with checkpoints"

### Agent Hallucinating
1. Demand evidence: "Show me file:line reference"
2. Request verification: "Read the file to confirm"
3. Enforce rule: "Never claim without reading first"

### Too Many Checkpoints
1. Adjust batch size: "Work on 4-5 items before checkpoint"
2. For simple tasks: "Skip checkpoints for this simple task"

### Not Enough Checkpoints
1. Reduce batch size: "Checkpoint after every 2 items"
2. Enforce frequency: "Report progress every 30 minutes of work"

## Best Practices

### 1. Clear Task Definition
```
❌ "Fix the bugs"
✅ "Fix the login validation bug. Work in checkpoints with evidence."
```

### 2. Explicit Checkpoint Request
```
❌ "Build the dashboard"
✅ "Build the dashboard. Create TodoWrite list, then implement in batches of 2-3 items with progress reports."
```

### 3. Evidence Requirements
```
❌ "Did you add the API?"
✅ "Show me the API endpoint with file:line reference"
```

### 4. Stop When Needed
```
❌ Let agent continue when uncertain
✅ "Stop and ask me if you're not sure"
```

## FAQ

**Q: Will this slow down agents?**
A: Slightly, but it prevents wasted work from hallucination and gives you control to redirect early.

**Q: Do I always need checkpoints?**
A: No. For simple 1-2 step tasks, you can skip them. Use for complex multi-step work.

**Q: Can I adjust checkpoint frequency?**
A: Yes! Tell the agent: "Checkpoint every 5 items" or "Only checkpoint at phase boundaries"

**Q: What if I want agents to work autonomously?**
A: You can say: "Auto-approve checkpoints for straightforward work, only stop for issues"

**Q: How do I know it's working?**
A: Look for: TodoWrite lists, file:line evidence, regular progress reports, and stops for approval

## Summary

The checkpoint pattern transforms agents from:
- ❌ Long autonomous runs that may hallucinate
- ❌ Batch completions that hide issues
- ❌ Uncertainty about progress

To:
- ✅ Controlled iterative work cycles
- ✅ Evidence-based progress tracking
- ✅ Early issue detection
- ✅ Clear visibility into what's happening

**Start using it:**
```powershell
# Windows
.\Add-CheckpointsToAgents.ps1

# Then test any agent with:
"Implement [feature] using checkpoint pattern"
```

Enjoy more reliable, transparent, and controllable AI agent workflows! 🚀
