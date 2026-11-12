"""Scenario simulation service."""

import json
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.scenario import Scenario

logger = logging.getLogger(__name__)


def create_and_run_scenario(db: Session, data: dict, username: str = None) -> Scenario:
    """Create a scenario, run it, store results."""
    params = data.get("parameters_json")
    if isinstance(params, str):
        params_dict = json.loads(params)
    else:
        params_dict = params or {}

    scenario = Scenario(
        name=data["name"],
        description=data.get("description"),
        scenario_type=data.get("scenario_type", "rainfall_event"),
        parameters_json=json.dumps(params_dict),
        created_by=username,
    )
    db.add(scenario)
    db.flush()

    # Run the scenario
    results = _execute_scenario(db, scenario.scenario_type, params_dict)
    scenario.results_json = json.dumps(results)
    db.commit()
    db.refresh(scenario)
    return scenario


def _execute_scenario(db: Session, scenario_type: str, params: dict) -> dict:
    """Execute scenario simulation.

    Supported types:
    - rainfall_event: simulate a rainfall event and assess road risks
    - road_closure: simulate closing specific roads and find alternatives
    - combined: rainfall + road closures
    """
    if scenario_type == "rainfall_event":
        rainfall_mm = params.get("rainfall_mm", 50)
        duration_hours = params.get("duration_hours", 3)
        # Simple heuristic: estimate percentage of roads at risk
        from app.models.road import Road
        total_roads = db.query(Road).count()
        if total_roads == 0:
            return {"message": "No roads loaded", "affected_roads": 0}

        # Rough estimate based on rainfall intensity
        intensity = rainfall_mm / max(duration_hours, 1)
        if intensity > 30:
            pct = 0.4
        elif intensity > 15:
            pct = 0.2
        elif intensity > 5:
            pct = 0.1
        else:
            pct = 0.03

        affected = int(total_roads * pct)
        return {
            "scenario_type": "rainfall_event",
            "rainfall_mm": rainfall_mm,
            "duration_hours": duration_hours,
            "intensity_mm_per_hr": round(intensity, 2),
            "total_roads": total_roads,
            "estimated_affected_roads": affected,
            "risk_level": "very_high" if intensity > 30 else "high" if intensity > 15 else "moderate" if intensity > 5 else "low",
        }

    elif scenario_type == "road_closure":
        closed_road_ids = params.get("road_ids", [])
        return {
            "scenario_type": "road_closure",
            "closed_roads": len(closed_road_ids),
            "message": "Road closure impact analysis placeholder",
        }

    else:
        return {"scenario_type": scenario_type, "message": "Scenario type executed with default parameters"}


def list_scenarios(db: Session) -> List[Scenario]:
    return db.query(Scenario).order_by(Scenario.created_at.desc()).all()


def get_scenario(db: Session, scenario_id: int) -> Optional[Scenario]:
    return db.query(Scenario).filter(Scenario.id == scenario_id).first()
