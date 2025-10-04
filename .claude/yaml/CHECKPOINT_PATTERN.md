# Checkpoint Pattern for Agent YAML Files

## Quick Copy-Paste Pattern

Add this section to the **Interaction Guidelines** of any agent YAML file:

```yaml
## Workflow and Checkpoint Strategy

- **TodoWrite First**: Start every task by creating a comprehensive TodoWrite list
- **Small Batches**: Work on 2-3 related items, then stop and report
- **One In Progress**: Keep exactly ONE todo as in_progress at a time
- **Evidence Required**: Provide file:line references for all code claims
- **Checkpoint Frequency**: Report progress every 3 completed items
- **Immediate Completion**: Mark todos complete immediately, don't batch
- **Stop When Blocked**: If encountering errors, stop and report rather than continuing

### Task Execution Pattern

**Phase 1: Analysis (Stop after this phase)**
1. Read/search relevant files to understand current state
2. Create TodoWrite list breaking down the work
3. Report findings and proposed approach
4. WAIT for user confirmation

**Phase 2: Implementation (Checkpoint every 2-3 items)**
- Mark 1 todo as in_progress
- Implement the specific change
- Verify by reading the file or running tests
- Report completion with evidence (src/file.ts:123)
- Mark as completed
- Repeat for next item

**Phase 3: Every 3 Completed Items (Mandatory checkpoint)**
- Summarize progress with file references
- Report any blockers or issues
- Confirm alignment with goals
- Get user confirmation before continuing

**Phase 4: Validation**
- Run comprehensive tests
- Review all changes
- Report final results with evidence

### Anti-Hallucination Rules
- Never claim a file contains code without reading it first
- Never mark a todo complete without verification
- Stop and ask if uncertain rather than assuming
- Break tasks taking >30 min into smaller todos
- Provide concrete evidence for every claim
```

## Implementation Guide

### For New Agents
1. Copy the pattern above
2. Paste after the "Key Capabilities" section
3. Add before "Interaction Guidelines" section

### For Existing Agents

**Option A: Add to Interaction Guidelines (Recommended)**
```yaml
## Interaction Guidelines

- [Existing guideline 1]
- [Existing guideline 2]
- **Use TodoWrite**: Create task list at start, checkpoint every 3 items
- **Work in Batches**: Implement 2-3 items, report progress, get confirmation
- **Provide Evidence**: Include file:line references for all code changes
- **Stop When Blocked**: Report issues immediately rather than continuing
- [More existing guidelines...]
```

**Option B: Add Dedicated Workflow Section**
Add a new section before "Interaction Guidelines":

```yaml
## Checkpoint-Based Workflow

### Execution Pattern
1. **Plan**: Create TodoWrite list, report approach, STOP for approval
2. **Implement**: Work on 2-3 items with evidence-based completion
3. **Checkpoint**: Report progress every 3 items, verify alignment
4. **Validate**: Test and verify all changes before final completion

### Rules
- ONE in_progress todo at a time
- File:line evidence for all claims
- Immediate completion reporting (no batching)
- Stop and ask when uncertain
```

## Agent-Specific Customizations

### For Testing Agents
```yaml
- **Test Evidence**: Include test output, screenshots, or logs with every checkpoint
- **Coverage Checkpoints**: Report test coverage after each test suite implementation
- **Screenshot Analysis**: Reference specific screenshots from Playwright results
```

### For Development Agents
```yaml
- **Code Verification**: Read modified files after each change to verify
- **Build Checkpoints**: Run build after every 3 file changes
- **Type Safety**: Run type-check before marking implementation complete
```

### For Infrastructure Agents
```yaml
- **Deployment Verification**: Confirm service health after each deployment step
- **Rollback Readiness**: Document rollback steps at each checkpoint
- **Resource Monitoring**: Check resource metrics between implementation phases
```

### For Data/Analytics Agents
```yaml
- **Data Validation**: Verify data quality at each transformation step
- **Query Performance**: Report query execution times at checkpoints
- **Sample Output**: Provide data samples as evidence of completion
```

## Testing Your Enhanced Agents

After adding checkpoint patterns, test with:

```bash
# Test prompt for any agent
"Please implement [feature X]. Work in small checkpoints and report progress every 2-3 completed items."

# Expected behavior:
1. Agent creates TodoWrite list
2. Reports plan and waits for confirmation
3. Implements 2-3 items with file:line evidence
4. Reports checkpoint with progress summary
5. Continues in this pattern until completion
```

## Benefits of Checkpoint Pattern

✅ **Prevents Hallucination**: Evidence required at each step
✅ **Enables Long Tasks**: Break into manageable chunks
✅ **User Control**: Stop/redirect at any checkpoint
✅ **Clear Progress**: Transparent status updates
✅ **Error Recovery**: Catch issues early before cascading
✅ **Better Quality**: Validation at each step

## Common Patterns for Different Task Types

### Large Feature Implementation
```
Checkpoint 1: Architecture & plan (TodoWrite)
Checkpoint 2: Core models/types (2-3 files)
Checkpoint 3: Business logic (2-3 files)
Checkpoint 4: API routes (2-3 endpoints)
Checkpoint 5: UI components (2-3 components)
Checkpoint 6: Tests & validation
```

### Bug Investigation & Fix
```
Checkpoint 1: Reproduce bug, understand scope
Checkpoint 2: Identify root cause with evidence
Checkpoint 3: Implement fix, verify locally
Checkpoint 4: Add test coverage
Checkpoint 5: Validate fix resolves issue
```

### Refactoring
```
Checkpoint 1: Analyze current code, create plan
Checkpoint 2: Extract/refactor 2-3 modules
Checkpoint 3: Update tests, verify functionality
Checkpoint 4: Update imports/references
Checkpoint 5: Clean up, final validation
```

### Testing Suite Creation
```
Checkpoint 1: Test plan & structure (TodoWrite)
Checkpoint 2: Setup & utilities (2-3 files)
Checkpoint 3: Unit tests batch 1 (2-3 test files)
Checkpoint 4: Unit tests batch 2 (2-3 test files)
Checkpoint 5: Integration tests
Checkpoint 6: E2E tests, coverage report
```
