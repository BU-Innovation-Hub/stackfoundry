@echo off
echo Setting up Botho Innovation Hub Project...

REM Check for Administrator privileges
net session >nul 2>nul
if errorlevel 1 (
    echo ERROR: This script requires Administrator privileges.
    echo Please run Command Prompt as Administrator and try again.
    pause
    exit /b 1
)

REM Clone repository
echo Step 1: Cloning repository...
set REPO_URL=https://github.com/BU-Innovation-Hub/stackfoundry.git
git clone %REPO_URL%
if errorlevel 1 (
    echo ERROR: Failed to clone repository from %REPO_URL%
    echo Please check your internet connection and repository URL.
    pause
    exit /b 1
)

REM Navigate to project directory
pushd stackfoundry
if errorlevel 1 (
    echo ERROR: Failed to navigate to botho-innovation-hub directory.
    echo The clone may have failed or the directory was not created.
    pause
    exit /b 1
)

REM Install dependencies
echo Step 2: Installing dependencies...
call npm run install:all

REM Setup environment
echo Step 3: Setting up environment...
copy backend\.env.example backend\.env
echo Please update backend/.env with your configuration

REM Install MongoDB (if not installed)
echo Step 4: Checking MongoDB...
where mongod >nul 2>nul
if errorlevel 1 (
    echo MongoDB not found. Please install MongoDB Community Edition
    echo Download from: https://www.mongodb.com/try/download/community
    pause
    exit /b 1
)

REM Start services
echo Step 5: Starting services...
echo Starting MongoDB...
net start MongoDB
if errorlevel 1 (
    echo ERROR: Failed to start MongoDB service.
    echo Make sure MongoDB is installed and the service is registered.
    echo You may need to run this script as Administrator.
    pause
    exit /b 1
)
echo SUCCESS: MongoDB service started.

echo Setup complete!
echo Run 'npm run dev' to start development servers
pause