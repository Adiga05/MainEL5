@echo off
title Urban Flood Risk System - Frontend UI
echo ======================================================================
echo Urban Flood Risk and Emergency Accessibility System - Frontend UI
echo Port: 5173 | URL: http://localhost:5173/
echo ======================================================================
echo.

cd /d "%~dp0CIVIX\frontend"

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in system PATH.
    pause
    exit /b 1
)

:: Start Vite dev server
npm run dev

