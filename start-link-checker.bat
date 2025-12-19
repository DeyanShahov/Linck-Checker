@echo off
echo.
echo =======================================
echo Blogspot Link Checker - Server Edition
echo =======================================
echo.
echo Checking for Node.js...
echo.

REM Simple Node.js check
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Then run this batch file again.
    echo.
    echo For help, read README-Link-Checker.md
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.
echo Starting server and opening browser...
echo.

REM Start server in background
start /B npm start

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open browser
if exist index.html (
    start index.html
    echo [OK] Application started! Check your browser.
    echo Server should be running at http://localhost:3000
) else (
    echo [ERROR] index.html not found in current directory!
    echo Please make sure you're running this from the correct folder.
)

echo.
echo You can close this window now.
echo.
pause
