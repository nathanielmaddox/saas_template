# PowerShell script to start the folder monitor
# Run this script to start monitoring your agentic_structure folder

Write-Host "Agentic Structure Folder Monitor" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Starting folder monitor..." -ForegroundColor Green
Write-Host "This will monitor your agentic_structure folder for changes and automatically update links." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring." -ForegroundColor Cyan
Write-Host ""

# Start the monitor
node folder-monitor.js start