@echo off
echo Setting up Botho Innovation Hub Project...

REM Clone repository
echo Step 1: Cloning repository...
git clone https://github.com/YOUR_USERNAME/botho-innovation-hub.git
cd botho-innovation-hub

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
start net start MongoDB

echo Setup complete!
echo Run 'npm run dev' to start development servers
pause