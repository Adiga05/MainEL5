"""Urban Flood Risk and Emergency Accessibility System - Backend Application."""

import os
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.database.init_db import init_db
from app.api import (
    auth,
    datasets,
    gis,
    rainfall,
    predictions,
    routing,
    incidents,
    scenarios,
    dashboard
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Urban Flood Risk and Emergency Accessibility System",
    description="GIS- and AI-based decision-support system for the Bommanahalli–Marathahalli corridor, Bengaluru.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(gis.router)
app.include_router(rainfall.router)
app.include_router(predictions.router)
app.include_router(routing.router)
app.include_router(incidents.router)
app.include_router(scenarios.router)
app.include_router(dashboard.router)


@app.on_event("startup")
def on_startup():
    logger.info("Initializing database and models...")
    init_db()
    logger.info("Urban Flood Risk and Emergency Accessibility System backend initialized successfully.")


@app.get("/api")
def api_info():
    return {
        "title": "Urban Flood Risk and Emergency Accessibility System API",
        "study_area": "Bommanahalli–Marathahalli Corridor, Bengaluru, Karnataka, India",
        "documentation": "/docs",
        "status": "operational"
    }


# Mount frontend dist static files if built
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    logger.info(f"Mounting built frontend static files from {frontend_dist}")
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "title": "Urban Flood Risk and Emergency Accessibility System API",
            "study_area": "Bommanahalli–Marathahalli Corridor, Bengaluru, Karnataka, India",
            "documentation": "/docs",
            "status": "operational"
        }
