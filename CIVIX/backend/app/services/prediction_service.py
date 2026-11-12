"""Prediction service – bridges ML pipeline and DB."""

import json
import logging
from datetime import datetime
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.prediction import RoadPrediction
from app.models.model_run import ModelRun
from app.models.road import Road

logger = logging.getLogger(__name__)


def get_predictions(db: Session, risk_category: Optional[str] = None) -> List[RoadPrediction]:
    q = db.query(RoadPrediction)
    if risk_category:
        q = q.filter(RoadPrediction.risk_category == risk_category)
    return q.order_by(RoadPrediction.prediction_timestamp.desc()).all()


def get_road_predictions(db: Session, road_id: int) -> List[RoadPrediction]:
    return (
        db.query(RoadPrediction)
        .filter(RoadPrediction.road_id == road_id)
        .order_by(RoadPrediction.prediction_timestamp.desc())
        .all()
    )


def update_predictions(db: Session, model_version: str = None, horizon: str = "6h") -> dict:
    """Run predictions for all roads using the active model or fallback heuristic."""
    active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()

    if active_model and active_model.model_path:
        try:
            from app.ml.predict import predict_all_roads
            count = predict_all_roads(db, active_model, horizon)
            return {"method": "ml_model", "roads_predicted": count, "model": active_model.model_name}
        except Exception as e:
            logger.warning("ML prediction failed, falling back to heuristic: %s", e)

    # Fallback: heuristic
    from app.ml.risk_scorer import score_all_roads_heuristic
    count = score_all_roads_heuristic(db, horizon)
    return {"method": "heuristic_fallback", "roads_predicted": count}


def get_model_status(db: Session) -> dict:
    active = db.query(ModelRun).filter(ModelRun.is_active == True).first()
    total_models = db.query(func.count(ModelRun.id)).scalar() or 0
    return {
        "active_model": active.model_name if active else None,
        "active_model_id": active.id if active else None,
        "total_models": total_models,
    }


def get_model_performance(db: Session) -> dict:
    active = db.query(ModelRun).filter(ModelRun.is_active == True).first()
    if active and active.metrics_json:
        return json.loads(active.metrics_json)
    return {"message": "No active model with metrics"}
