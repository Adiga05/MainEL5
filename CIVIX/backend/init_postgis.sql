-- ======================================================================
-- Urban Flood Risk and Emergency Accessibility System
-- PostGIS Database Initialization Script
-- Corridor: Bommanahalli–Marathahalli, Bengaluru
-- ======================================================================

-- 1. Enable PostGIS Spatial Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Verify PostGIS Version
SELECT PostGIS_Full_Version();

-- 3. Schema and Spatial Indexes will be created by SQLAlchemy Base.metadata.create_all()
-- For spatial performance in PostgreSQL/PostGIS, the following spatial GIST indices can be created:
-- CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST (ST_GeomFromGeoJSON(geometry_json));
-- CREATE INDEX IF NOT EXISTS idx_drainage_geom ON drainage USING GIST (ST_GeomFromGeoJSON(geometry_json));
-- CREATE INDEX IF NOT EXISTS idx_hospitals_geom ON hospitals USING GIST (ST_GeomFromGeoJSON(geometry_json));

