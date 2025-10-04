# PowerShell script to add checkpoint patterns to all agent YAML files
#
# Usage: .\Add-CheckpointsToAgents.ps1 [-DryRun]
#
# This script will:
# 1. Read all YAML files in .claude/yaml/
# 2. Add checkpoint workflow patterns to Interaction Guidelines
# 3. Create backups of original files
# 4. Update files with enhanced checkpoint instructions

param(
    [switch]$DryRun
)

$YamlDir = Join-Path $PSScriptRoot ".." "yaml"
$BackupDir = Join-Path $YamlDir "backups"

# Checkpoint pattern to add
$CheckpointPattern = @"

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

"@

# Create backup directory if it doesn't exist
function Ensure-BackupDir {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        Write-Host "✅ Created backup directory: $BackupDir" -ForegroundColor Green
    }
}

# Check if file already has checkpoint pattern
function Test-HasCheckpointPattern {
    param([string]$Content)

    return $Content -match "Workflow and Checkpoint Strategy" -or
           $Content -match "Task Execution Pattern" -or
           $Content -match "Anti-Hallucination Rules"
}

# Add checkpoint pattern to YAML content
function Add-CheckpointPattern {
    param(
        [string]$Content,
        [string]$Filename
    )

    # Skip if already has checkpoint pattern
    if (Test-HasCheckpointPattern -Content $Content) {
        Write-Host "⏭️  Skipping $Filename - already has checkpoint pattern" -ForegroundColor Yellow
        return $null
    }

    # Find the Interaction Guidelines section
    if ($Content -match "(?m)^## Interaction Guidelines") {
        $insertPosition = $Matches.Index
        $updatedContent = $Content.Substring(0, $insertPosition) +
                         $CheckpointPattern + "`n" +
                         $Content.Substring($insertPosition)
        return $updatedContent
    } else {
        Write-Host "⚠️  Warning: $Filename doesn't have '## Interaction Guidelines' section" -ForegroundColor Yellow
        # Add checkpoint pattern at the end
        return $Content + "`n" + $CheckpointPattern
    }
}

# Process a single YAML file
function Process-File {
    param(
        [string]$Filename,
        [bool]$IsDryRun
    )

    $FilePath = Join-Path $YamlDir $Filename

    # Skip if not a YAML file
    if (-not ($Filename -match '\.(yaml|yml)$')) {
        return
    }

    # Skip example/template files
    if ($Filename -match '^_' -or $Filename -match 'example') {
        Write-Host "⏭️  Skipping template/example file: $Filename" -ForegroundColor Cyan
        return
    }

    try {
        $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
        $updatedContent = Add-CheckpointPattern -Content $content -Filename $Filename

        if ($null -eq $updatedContent) {
            return # File was skipped
        }

        if ($IsDryRun) {
            Write-Host "✏️  Would update: $Filename" -ForegroundColor Cyan
            return
        }

        # Create backup
        $backupPath = Join-Path $BackupDir "$Filename.backup"
        Set-Content -Path $backupPath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "💾 Backed up to: $backupPath" -ForegroundColor Gray

        # Write updated content
        Set-Content -Path $FilePath -Value $updatedContent -Encoding UTF8 -NoNewline
        Write-Host "✅ Updated: $Filename" -ForegroundColor Green

    } catch {
        Write-Host "❌ Error processing ${Filename}: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main execution
function Main {
    Write-Host "`n🚀 Adding checkpoint patterns to agent YAML files...`n" -ForegroundColor Cyan

    if ($DryRun) {
        Write-Host "🔍 DRY RUN MODE - No files will be modified`n" -ForegroundColor Yellow
    }

    Ensure-BackupDir

    # Read all files in YAML directory
    $files = Get-ChildItem -Path $YamlDir -File | Select-Object -ExpandProperty Name

    $processedCount = 0
    $skippedCount = 0
    $errorCount = 0

    foreach ($filename in $files) {
        try {
            Process-File -Filename $filename -IsDryRun $DryRun
            $processedCount++
        } catch {
            $errorCount++
        }
    }

    Write-Host "`n📊 Summary:" -ForegroundColor Cyan
    Write-Host "   ✅ Processed: $processedCount" -ForegroundColor Green
    Write-Host "   ⏭️  Skipped: $skippedCount" -ForegroundColor Yellow
    Write-Host "   ❌ Errors: $errorCount" -ForegroundColor Red

    if (-not $DryRun) {
        Write-Host "`n💾 Backups saved to: $BackupDir" -ForegroundColor Gray
        Write-Host "`n✨ Done! All agents now have checkpoint patterns." -ForegroundColor Green
        Write-Host "`n💡 Tip: Review the changes and test with: ""Please implement X using checkpoint pattern""" -ForegroundColor Cyan
    } else {
        Write-Host "`n💡 Run without -DryRun to apply changes" -ForegroundColor Cyan
    }
}

Main
