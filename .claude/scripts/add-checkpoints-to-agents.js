#!/usr/bin/env node

/**
 * Script to add checkpoint patterns to all agent YAML files
 *
 * Usage: node add-checkpoints-to-agents.js [--dry-run]
 *
 * This script will:
 * 1. Read all YAML files in .claude/yaml/
 * 2. Add checkpoint workflow patterns to Interaction Guidelines
 * 3. Create backups of original files
 * 4. Update files with enhanced checkpoint instructions
 */

const fs = require('fs');
const path = require('path');

const YAML_DIR = path.join(__dirname, '..', 'yaml');
const BACKUP_DIR = path.join(__dirname, '..', 'yaml', 'backups');

// Checkpoint pattern to add
const CHECKPOINT_PATTERN = `
## Workflow and Checkpoint Strategy

- **TodoWrite First**: Start every task by creating a comprehensive TodoWrite list
- **Small Batches**: Work on 2-3 related items, then stop and report progress
- **One In Progress**: Keep exactly ONE todo as in_progress at a time
- **Evidence Required**: Provide file:line references for all code claims
- **Checkpoint Frequency**: Report progress every 3 completed items
- **Immediate Completion**: Mark todos complete immediately after verification, don't batch
- **Stop When Blocked**: If encountering errors, stop and report rather than continuing

### Task Execution Pattern

**Phase 1: Analysis (Stop after this phase)**
1. Read/search relevant files to understand current state
2. Create TodoWrite list breaking down the work into specific tasks
3. Report findings and proposed approach with evidence
4. WAIT for user confirmation before implementation

**Phase 2: Implementation (Checkpoint every 2-3 items)**
- Mark 1 todo as in_progress
- Implement the specific change
- Verify by reading the modified file or running tests
- Report completion with evidence (src/file.ts:123)
- Mark todo as completed
- Repeat for next item

**Phase 3: Progress Checkpoint (Every 3 completed items)**
- Summarize progress with specific file references
- Report any blockers, errors, or issues encountered
- Confirm work aligns with original goals
- Get user confirmation before continuing

**Phase 4: Validation and Completion**
- Run comprehensive tests or validation
- Review all changes made (git diff, file review)
- Report final results with concrete evidence
- Ensure all todos are properly completed

### Anti-Hallucination Rules
- Never claim a file contains code without reading it first
- Never mark a todo complete without concrete verification
- Stop and ask if uncertain rather than making assumptions
- Break tasks taking >30 minutes into smaller, verifiable todos
- Provide concrete evidence (file paths, line numbers, test results) for every claim
- If a blocker is encountered, create a new todo describing it rather than continuing

`;

// Create backup directory if it doesn't exist
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
  }
}

// Check if file already has checkpoint pattern
function hasCheckpointPattern(content) {
  return content.includes('Workflow and Checkpoint Strategy') ||
         content.includes('Task Execution Pattern') ||
         content.includes('Anti-Hallucination Rules');
}

// Add checkpoint pattern to YAML content
function addCheckpointPattern(content, filename) {
  // Skip if already has checkpoint pattern
  if (hasCheckpointPattern(content)) {
    console.log(`⏭️  Skipping ${filename} - already has checkpoint pattern`);
    return null;
  }

  // Find the Interaction Guidelines section
  const interactionGuidelinesMatch = content.match(/## Interaction Guidelines/);

  if (!interactionGuidelinesMatch) {
    console.log(`⚠️  Warning: ${filename} doesn't have "## Interaction Guidelines" section`);
    // Add checkpoint pattern at the end
    return content + '\n' + CHECKPOINT_PATTERN;
  }

  // Insert checkpoint pattern before Interaction Guidelines
  const insertPosition = interactionGuidelinesMatch.index;
  const updatedContent =
    content.slice(0, insertPosition) +
    CHECKPOINT_PATTERN + '\n' +
    content.slice(insertPosition);

  return updatedContent;
}

// Process a single YAML file
function processFile(filename, dryRun = false) {
  const filePath = path.join(YAML_DIR, filename);

  // Skip if not a YAML file or if it's in backups directory
  if (!filename.endsWith('.yaml') && !filename.endsWith('.yml')) {
    return;
  }

  // Skip example/template files
  if (filename.startsWith('_') || filename.includes('example')) {
    console.log(`⏭️  Skipping template/example file: ${filename}`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = addCheckpointPattern(content, filename);

    if (!updatedContent) {
      return; // File was skipped
    }

    if (dryRun) {
      console.log(`✏️  Would update: ${filename}`);
      return;
    }

    // Create backup
    const backupPath = path.join(BACKUP_DIR, `${filename}.backup`);
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log(`💾 Backed up to: ${backupPath}`);

    // Write updated content
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Updated: ${filename}`);

  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n🚀 Adding checkpoint patterns to agent YAML files...\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  ensureBackupDir();

  // Read all files in YAML directory
  const files = fs.readdirSync(YAML_DIR);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  files.forEach(filename => {
    const result = processFile(filename, dryRun);
    if (result === false) {
      errorCount++;
    } else if (result === null) {
      skippedCount++;
    } else {
      processedCount++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`   ✅ Processed: ${processedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (!dryRun) {
    console.log(`\n💾 Backups saved to: ${BACKUP_DIR}`);
    console.log('\n✨ Done! All agents now have checkpoint patterns.');
    console.log('\n💡 Tip: Review the changes and test with: "Please implement X using checkpoint pattern"');
  } else {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main();
