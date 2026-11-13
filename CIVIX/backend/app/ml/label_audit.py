"""Ground-truth audit for the disruption classifier.

The shipped datasets contain road geometry, flood-vulnerability features, rainfall
observations, and ward-level grievances, but no verified road-segment disruption
outcome joined to a timestamp and weather observation.  This module makes that
limitation machine-readable, so a training job cannot manufacture labels.
"""

from typing import Any, Dict


def audit_ground_truth() -> Dict[str, Any]:
    return {
        "status": "BLOCKED_NO_VERIFIED_LABELS",
        "label_definition_required": "verified road-segment disruption/closure outcome with timestamp",
        "verified_label_count": 0,
        "eligible_training_rows": 0,
        "sources_checked": [
            "BBMP grievances 2020-2025 (ward-level; no coordinates or verified road outcome)",
            "road, drainage, flood-prone and low-lying GIS layers (predictor features only)",
            "telemetry rainfall (exposure feature only)",
        ],
        "reason": (
            "No dataset contains a verified binary disruption label linked to a road segment and event time. "
            "Rule-derived scenario labels are not ground truth and are not eligible for accuracy evaluation."
        ),
        "next_requirement": "Ingest verified incident/closure records with road ID or geometry, event timestamp, and outcome.",
    }


class InsufficientGroundTruthError(RuntimeError):
    """Raised when training would otherwise fabricate labels or metrics."""
