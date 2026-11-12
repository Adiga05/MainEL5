"""Model store for loading, selecting, and executing trained ML models."""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import numpy as np

logger = logging.getLogger(__name__)

# Base directory for stored models
MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

_ACTIVE_MODEL_KEY = "xgboost"
_LOADED_MODELS: Dict[str, Any] = {}
_LOADED_SCALER = None


def get_models_dir() -> Path:
    return MODELS_DIR


def load_metadata() -> Dict[str, Any]:
    meta_path = MODELS_DIR / "model_metadata.json"
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading model metadata: {e}")
    return {
        "version": "1.2.0-bengaluru-corridor",
        "active_model": _ACTIVE_MODEL_KEY,
        "models": {
            "random_forest": {"name": "Random Forest Benchmark", "status": "available"},
            "xgboost": {"name": "XGBoost / Gradient Boosting Candidate", "status": "available"}
        }
    }


def save_metadata(meta: Dict[str, Any]):
    meta_path = MODELS_DIR / "model_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)


def get_scaler():
    global _LOADED_SCALER
    if _LOADED_SCALER is None:
        scaler_path = MODELS_DIR / "feature_scaler.joblib"
        if scaler_path.exists():
            try:
                _LOADED_SCALER = joblib.load(scaler_path)
            except Exception as e:
                logger.warning(f"Error loading scaler: {e}")
    return _LOADED_SCALER


def get_model(model_name: Optional[str] = None):
    global _ACTIVE_MODEL_KEY
    target = model_name or _ACTIVE_MODEL_KEY
    if target in _LOADED_MODELS:
        return _LOADED_MODELS[target]

    model_files = {
        "random_forest": MODELS_DIR / "random_forest_benchmark.joblib",
        "xgboost": MODELS_DIR / "xgboost_candidate.joblib"
    }

    path = model_files.get(target)
    if path and path.exists():
        try:
            model = joblib.load(path)
            _LOADED_MODELS[target] = model
            return model
        except Exception as e:
            logger.warning(f"Error loading model {target}: {e}")
    return None


def set_active_model(model_name: str) -> bool:
    global _ACTIVE_MODEL_KEY
    if model_name in ["xgboost", "random_forest"]:
        _ACTIVE_MODEL_KEY = model_name
        meta = load_metadata()
        meta["active_model"] = model_name
        save_metadata(meta)
        return True
    return False


def get_active_model_name() -> str:
    return _ACTIVE_MODEL_KEY
