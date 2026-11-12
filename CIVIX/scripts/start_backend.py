"""Start the FastAPI backend server."""

import sys
import os
from pathlib import Path
import uvicorn

# Add backend directory to Python sys.path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))

from app.database.init_db import init_db
from app.main import app

if __name__ == "__main__":
    print("=" * 70)
    print("Urban Flood Risk and Emergency Accessibility System - Backend Server")
    print("Corridor: Bommanahalli–Marathahalli, Bengaluru, Karnataka, India")
    print("API Documentation: http://localhost:8000/docs")
    print("=" * 70)

    # Initialize DB & tables
    init_db()

    # Launch uvicorn with app object directly
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
