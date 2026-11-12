# Urban Flood Risk and Emergency Accessibility System

An AI- and GIS-based decision-support platform designed to predict rainfall-induced road disruption risk, monitor real-time telemetry, and compute flood-aware emergency vehicle routing for the **Bommanahalli–Marathahalli corridor, Bengaluru, Karnataka, India**.

---

## 1. System Overview

Urban pluvial flooding during intense monsoon downpours frequently inundates low-lying road networks, underpasses, and sections adjacent to overflowing primary stormwater drains (Raja Kaluves). This leads to critical delays for emergency responders (ambulances and fire engines) attempting to reach major healthcare facilities.

This system integrates:
1. **Official Drainage Topology**: Primary, secondary, and tertiary stormwater drains (SWDs) from municipal KML masterplans and engineering drawings.
2. **Meteorological Telemetry**: Automated telemetry feeds from the Karnataka State Natural Disaster Monitoring Centre (KSNDMC) and real-time Open-Meteo observations.
3. **Topographical Vulnerabilities**: Geocoded flood-prone points, depression zones, and historical waterlogging hotspots.
4. **Civic Grievance Records**: Multi-year BBMP complaint records (2020–2025).
5. **Routable Road Network**: OpenStreetMap road centerlines with speed profiles and travel time estimates.
6. **Dynamic Routing Engine**: Risk-penalized Dijkstra routing with alternative high-ground paths and verified closure exclusion.
7. **Scenario Stress-Testing**: What-if flood simulation allowing custom origin and destination selection to evaluate transit delays and rerouting.
8. **Dual Role-Based Interfaces**: Municipal Authority Command Dashboard and Emergency Vehicle Driver Navigation with a modern pastel color palette (soft pink, sky blue, and light green/mint).

---

## 2. Decoupled 4-Tier Architecture

The system is strictly divided into four independently deployable tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   1. REACT + VITE FRONTEND (Port 5173)                 │
│  - Interactive GIS Leaflet Maps       - Pastel pink / sky blue theme   │
│  - Authority & Driver UI              - Live weather telemetry widget  │
│  - Model Management Interface         - Real-time API health monitor   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API (JSON / GeoJSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   2. FASTAPI BACKEND API (Port 8000)                   │
│  - 36 Modular REST Endpoints          - NetworkX Dijkstra routing      │
│  - Real-Time Open-Meteo Telemetry     - Dataset ingestion & audit      │
│  - Corridor Spatial Feature Engine    - PostGIS / SQLite Data Layer    │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
                ▼                                        ▼
┌────────────────────────────────┐      ┌────────────────────────────────┐
│   3. DATABASE & POSTGIS TIER   │      │     4. MACHINE LEARNING TIER   │
│  - PostgreSQL + PostGIS Ext    │      │  - XGBoost Candidate Model     │
│  - PostGIS Spatial Geometries  │      │  - Random Forest Benchmark     │
│  - Roads, Drains, Hotspots     │      │  - StandardScaler Pipeline     │
│  - Incident & Routing Logs     │      │  - Serialized Artifacts (.joblib)│
│  - Resilient SQLite Fallback   │      │  - MLflow Tracking Interface   │
└────────────────────────────────┘      └────────────────────────────────┘
```

---

## 3. Independent Startup Commands & Service URLs

Each tier operates independently and can be started, stopped, or updated without affecting other components:

| Service | Technology | Port / URL | Independent Startup Command |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 18 + Vite | `http://localhost:5173` | `run_frontend.bat` or `npm run dev` in `CIVIX/frontend` |
| **Backend API** | FastAPI + Uvicorn | `http://localhost:8000` | `run_backend.bat` or `python CIVIX/scripts/start_backend.py` |
| **API Docs (Swagger)** | OpenAPI 3.0 | `http://localhost:8000/docs` | Built into FastAPI backend |
| **Database** | PostgreSQL / PostGIS | Port `5432` | `docker compose up db -d` |
| **Full Stack (All-in-one)** | Windows Batch | Both ports | `run_app.bat` |
| **Docker Compose** | Docker Containers | Full Stack | `docker compose up --build` |

---

## 4. Geographic Study Area: Bommanahalli–Marathahalli Corridor

To ensure spatial accuracy, the implementation is restricted to the **Bommanahalli–Marathahalli corridor**:

- **Study Area Boundaries**:
  - **Min Latitude**: `12.885° N` (Bommanahalli / Begur border)
  - **Max Latitude**: `12.995° N` (Mahadevapura / Outer Ring Road north)
  - **Min Longitude**: `77.610° E` (Hosur Road / Silk Board link)
  - **Max Longitude**: `77.725° E` (Marathahalli / Varthur link)
  - **Center Coordinate**: `12.938° N, 77.675° E`
- **Key Monitored Corridors & Nodes**:
  - Bommanahalli Junction (NH-44 / Hosur Road)
  - HSR Layout (Sectors 1 to 7)
  - Bellandur Lake & Outer Ring Road (ORR) Junction
  - Devarabeesanahalli Tech Corridor & Underpasses
  - Kadubeesanahalli Junction
  - Marathahalli Intersection (Old Airport Road / ORR)
  - Mahadevapura Drainage Basin

---

## 5. Database Setup: PostgreSQL with PostGIS

### Option A: Running via Docker Compose (Recommended)
```powershell
docker compose up db -d
```
The initialization script (`CIVIX/backend/init_postgis.sql`) automatically provisions PostGIS extensions and spatial tables.

### Option B: Local PostgreSQL Installation
1. Install PostgreSQL 14+ and the PostGIS bundle.
2. In pgAdmin or psql:
   ```sql
   CREATE DATABASE civix_db;
   \c civix_db;
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Set `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres_secure_password@localhost:5432/civix_db
   ```
4. Run table initialization and corridor seeding:
   ```powershell
   python CIVIX/scripts/populate_db.py
   ```

*(Automatic Fallback: If PostgreSQL is not detected, the backend automatically activates its local SQLite WAL database at `CIVIX/backend/data/civix.db`).*

---

## 6. Machine Learning Pipeline & Artifacts

The backend includes a machine learning engine that serializes trained models, scalers, and evaluation metrics:

- **Primary Candidate**: **XGBoost / Gradient Boosting Classifier** (`CIVIX/backend/models/xgboost_candidate.joblib`)
- **Benchmark Model**: **Random Forest Classifier** (`CIVIX/backend/models/random_forest_benchmark.joblib`)
- **Feature Scaler**: **StandardScaler** (`CIVIX/backend/models/feature_scaler.joblib`)
- **Model Metadata**: Training dates, test precision, recall, F1-score, ROC-AUC, confusion matrices, and feature importances (`CIVIX/backend/models/model_metadata.json`).

### Re-training the Models
To retrain both models on the latest spatial features and save updated `.joblib` artifacts:
```powershell
python CIVIX/scripts/train_ml_models.py
```
Or trigger retraining directly from the Authority Dashboard UI or via REST API:
```http
POST http://localhost:8000/api/model/train
```

---

## 7. Demonstration Credentials

| Role | Username | Password | Default Redirect |
| :--- | :--- | :--- | :--- |
| **Municipal Authority (BBMP Officer)** | `admin` | `admin123` | `/admin/overview` |
| **Emergency Responder (Ambulance 108)** | `driver1` | `driver123` | `/driver/routing` |

*(A quick-fill button is provided on the login page for instant demonstration).*

---

## 8. REST API Directory (36 Registered Endpoints)

Interactive Swagger UI documentation is available at **`http://localhost:8000/docs`**.

### Authentication
- `POST /api/auth/login` – Authenticate user and issue JWT token.
- `POST /api/auth/register` – Register emergency responder.
- `GET /api/auth/me` – Current authenticated user profile.

### GIS & Spatial Layers
- `GET /api/gis/study-area` – Active corridor boundary metadata.
- `GET /api/gis/roads` – Routable road centerlines GeoJSON.
- `GET /api/gis/drainage` – SWD channels GeoJSON (`?drainage_type=primary|secondary|tertiary`).
- `GET /api/gis/hospitals` – Emergency medical facilities.
- `GET /api/gis/flood-prone` – Chronic flood hotspots.
- `GET /api/gis/low-lying` – Terrain depression areas.
- `GET /api/gis/vulnerable-points` – Vulnerable points.
- `GET /api/gis/rain-gauges` – Telemetric rain gauge stations.
- `GET /api/gis/complaints` – Historical BBMP grievance ward summaries.
- `GET /api/gis/road-risk` – Road network with real-time disruption probabilities.

### Meteorological Telemetry
- `GET /api/rainfall/live-weather` – Real-time Bengaluru weather forecast telemetry.
- `GET /api/rainfall/stations` – All rain gauge stations with outlier tags.
- `GET /api/rainfall/latest` – Real-time hourly and cumulative rainfall.
- `GET /api/rainfall/history` – Time-series telemetry readings.
- `POST /api/rainfall/manual` – Ingest manual ground-truth or simulated rainfall.

### Emergency Routing & Centrality
- `POST /api/routes/recommend` – Calculate risk-penalized shortest route and persist `RoutingResult`.
- `GET /api/routes/critical-links` – Bottleneck roads ranked by betweenness centrality.

### Incident Redressal
- `GET /api/incidents` – List reported road hazards.
- `POST /api/incidents` – Driver hazard report submission.
- `PATCH /api/incidents/{id}/verify` – Municipal authority road closure verification.
- `PATCH /api/incidents/{id}/reject` – Reject false hazard report.
- `PATCH /api/incidents/{id}/resolve` – Mark road dewatered and reopened.

### Scenario Simulation & Models
- `POST /api/scenarios/run` – Execute what-if flood stress test.
- `GET /api/model/status` – Model training state and active inference engine.
- `GET /api/model/performance` – Feature importance ranking, confusion matrices, ROC-AUC.
- `GET /api/model/models` – List stored model artifacts and file sizes.
- `POST /api/model/select` – Switch active candidate model (`xgboost` vs `random_forest`).
- `POST /api/model/train` – Train supervised pipeline and serialize artifacts.
- `GET /api/database/status` – Inspect PostgreSQL / PostGIS connection status.
- `GET /api/predictions` – Corridor-wide predictions.
- `GET /api/predictions/{road_id}` – Single-segment explainability narrative.

### Dataset Management & Dashboard
- `GET /api/datasets` – Full audited dataset catalog.
- `POST /api/datasets/upload` – Safe dataset ingestion (UUID protected).
- `DELETE /api/datasets/{id}` – Remove dataset.
- `GET /api/dashboard/overview` – High-level municipal command metrics.
