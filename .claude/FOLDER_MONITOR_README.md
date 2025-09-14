# Agentic Structure Folder Monitor

This system automatically tracks changes in your agentic_structure folder and updates broken links when folders are renamed or moved.

## Features

- **Real-time monitoring**: Watches for file and folder changes using efficient file system events
- **Automatic link updating**: Updates markdown links, file:// URLs, and path references when folders are renamed
- **Change tracking**: Maintains a mapping of folder changes over time
- **Manual link updates**: Command-line tool for manual link fixing
- **Cross-platform**: Works on Windows, macOS, and Linux

## Quick Start

### Method 1: Using the batch file (Windows)
1. Double-click `start-monitor.bat`
2. The script will automatically install dependencies and start monitoring

### Method 2: Using PowerShell (Windows)
1. Right-click `start-monitor.ps1` and select "Run with PowerShell"
2. Or run from command line: `powershell -ExecutionPolicy Bypass -File start-monitor.ps1`

### Method 3: Manual setup
1. Install dependencies: `npm install`
2. Start monitoring: `npm start` or `node folder-monitor.js start`

## Usage

### Start Monitoring
```bash
# Start real-time monitoring
node folder-monitor.js start
```

The monitor will:
- Watch for file and folder changes
- Automatically update links in markdown files when folders are renamed
- Log all changes to the console
- Save change mappings to `.folder-mappings.json`

### Check Status
```bash
# View current monitoring status
node folder-monitor.js status
```

### Manual Link Updates
If you renamed a folder outside of the monitoring session:
```bash
# Manually update links from old name to new name
node folder-monitor.js update "old-folder-name" "new-folder-name"
```

## How It Works

### File System Monitoring
- Uses the `chokidar` library for efficient file system watching
- Monitors all files and folders in the agentic_structure directory
- Ignores system files (.git, node_modules, hidden files)

### Link Detection and Updates
The system automatically updates various link formats:

1. **Markdown links**: `[text](path/to/folder)`
2. **File URLs**: `file://path/to/folder`
3. **Relative paths**: `./folder-name`
4. **Absolute paths**: Full file system paths

### Change Tracking
- Maintains a `.folder-mappings.json` file with change history
- Tracks creation times, current paths, and previous paths
- Allows for recovery and manual corrections

## File Structure

```
agentic_structure/tools/
├── folder-monitor.js       # Main monitoring script
├── package.json           # Node.js dependencies
├── start-monitor.bat      # Windows batch file
├── start-monitor.ps1      # PowerShell script
├── .folder-mappings.json  # Change tracking (auto-generated)
└── ../FOLDER_MONITOR_README.md
```

## Configuration

The monitor automatically excludes:
- `node_modules/` directories
- `.git/` directories  
- Hidden files (starting with `.`)
- The mappings file itself

To modify what gets monitored, edit the `ignored` array in `folder-monitor.js`.

## Examples

### Scenario 1: Rename a folder
1. Start the monitor: `npm start`
2. Rename "old-project" folder to "new-project"
3. The monitor automatically updates all markdown files that reference "old-project"

### Scenario 2: Move a folder
1. The monitor detects the folder deletion and creation
2. Links are updated to point to the new location
3. Change history is preserved in the mappings file

### Scenario 3: Manual fix
If you renamed folders while monitoring was off:
```bash
node folder-monitor.js update "documentation" "docs"
```

## Troubleshooting

### Dependencies not installing
- Ensure Node.js is installed: https://nodejs.org/
- Run `npm install` manually in the agentic_structure/tools folder

### Monitor not detecting changes
- Check that you're running the script from the agentic_structure/tools directory
- Verify the folder you're changing is not in the ignored list

### Links not updating correctly
- Use the manual update command for complex renames
- Check the console output for error messages
- Verify the file permissions allow writing to markdown files

### Performance issues
- The monitor is designed to be lightweight
- If watching too many files, consider adding more items to the ignored list

## Advanced Usage

### Running as a background service (Windows)
You can run the monitor as a Windows service using tools like `node-windows`:

```bash
npm install -g node-windows
npm link node-windows
```

### Integration with VSCode
Add this to your VSCode tasks.json:
```json
{
  "label": "Start Folder Monitor",
  "type": "shell",
  "command": "node",
  "args": ["folder-monitor.js", "start"],
  "group": "build",
  "presentation": {
    "echo": true,
    "reveal": "always",
    "focus": false,
    "panel": "new"
  }
}
```

## Support

- Check the console output for detailed error messages
- Review the `.folder-mappings.json` file for change history
- Use `node folder-monitor.js status` to verify the monitoring state

## Security Notes

- The monitor only reads and writes files in the agentic_structure directory
- No external network connections are made
- All changes are logged locally in the mappings file