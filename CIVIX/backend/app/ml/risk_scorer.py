"""Road flood disruption risk scoring engine.

Provides transparent, defensible risk estimation combining rainfall observations,
proximity to drainage lines, low-lying terrain, and flood-prone points.
"""

from typing import Dict, Any, List, Tuple
import math

RISK_LEVEL_LOW = "low"
RISK_LEVEL_MODERATE = "moderate"
RISK_LEVEL_HIGH = "high"
RISK_LEVEL_VERY_HIGH = "very_high"


def compute_road_risk(
    road_features: Dict[str, Any],
    rainfall_1h_mm: float = 0.0,
    rainfall_3h_mm: float = 0.0,
    rainfall_intensity_mmh: float = 0.0,
    is_simulated: bool = False
) -> Dict[str, Any]:
    """
    Compute rainfall-induced road disruption probability and risk classification.
    Clearly returns model_version and scoring methodology.
    """
    # 1. Rainfall severity factor (0.0 to 1.0)
    # 0 mm = 0.0, 15 mm = 0.3, 35 mm = 0.6, 60+ mm = 1.0 (Bengaluru intense storm thresholds)
    effective_rain = max(rainfall_intensity_mmh, rainfall_1h_mm + 0.5 * rainfall_3h_mm)
    rain_factor = min(1.0, effective_rain / 50.0)

    # 2. Proximity to flood-prone & low-lying areas (inverse distance)
    dist_fp = road_features.get("dist_flood_prone_m", 9999.0)
    dist_ll = road_features.get("dist_low_lying_m", 9999.0)
    dist_vp = road_features.get("dist_vulnerable_m", 9999.0)

    min_flood_dist = min(dist_fp, dist_ll, dist_vp)
    # Closer than 100m = high vulnerability; > 1000m = negligible
    if min_flood_dist <= 50.0:
        flood_dist_factor = 1.0
    elif min_flood_dist <= 150.0:
        flood_dist_factor = 0.8
    elif min_flood_dist <= 350.0:
        flood_dist_factor = 0.5
    elif min_flood_dist <= 750.0:
        flood_dist_factor = 0.25
    else:
        flood_dist_factor = 0.05

    # 3. Drainage indicators
    # Note: As per project guidelines, proximity to a drain does NOT automatically mean safety,
    # as overflowing SWDs (Raja Kaluves) are a primary flooding source in Bellandur-Marathahalli!
    dist_prim_drain = road_features.get("dist_primary_drain_m", 9999.0)
    drain_density_50m = road_features.get("drains_count_50m", 0)

    # When rainfall is heavy, roads directly adjacent to primary storm water drains experience overflow risk
    if dist_prim_drain < 40.0:
        drain_overflow_risk = 0.7 if effective_rain > 20.0 else 0.2
    elif dist_prim_drain < 100.0:
        drain_overflow_risk = 0.5 if effective_rain > 25.0 else 0.15
    else:
        drain_overflow_risk = 0.1

    # 4. Road classification vulnerability
    road_type_factor = road_features.get("road_type_factor", 0.4)

    # Composite Probability formulation:
    # Baseline dry-weather risk is very low (< 0.05).
    # Risk scales sharply with rainfall and spatial vulnerability.
    weighted_score = (
        0.45 * rain_factor +
        0.25 * (flood_dist_factor * (0.4 + 0.6 * rain_factor)) +
        0.15 * drain_overflow_risk +
        0.15 * road_type_factor * rain_factor
    )

    # Ensure strictly bounded probability
    probability = round(min(0.98, max(0.01, weighted_score)), 3)

    # Categorize
    if probability < 0.25:
        category = RISK_LEVEL_LOW
    elif probability < 0.50:
        category = RISK_LEVEL_MODERATE
    elif probability < 0.75:
        category = RISK_LEVEL_HIGH
    else:
        category = RISK_LEVEL_VERY_HIGH

    # Generate explainability narrative
    reasons = []
    if rain_factor > 0.4:
        reasons.append(f"Significant rainfall ({effective_rain:.1f} mm)")
    if min_flood_dist <= 200.0:
        reasons.append(f"Near known flood-prone point ({min_flood_dist:.0f}m)")
    if dist_prim_drain < 60.0 and effective_rain > 15.0:
        reasons.append(f"Adjacent to primary stormwater drain ({dist_prim_drain:.0f}m) prone to backwater/overflow")
    if road_type_factor >= 0.6:
        reasons.append(f"Local/residential road geometry")

    explanation = "; ".join(reasons) if reasons else "Normal road conditions; low flood exposure"

    return {
        "road_id": road_features.get("road_id"),
        "probability": probability,
        "risk_category": category,
        "model_version": "UFR-ML-v1.0 (Spatial-Telemetry)" if not is_simulated else "UFR-SIM-v1.0",
        "is_simulated": is_simulated,
        "explanation": explanation,
        "factors": {
            "rainfall_factor": round(rain_factor, 2),
            "flood_proximity_factor": round(flood_dist_factor, 2),
            "drain_overflow_factor": round(drain_overflow_risk, 2),
            "effective_rain_mm": round(effective_rain, 1)
        }
    }
