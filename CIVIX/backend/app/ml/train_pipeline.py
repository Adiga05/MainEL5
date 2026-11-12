"""Machine Learning training pipeline for XGBoost and Random Forest disruption models."""

import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)

from app.ml.feature_extractor import FEATURE_NAMES, extract_road_features
from app.ml.model_store import get_models_dir, save_metadata

logger = logging.getLogger(__name__)


def generate_corridor_training_dataset(roads_fc: Dict[str, Any]) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate multi-scenario training records across Bengaluru monsoon storm regimes
    (Dry, Moderate, Cloudburst, Severe Deluge).
    """
    features = roads_fc.get("features", [])
    X_rows = []
    y_labels = []

    np.random.seed(42)
    rain_scenarios = [
        (0.0, 0.0, 0.0),    # Dry condition
        (15.0, 22.0, 15.0), # Moderate monsoon rain
        (45.0, 70.0, 50.0), # Heavy cloudburst
        (85.0, 130.0, 90.0) # Severe flood event
    ]

    for feat in features:
        props = feat.get("properties", {})
        dist_fp = float(props.get("dist_flood_prone_m", 9999.0))
        dist_ll = float(props.get("dist_low_lying_m", 9999.0))
        dist_vp = float(props.get("dist_vulnerable_m", 9999.0))
        dist_prim = float(props.get("dist_primary_drain_m", 9999.0))
        road_type_factor = float(props.get("road_type_factor", 0.4))
        min_dist = min(dist_fp, dist_ll, dist_vp)

        for r1, r3, r_int in rain_scenarios:
            vec = extract_road_features(props, rainfall_1h_mm=r1, rainfall_3h_mm=r3, rainfall_intensity_mmh=r_int)
            effective_rain = r1 + 0.5 * r3

            is_disrupted = 0
            if effective_rain >= 30.0 and (min_dist <= 300.0 or dist_prim <= 80.0):
                is_disrupted = 1
            elif effective_rain >= 60.0 and (min_dist <= 600.0 or dist_prim <= 150.0 or road_type_factor >= 0.6):
                is_disrupted = 1
            elif effective_rain >= 90.0:
                is_disrupted = 1

            X_rows.append(vec)
            y_labels.append(is_disrupted)

    return np.array(X_rows, dtype=np.float32), np.array(y_labels, dtype=np.int32)


def run_training_pipeline(roads_fc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Train both XGBoost/GradientBoosting (Primary Candidate) and RandomForest (Benchmark).
    Calculates test metrics, feature importances, saves models and registers metadata.
    """
    models_dir = get_models_dir()
    X, y = generate_corridor_training_dataset(roads_fc)
    
    # Stratified Train/Test Split (75% train, 25% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    # Fit Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    joblib.dump(scaler, models_dir / "feature_scaler.joblib")

    # 1. Benchmark Model: Random Forest
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_probs = rf.predict_proba(X_test)
    rf_prob_pos = rf_probs[:, 1] if rf_probs.shape[1] > 1 else rf_probs[:, 0]
    joblib.dump(rf, models_dir / "random_forest_benchmark.joblib")

    # 2. Primary Candidate: Gradient Boosting / XGBoost
    try:
        from xgboost import XGBClassifier
        gb = XGBClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            scale_pos_weight=float(np.sum(y_train == 0) / max(1, np.sum(y_train == 1))),
            random_state=42,
            eval_metric="logloss"
        )
        model_flavor = "XGBoost Classifier"
    except ImportError:
        gb = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        model_flavor = "Gradient Boosting (XGBoost compatible)"

    gb.fit(X_train, y_train)
    gb_preds = gb.predict(X_test)
    gb_probs = gb.predict_proba(X_test)
    gb_prob_pos = gb_probs[:, 1] if gb_probs.shape[1] > 1 else gb_probs[:, 0]
    joblib.dump(gb, models_dir / "xgboost_candidate.joblib")

    # Compute Feature Importances
    feat_imp = []
    for name, imp in zip(FEATURE_NAMES, gb.feature_importances_):
        feat_imp.append({
            "feature": name,
            "importance": round(float(imp), 4)
        })
    feat_imp = sorted(feat_imp, key=lambda k: k["importance"], reverse=True)

    metrics = {
        "version": "1.2.0-bengaluru-corridor",
        "active_model": "xgboost",
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "total_samples": len(X),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "positive_disruption_samples": int(np.sum(y == 1)),
            "negative_dry_samples": int(np.sum(y == 0))
        },
        "models": {
            "random_forest": {
                "name": "Random Forest Benchmark Classifier",
                "algorithm": "RandomForestClassifier",
                "hyperparameters": {"n_estimators": 100, "max_depth": 8, "class_weight": "balanced"},
                "metrics": {
                    "precision": round(float(precision_score(y_test, rf_preds, zero_division=0)), 3),
                    "recall": round(float(recall_score(y_test, rf_preds, zero_division=0)), 3),
                    "f1_score": round(float(f1_score(y_test, rf_preds, zero_division=0)), 3),
                    "roc_auc": round(float(roc_auc_score(y_test, rf_prob_pos)), 3),
                    "confusion_matrix": confusion_matrix(y_test, rf_preds).tolist()
                }
            },
            "xgboost": {
                "name": model_flavor,
                "algorithm": gb.__class__.__name__,
                "hyperparameters": {"n_estimators": 100, "learning_rate": 0.1, "max_depth": 5},
                "metrics": {
                    "precision": round(float(precision_score(y_test, gb_preds, zero_division=0)), 3),
                    "recall": round(float(recall_score(y_test, gb_preds, zero_division=0)), 3),
                    "f1_score": round(float(f1_score(y_test, gb_preds, zero_division=0)), 3),
                    "roc_auc": round(float(roc_auc_score(y_test, gb_prob_pos)), 3),
                    "confusion_matrix": confusion_matrix(y_test, gb_preds).tolist()
                }
            }
        },
        "feature_importances": feat_imp
    }

    save_metadata(metrics)
    logger.info(f"ML Pipeline trained successfully: {metrics['models']['xgboost']['metrics']}")
    return metrics
