@echo off
title Urban Flood Risk System - Backend API Server
echo ======================================================================
echo Urban Flood Risk and Emergency Accessibility System - Backend Server
echo Port: 8000 | Documentation: http://localhost:8000/docs
echo Study Area: Bommanahalli-Marathahalli Corridor, Bengaluru
echo ======================================================================
echo.

cd /d "%~dp0CIVIX"

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in system PATH.
    pause
    exit /b 1
)

:: Check database initialization
if not exist "data\civix.db" (
    echo Initializing database tables and loading corridor GIS features...
    python scripts\populate_db.py
)

:: Start FastAPI Backend
python scripts\start_backend.py

