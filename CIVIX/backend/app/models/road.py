"""Road model."""

from sqlalchemy import Column, Integer, String, Float, Text

from app.database.database import Base


class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    osm_id = Column(String(50), index=True)
    road_name = Column(String(255))
    road_type = Column(String(50))  # highway tag value
    geometry_json = Column(Text)  # GeoJSON geometry string
    length_m = Column(Float)
    lat = Column(Float)  # representative lat
    lon = Column(Float)  # representative lon
    centroid_lat = Column(Float)
    centroid_lon = Column(Float)
