"""Scenario model."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text

from app.database.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    scenario_type = Column(String(50))  # rainfall_event, road_closure, combined
    parameters_json = Column(Text)  # JSON: input parameters
    results_json = Column(Text)  # JSON: scenario results
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(50))
