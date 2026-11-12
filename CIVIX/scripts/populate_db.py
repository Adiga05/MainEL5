"""Load filtered study-area data directly into SQLite database."""

import os
import sys
import json
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, r"c:\Users\prana\OneDrive\Desktop\EL5\CIVIX\backend")

from app.database.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.road import Road
from app.models.drainage import Drainage
from app.models.hospital import Hospital
from app.models.incident import Incident
from app.models.rainfall import RainfallStation, RainfallObservation
from app.gis.road_processor import load_study_area_roads
from app.gis.drainage_processor import load_and_deduplicate_drainage
from app.gis.emergency_facility_processor import load_study_area_hospitals
from app.core.security import hash_password


def populate():
    datasets_dir = r"c:\Users\prana\OneDrive\Desktop\EL5\Datasets"
    db = SessionLocal()

    print("Checking database tables...")
    Base.metadata.create_all(bind=engine)

    # 1. Seed Admin & Driver
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(username="admin", password_hash=hash_password("admin123"), role="admin")
        db.add(admin)
    else:
        admin.password_hash = hash_password("admin123")

    driver = db.query(User).filter(User.username == "driver1").first()
    if not driver:
        driver = User(username="driver1", password_hash=hash_password("driver123"), role="driver")
        db.add(driver)
    db.commit()
    print("Users verified.")

    # 2. Seed Roads
    if db.query(Road).count() == 0:
        print("Loading roads into database...")
        road_geojson = os.path.join(datasets_dir, "Road_network.geojson")
        roads_fc = load_study_area_roads(road_geojson, max_roads=2500)
        road_objs = []
        for feat in roads_fc.get("features", []):
            p = feat["properties"]
            geom_str = json.dumps(feat["geometry"])
            c = p.get("centroid", [77.675, 12.938])
            r = Road(
                id=p["id"],
                osm_id=p.get("osm_id", f"way_{p['id']}"),
                road_name=p.get("road_name", "Road"),
                road_type=p.get("road_type", "residential"),
                geometry_json=geom_str,
                length_m=p.get("length_m", 50.0),
                lat=c[1],
                lon=c[0],
                centroid_lat=c[1],
                centroid_lon=c[0]
            )
            road_objs.append(r)
        db.bulk_save_objects(road_objs)
        db.commit()
        print(f"Loaded {len(road_objs)} roads into database.")
    else:
        print(f"Roads already exist ({db.query(Road).count()} rows).")

    # 3. Seed Drainage
    if db.query(Drainage).count() == 0:
        print("Loading drainage network into database...")
        drain_fc = load_and_deduplicate_drainage(datasets_dir)
        drain_objs = []
        for feat in drain_fc.get("features", []):
            p = feat["properties"]
            geom_str = json.dumps(feat["geometry"])
            d = Drainage(
                drainage_type=p.get("drainage_type", "primary"),
                geometry_json=geom_str,
                attributes_json=json.dumps(p),
                source_file="KML_Layers"
            )
            drain_objs.append(d)
        db.bulk_save_objects(drain_objs)
        db.commit()
        print(f"Loaded {len(drain_objs)} drainage segments into database.")
    else:
        print(f"Drainage already exists ({db.query(Drainage).count()} rows).")

    # 4. Seed Hospitals
    if db.query(Hospital).count() == 0:
        print("Loading hospitals into database...")
        hosp_geojson = os.path.join(datasets_dir, "Emergency_services.geojson")
        hosp_fc = load_study_area_hospitals(hosp_geojson)
        hosp_objs = []
        for feat in hosp_fc.get("features", []):
            p = feat["properties"]
            c = feat["geometry"]["coordinates"]
            h = Hospital(
                name=p.get("name", "Emergency Center"),
                latitude=c[1],
                longitude=c[0],
                category=p.get("category", "hospital"),
                address=p.get("address", "Bommanahalli–Marathahalli Corridor")
            )
            hosp_objs.append(h)
        db.bulk_save_objects(hosp_objs)
        db.commit()
        print(f"Loaded {len(hosp_objs)} emergency facilities into database.")
    else:
        print(f"Hospitals already exist ({db.query(Hospital).count()} rows).")

    # 5. Seed Incidents
    if db.query(Incident).count() == 0:
        print("Seeding sample incident reports...")
        first_road = db.query(Road).first()
        road_id = first_road.id if first_road else None

        inc1 = Incident(
            road_id=road_id,
            incident_type="waterlogging",
            description="Bellandur EcoSpace underpass carriageway flooded under ~2 feet of water. Impassable for low clearance vehicles.",
            reported_by="Ambulance 108 Crew #4",
            reported_at=datetime.now(timezone.utc),
            verification_status="verified",
            resolution_status="unresolved",
            latitude=12.9298,
            longitude=77.6835,
            verified_by="BBMP SWD Engineer",
            verified_at=datetime.now(timezone.utc),
            comments="Verified by field patrol; routing detour in effect."
        )
        inc2 = Incident(
            road_id=road_id,
            incident_type="drainage_overflow",
            description="Raja Kaluve backflow onto Marathahalli Outer Ring Road service link near Kalamandir.",
            reported_by="Emergency Response Unit #12",
            reported_at=datetime.now(timezone.utc),
            verification_status="under_verification",
            resolution_status="unresolved",
            latitude=12.9561,
            longitude=77.7022,
            comments="Awaiting ward engineer inspection."
        )
        db.add(inc1)
        db.add(inc2)
        db.commit()
        print("Sample incidents seeded.")

    db.close()
    print("Database population complete!")


if __name__ == "__main__":
    populate()

