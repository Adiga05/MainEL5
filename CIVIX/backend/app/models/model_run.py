"""ML model run metadata."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean

from app.database.database import Base


class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(100))
    training_timestamp = Column(DateTime, default=datetime.utcnow)
    metrics_json = Column(Text)  # JSON: accuracy, precision, recall, f1, auc
    dataset_version = Column(String(50))
    feature_importance_json = Column(Text)  # JSON dict
    model_path = Column(String(500))
    is_active = Column(Boolean, default=False)
