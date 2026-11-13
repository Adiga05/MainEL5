# Database and data inspection

The backend is PostgreSQL/PostGIS-only. It will not silently replace the database
with SQLite if Postgres is unavailable.

## Start and initialise

From the `EL5` folder:

```powershell
docker compose up db -d
```

The Docker init script applies PostGIS extensions on first creation. Start the
backend afterwards; its startup creates the SQLAlchemy tables and seeds only the
documented demonstration users.

## Inspect without a database GUI

- `http://localhost:8000/docs` — API contract and test console
- `http://localhost:8000/api/database/status` — PostgreSQL and PostGIS health
- `http://localhost:8000/api/database/inspect` — tables and real row counts
- `http://localhost:8000/api/datasets` — dataset catalogue
- `http://localhost:8000/api/model/status` — label audit and artifact status

## pgAdmin / DBeaver

Connect to `localhost:5432` with database `civix_db`, user `postgres`, and the
password in the root `.env`. Browse `Schemas > public > Tables` and run:

```sql
SELECT PostGIS_Version();
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```

Do not use `backend/data/civix.db` for deployment or inspection; it is a legacy
SQLite artifact and is not used by the backend.
