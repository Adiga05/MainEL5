# Urban Flood Risk and Emergency Accessibility System

An AI- and GIS-based decision-support platform designed to predict rainfall-induced road disruption risk, monitor real-time telemetry, and compute flood-aware emergency vehicle routing for the **Bommanahalli–Marathahalli corridor, Bengaluru, Karnataka, India**.

---

## 1. System Overview

Urban pluvial flooding during intense monsoon downpours frequently inundates low-lying road networks, underpasses, and sections adjacent to overflowing primary stormwater drains (Raja Kaluves). This leads to critical delays for emergency responders (ambulances and fire engines) attempting to reach major healthcare facilities.

This system integrates:
1. **Official Drainage Topology**: Primary, secondary, and tertiary stormwater drains (SWDs) from municipal KML masterplans and engineering drawings.
2. **Meteorological Telemetry**: Automated telemetry feeds from the Karnataka State Natural Disaster Monitoring Centre (KSNDMC).
3. **Topographical Vulnerabilities**: Geocoded flood-prone points, depression zones, and historical waterlogging hotspots.
4. **Civic Grievance Records**: Multi-year BBMP complaint records (2020–2025).
5. **Routable Road Network**: OpenStreetMap road centerlines with speed profiles and travel time estimates.
6. **Dynamic Routing Engine**: Risk-penalized Dijkstra routing with alternative high-ground paths and verified closure exclusion.
7. **Scenario Stress-Testing**: What-if flood simulation allowing custom starting points and destinations to evaluate transit delay and safe rerouting.
8. **Dual Role-Based Interfaces**: Municipal Authority Command Dashboard and Emergency Vehicle Driver Navigation with a modern pastel color palette (soft pink, sky blue, and light green/mint).

---

## 2. Geographic Study Area: Bommanahalli–Marathahalli Corridor

To ensure rigorous spatial accuracy, the initial implementation is restricted to the **Bommanahalli–Marathahalli corridor**:

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

### Expandable Geographic Architecture
Geographic bounding metadata is decoupled from core routing and ML algorithms (`backend/app/core/config.py` and `backend/app/gis/corridor_filter.py`). Additional Bengaluru drainage basins (e.g., Whitefield–K.R. Puram, Hebbal–Yelahanka) can be activated simply by updating the configuration without rewriting the system.

---

## 3. Audited Dataset Inventory & Findings

All 19 raw datasets provided in the project repository were programmatically audited before pipeline integration:

| Dataset Filename | Format | Geometry | Total Features | Corridor Overlap | Technical Audit Findings & Integrity Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `Primary_Drains.kml` | KML | LineString | 163 | 28 | Primary Raja Kaluve canals. De-duplicated against other layers. |
| `Secendory_Drains.kml` | KML | LineString | 870 | 160 | Arterial stormwater branches. |
| `Tertiary_Drains.kml` | KML | LineString | 5,806 | 1,180 | Roadside feeder drains. Filtered to corridor. |
| `Flood-prone_locations_map.kml` | KML | Point | 70 | 13 | BBMP recorded chronic flood locations. |
| `Low_Lying_Areas.kml` | KML | Point | 129 | 28 | Terrain depression zones vulnerable to water logging. |
| `Points_vulnerable_to_flooding.kml` | KML | Point | 200 | 42 | High-risk culvert and underpass locations. |
| `Telemetric_Rain_Gauge.kml` | KML | Point | 185 | 18 | Automated telemetry rain gauge station coordinates. |
| `Emergency_services.geojson` | GeoJSON | Point/Polygon | 2,111 | 487 | Hospitals, trauma centers, and clinics in the study corridor. |
| `Road_network.geojson` | GeoJSON | LineString | 25,719 | 16,320 | Routable OSM road centerlines with speed profiles. |
| `bangalore_urban_rainfall.csv` | CSV | Tabular | 3,337 | Active | KSNDMC hourly telemetry. **Note:** Station *Hidkal_Dam_2* (Lat: 16.125° N, Belagavi district) was flagged and excluded as a non-Bangalore geographic outlier. |
| `BBMP_2020.csv` to `BBMP_2025.csv` | CSV | Tabular | 7,604 | 752 | BBMP Storm Water Drain grievance records across 6 years. **Note:** Records contain Ward Names but NO GPS coordinates. Geocoded via ward centroids. |
| `Bommanahalli_Drainage.pdf` | PDF | Raster Drawing | 1 page | High-Res | Official BBMP SWD layout drawing (3370×2383 px). Analyzed for retaining wall dimensions. |
| `East_zone-darinage.pdf` | PDF | Raster Drawing | 1 page | High-Res | Mahadevapura & East Zone culvert masterplan. |
| `Marathalli_Drainage_Data.pdf` | PDF | Geospatial PDF | 1 page | High-Res | QGIS-compatible geospatial drainage CAD plan. |

---

## 4. Methodology & Feature Engineering

For each road segment in the corridor, spatial and telemetry indicators are computed:
- **Meteorological Indicators**: Rolling 1h, 3h, 6h, and 24h rainfall accumulation and recent intensity (mm/h).
- **Drainage Proximity**: Distance to nearest primary drain, secondary drain, and tertiary drain; drainage density (count and length in 50m and 100m buffers).
- **Terrain & Vulnerability**: Inverse distance to nearest known flood-prone hotspot, low-lying depression, and vulnerable point.
- **Road Classification Factor**: Vulnerability indexing based on carriageway type (underpasses, residential streets vs. elevated flyovers).

### Disruption Risk Scoring Formula
The disruption probability $P(\text{road})$ is formulated as:
$$P(\text{road}) = 0.45 \cdot R_{\text{rain}} + 0.25 \cdot V_{\text{flood\_proximity}} + 0.15 \cdot O_{\text{drain\_overflow}} + 0.15 \cdot T_{\text{road\_type}} \cdot R_{\text{rain}}$$
Risk categories:
- **Low**: $< 25\%$ (Green)
- **Moderate**: $25\% - 50\%$ (Yellow)
- **High**: $50\% - 75\%$ (Orange)
- **Very High**: $> 75\%$ (Red)

### Supervised Machine Learning Notice (Academic Integrity)
Per scientific research standards, **BBMP drainage complaints are not conflated with verified road closure labels**. A supervised classifier (Random Forest / XGBoost) requires systematic ground-truth logs of road impassability or flood depths. The system transparently operates on a physics-based spatial-telemetry risk engine and provides a supervised training pipeline that activates as verified incident logs are recorded.

---

## 5. Emergency Vehicle Routing Engine

Implemented via **NetworkX** on the directed road network of the corridor:
- **Weighted Edge-Cost Function**:
  $$C(\text{edge}) = \text{TravelTime}(\text{edge}) \cdot \left(1 + \lambda \cdot P(\text{road})^{\,1.5}\right)$$
  where $\lambda \ge 0$ is the flood avoidance penalty factor (configurable via UI slider).
- **Verified Road Closure Exclusion**: Any segment verified as impassable is assigned infinite cost, forcing routes through safe corridors.
- **Critical Links Analysis**: Edge betweenness centrality ranking highlights bottleneck roads whose disruption disconnects ambulances from hospitals (e.g., Sakra World Hospital, Manipal Hospital).

---

## 6. System Architecture & Separation

The system is strictly divided into four decoupled tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   1. REACT + VITE FRONTEND (Port 5173)                 │
│  - Interactive GIS Leaflet Maps       - pastel pink / sky blue theme   │
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

## 7. Independent Startup & Service URLs

Each tier operates independently and can be started, stopped, or updated without affecting other components:

| Service | Technology | Port / URL | Independent Startup Command |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 18 + Vite | `http://localhost:5173` | `run_frontend.bat` or `npm run dev` in `CIVIX/frontend` |
| **Backend API** | FastAPI + Uvicorn | `http://localhost:8000` | `run_backend.bat` or `python scripts/start_backend.py` |
| **API Docs (Swagger)** | OpenAPI 3.0 | `http://localhost:8000/docs` | Built into FastAPI backend |
| **Database** | PostgreSQL / PostGIS | Port `5432` | `docker compose up db -d` |
| **Full Stack (All-in-one)** | Windows Batch | Both ports | `run_app.bat` |
| **Docker Compose** | Docker Containers | Full Stack | `docker compose up --build` |

---

## 8. Database Setup: PostgreSQL with PostGIS

### Option A: Running via Docker Compose (Recommended)
```powershell
# Launch PostgreSQL 16 with PostGIS 3.4 in the background
docker compose up db -d
```
The database initialization script (`CIVIX/backend/init_postgis.sql`) will automatically create the `postgis` and `postgis_topology` extensions.

### Option B: Local PostgreSQL Installation
1. Install PostgreSQL 14+ and the PostGIS bundle.
2. In pgAdmin or psql, run:
   ```sql
   CREATE DATABASE civix_db;
   \c civix_db;
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Set `DATABASE_URL` in `CIVIX/backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres_secure_password@localhost:5432/civix_db
   ```
4. Run table initialization and corridor seeding:
   ```powershell
   python CIVIX/scripts/populate_db.py
   ```

*(Note: If PostgreSQL is not detected, the backend automatically and seamlessly activates its local SQLite WAL database at `CIVIX/backend/data/civix.db`).*

---

## 9. Machine Learning Pipeline & Artifacts

The backend includes a machine learning engine that serializes trained models, scalers, and evaluation metrics:

- **Primary Candidate**: **XGBoost / Gradient Boosting Classifier** (`backend/models/xgboost_candidate.joblib`)
- **Benchmark Model**: **Random Forest Classifier** (`backend/models/random_forest_benchmark.joblib`)
- **Feature Scaler**: **StandardScaler** (`backend/models/feature_scaler.joblib`)
- **Model Metadata**: Training dates, test precision, recall, F1-score, ROC-AUC, confusion matrices, and feature importances (`backend/models/model_metadata.json`).

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

## 10. Installation & Quick Start (Windows)

### Prerequisites
- Python 3.10 or newer
- Node.js 18 or newer and npm

### Step 1: Install Backend Dependencies
```powershell
cd c:\Users\prana\OneDrive\Desktop\EL5\CIVIX
pip install -r backend/requirements.txt
```

### Step 2: Initialize Database & Seed Study-Area Data
```powershell
python scripts/populate_db.py
```
*This filters and loads 2,500 corridor roads, 1,368 drainage channels, 487 emergency facilities, and default users into `data/civix.db`.*

### Step 3: Install Frontend Dependencies & Build
```powershell
cd frontend
npm install
npm run build
```

### Step 4: Run the Application
**Terminal 1 (Backend API - Port 8000):**
```powershell
cd c:\Users\prana\OneDrive\Desktop\EL5\CIVIX
python scripts/start_backend.py
```

**Terminal 2 (Frontend UI - Port 5173):**
```powershell
cd c:\Users\prana\OneDrive\Desktop\EL5\CIVIX\frontend
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 8. Demonstration Credentials

| Role | Username | Password | Default Redirect |
| :--- | :--- | :--- | :--- |
| **Municipal Authority (BBMP Officer)** | `admin` | `admin123` | `/admin/overview` |
| **Emergency Responder (Ambulance 108)** | `driver1` | `driver123` | `/driver/routing` |

*(A quick-fill button is provided on the login page for instant demonstration).*

---

## 9. REST API Directory (34 Registered Endpoints)

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
- `GET /api/rainfall/stations` – All rain gauge stations with outlier tags.
- `GET /api/rainfall/latest` – Real-time hourly and cumulative rainfall.
- `GET /api/rainfall/history` – Time-series telemetry readings.
- `POST /api/rainfall/manual` – Ingest manual ground-truth or simulated rainfall.

### Emergency Routing & Centrality
- `POST /api/routes/recommend` – Calculate risk-penalized shortest route.
- `GET /api/routes/critical-links` – Bottleneck roads ranked by betweenness centrality.

### Incident Redressal
- `GET /api/incidents` – List reported road hazards.
- `POST /api/incidents` – Driver hazard report submission.
- `PATCH /api/incidents/{id}/verify` – Municipal authority road closure verification.
- `PATCH /api/incidents/{id}/reject` – Reject false hazard report.
- `PATCH /api/incidents/{id}/resolve` – Mark road dewatered and reopened.

### Scenario Simulation & Models
- `POST /api/scenarios/run` – Execute what-if flood stress test.
- `GET /api/model/status` – Supervised training ground-truth audit.
- `GET /api/model/performance` – Feature importance ranking and candidate models.
- `POST /api/model/train` – Train supervised pipeline.
- `GET /api/predictions` – Corridor-wide predictions.
- `GET /api/predictions/{road_id}` – Single-segment explainability narrative.

### Dataset Management & Dashboard
- `GET /api/datasets` – Full audited dataset catalog.
- `POST /api/datasets/upload` – Safe dataset ingestion (UUID protected).
- `DELETE /api/datasets/{id}` – Remove dataset.
- `GET /api/dashboard/overview` – High-level municipal command metrics.

