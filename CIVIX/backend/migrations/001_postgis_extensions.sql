-- CIVIX baseline PostGIS migration. Run once on a new database before the API starts.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT PostGIS_Full_Version();
