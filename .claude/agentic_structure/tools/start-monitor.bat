@echo off
echo Agentic Structure Folder Monitor
echo ==================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found. Checking dependencies...

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting folder monitor...
echo This will monitor your agentic_structure folder for changes and automatically update links.
echo Press Ctrl+C to stop monitoring.
echo.

REM Start the monitor
node folder-monitor.js start

pause