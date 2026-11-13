"""Urban Flood Risk and Emergency Accessibility System - Backend Application."""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_origins=settings.cors_origins,
    allow_credentials=False,
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
    logger.info("Verifying PostgreSQL/PostGIS and applying the application schema...")
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


@app.get("/")
def root():
    """API-only root. The React application is deliberately never served here."""
    return {
        "service": "CIVIX FastAPI backend",
        "documentation": "/docs",
        "health": "/api/health",
        "frontend": settings.FRONTEND_ORIGIN,
        "status": "operational"
    }


@app.get("/api/health", tags=["Operations"])
def health():
    """Service check used by the frontend and deployment probes."""
    from app.database.database import get_db_info
    return {"service": "backend", "database": get_db_info()}
