"""Application settings loaded from environment / .env."""

import os
from pathlib import Path
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Paths ────────────────────────────────────────────
    PROJECT_ROOT: str = str(Path(__file__).resolve().parents[3])
    DATABASE_URL: str = "postgresql://postgres:postgres_secure_password@localhost:5432/civix_db"
    UPLOAD_DIR: str = "data/uploads/raw"
    DATA_DIR: str = "data"
    DATASETS_DIR: str = "../../Datasets"
    MODEL_DIR: str = "models"

    # ── Security ─────────────────────────────────────────
    SECRET_KEY: str = "urban-flood-risk-system-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # ── Study area configuration (Bommanahalli–Marathahalli corridor) ─────────
    STUDY_AREA_ID: str = "bommanahalli_marathahalli"
    STUDY_AREA_NAME: str = "Bommanahalli–Marathahalli Corridor, Bengaluru"
    STUDY_AREA_MIN_LAT: float = 12.885
    STUDY_AREA_MAX_LAT: float = 12.995
    STUDY_AREA_MIN_LON: float = 77.610
    STUDY_AREA_MAX_LON: float = 77.725
    STUDY_AREA_CENTER_LAT: float = 12.938
    STUDY_AREA_CENTER_LON: float = 77.675
    STUDY_AREA_DEFAULT_ZOOM: int = 13

    # ── ML & Routing ─────────────────────────────────────
    DEFAULT_RISK_WEIGHT: float = 0.5

    # ── Server ───────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
