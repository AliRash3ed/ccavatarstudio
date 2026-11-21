@echo off
title ccavatarstudio — Cartoon Avatar & Voiceover Video Studio
color 0B
cls

echo =====================================================================
echo   ccavatarstudio — Free Offline 1080p Cartoon Avatar & Video Studio
echo   Built by Ali Rasheed Bhatti
echo =====================================================================
echo.

:: 1. Ensure we are in the project directory
cd /d "%~dp0"

:: 2. Verify Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please download and install Node.js (v20+) from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 3. Check dependencies and setup
if not exist "node_modules\" (
    echo [Setup] First run detected. Installing dependencies and Rhubarb binary...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
)

:: 4. Automatically open default browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: 5. Launch ccavatarstudio dev server
echo [Starting] ccavatarstudio is starting up...
echo [Ready] Opening http://localhost:3000 in your browser!
echo.
echo Press Ctrl+C in this window anytime to stop the server.
echo.
call npm run dev

pause
