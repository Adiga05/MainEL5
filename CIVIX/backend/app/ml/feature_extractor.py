"""Feature extraction and preprocessing pipeline for road flood disruption prediction."""

import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

FEATURE_NAMES = [
    "effective_rain_mm",
    "rainfall_intensity_mmh",
    "dist_primary_drain_m",
    "dist_flood_prone_m",
    "dist_low_lying_m",
    "dist_vulnerable_m",
    "drains_count_50m",
    "road_type_factor"
]


def extract_road_features(
    road_props: Dict[str, Any],
    rainfall_1h_mm: float = 0.0,
    rainfall_3h_mm: float = 0.0,
    rainfall_intensity_mmh: float = 0.0
) -> List[float]:
    """
    Extract standardized numerical vector for a single road segment.
    """
    effective_rain = max(rainfall_intensity_mmh, rainfall_1h_mm + 0.5 * rainfall_3h_mm)
    
    dist_prim = float(road_props.get("dist_primary_drain_m", 9999.0))
    dist_fp = float(road_props.get("dist_flood_prone_m", 9999.0))
    dist_ll = float(road_props.get("dist_low_lying_m", 9999.0))
    dist_vp = float(road_props.get("dist_vulnerable_m", 9999.0))
    drain_density = float(road_props.get("drains_count_50m", 0.0))
    road_type_factor = float(road_props.get("road_type_factor", 0.4))

    return [
        effective_rain,
        rainfall_intensity_mmh,
        min(dist_prim, 5000.0),
        min(dist_fp, 5000.0),
        min(dist_ll, 5000.0),
        min(dist_vp, 5000.0),
        drain_density,
        road_type_factor
    ]


def build_feature_matrix(
    roads: List[Dict[str, Any]],
    rainfall_1h_mm: float = 0.0,
    rainfall_3h_mm: float = 0.0,
    rainfall_intensity_mmh: float = 0.0
) -> Tuple[np.ndarray, List[int]]:
    """Build feature matrix X and road ID list from GeoJSON features."""
    X_rows = []
    road_ids = []
    for r in roads:
        props = r.get("properties", {})
        rid = r.get("id") or props.get("id") or 0
        feat = extract_road_features(
            props,
            rainfall_1h_mm=rainfall_1h_mm,
            rainfall_3h_mm=rainfall_3h_mm,
            rainfall_intensity_mmh=rainfall_intensity_mmh
        )
        X_rows.append(feat)
        road_ids.append(rid)
    
    return np.array(X_rows, dtype=np.float32), road_ids

