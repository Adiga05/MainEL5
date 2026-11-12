@echo off
title Urban Flood Risk and Emergency Accessibility System
echo ======================================================================
echo Urban Flood Risk and Emergency Accessibility System
echo Study Area: Bommanahalli-Marathahalli Corridor, Bengaluru
echo ======================================================================
echo.
echo Starting FastAPI Backend and React Frontend...
echo.

cd /d "%~dp0CIVIX"

:: Check if python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not found in PATH.
    pause
    exit /b 1
)

:: Ensure database is populated
if not exist "data\civix.db" (
    echo Populating database with corridor features...
    python scripts\populate_db.py
)

:: Start Backend Server
start "Urban Flood Risk - Backend API" cmd /k "python scripts\start_backend.py"

:: Start Frontend Server
cd frontend
start "Urban Flood Risk - Frontend UI" cmd /k "npm run dev"

echo.
echo Both servers have been launched!
echo Backend API Docs: http://localhost:8000/docs
echo Frontend Web UI:  http://localhost:5173/
echo.
echo Opening browser in 3 seconds...
timeout /t 3 >nul
start http://localhost:5173/

