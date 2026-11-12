@echo off
title Launch Urban Flood Risk System Servers
echo ======================================================================
echo Launching Urban Flood Risk and Emergency Accessibility System
echo ======================================================================
echo.

cd /d "%~dp0"

:: Start Backend
start "Backend API (Port 8000)" cmd /k "python scripts\start_backend.py"

:: Start Frontend
cd frontend
start "Frontend UI (Port 5173)" cmd /k "npm run dev"

echo Servers launched. Opening browser...
timeout /t 3 >nul
start http://localhost:5173/

