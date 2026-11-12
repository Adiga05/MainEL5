import os
import json
import csv
import re
import math
from datetime import datetime

STUDY_AREA_CONFIG = {
    "id": "bommanahalli_marathahalli_corridor",
    "name": "Bommanahalli–Marathahalli Corridor",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "bbox": {
        "min_lat": 12.885,
        "max_lat": 12.995,
        "min_lon": 77.610,
        "max_lon": 77.725
    },
    "key_localities": [
        "Bommanahalli",
        "HSR Layout",
        "Bellandur",
        "Devarabeesanahalli",
        "Kadubeesanahalli",
        "Marathahalli",
        "Mahadevapura"
    ],
    "center": {
        "lat": 12.938,
        "lon": 77.675
    },
    "default_zoom": 13
}

def is_point_in_study_area(lat, lon, bbox=None):
    if bbox is None:
        bbox = STUDY_AREA_CONFIG["bbox"]
    if lat is None or lon is None:
        return False
    return (bbox["min_lat"] <= lat <= bbox["max_lat"] and
            bbox["min_lon"] <= lon <= bbox["max_lon"])

def audit_datasets(data_dir):
    inventory = {
        "audit_timestamp": datetime.now().isoformat(),
        "study_area": STUDY_AREA_CONFIG,
        "datasets": {}
    }
    
    files = sorted(os.listdir(data_dir))
    
    for filename in files:
        filepath = os.path.join(data_dir, filename)
        ext = os.path.splitext(filename)[1].lower()
        size_bytes = os.path.getsize(filepath)
        
        info = {
            "filename": filename,
            "format": ext.replace(".", "").upper(),
            "size_kb": round(size_bytes / 1024, 2),
            "feature_count": 0,
            "study_area_overlap_count": 0,
            "geometry_type": "Unknown",
            "crs": "EPSG:4326 (WGS84)",
            "columns": [],
            "issues": [],
            "summary": ""
        }
        
        # 1. Rainfall CSV
        if filename == "bangalore_urban_rainfall.csv":
            info["type"] = "Rainfall Observations"
            stations = set()
            records_in_area = 0
            earliest_date = None
            latest_date = None
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f)
                info["columns"] = reader.fieldnames
                row_count = 0
                for row in reader:
                    row_count += 1
                    try:
                        lat = float(row.get("Latitude", 0))
                        lon = float(row.get("Longitude", 0))
                        station = row.get("Station")
                        stations.add((station, lat, lon))
                        if is_point_in_study_area(lat, lon):
                            records_in_area += 1
                        time_str = row.get("Data Acquisition Time")
                        if time_str:
                            if earliest_date is None or time_str < earliest_date:
                                earliest_date = time_str
                            if latest_date is None or time_str > latest_date:
                                latest_date = time_str
                    except:
                        pass
                info["feature_count"] = row_count
                info["study_area_overlap_count"] = records_in_area
                info["unique_stations_total"] = len(stations)
                area_stations = [s for s in stations if is_point_in_study_area(s[1], s[2])]
                info["study_area_stations"] = [{"name": s[0], "lat": s[1], "lon": s[2]} for s in area_stations]
                info["date_range"] = {"earliest": earliest_date, "latest": latest_date}
                info["summary"] = f"{row_count} hourly rainfall readings from {len(stations)} telemetry stations ({len(area_stations)} within/bordering study corridor)."

        # 2. BBMP Complaints CSVs
        elif filename.startswith("BBMP_") and ext == ".csv":
            info["type"] = "Municipal Grievances (SWD/Waterlogging)"
            categories = set()
            sub_categories = set()
            wards = set()
            corridor_ward_keywords = ["bommanahalli", "bellandur", "marathahalli", "mahadevapura", "hsr", "doddanekundi", "varthur", "garudachar"]
            corridor_complaints = 0
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f)
                info["columns"] = reader.fieldnames
                row_count = 0
                for row in reader:
                    row_count += 1
                    ward = row.get("Ward Name", "") or ""
                    cat = row.get("Category", "") or ""
                    sub = row.get("Sub Category", "") or ""
                    categories.add(cat)
                    sub_categories.add(sub)
                    wards.add(ward)
                    if any(kw in ward.lower() for kw in corridor_ward_keywords):
                        corridor_complaints += 1
                info["feature_count"] = row_count
                info["study_area_overlap_count"] = corridor_complaints
                info["unique_wards"] = len(wards)
                info["sub_categories"] = list(sub_categories)[:10]
                info["issues"].append("BBMP grievance records contain Ward Names but NO latitude/longitude coordinates. Geocoding requires ward polygon/centroid mapping.")
                info["summary"] = f"{row_count} grievance records across {len(wards)} wards. {corridor_complaints} records match study corridor wards."

        # 3. GeoJSON files
        elif ext == ".geojson":
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    data = json.load(f)
                features = data.get("features", [])
                info["feature_count"] = len(features)
                geom_types = set()
                sample_props = []
                in_area = 0
                for feat in features:
                    geom = feat.get("geometry", {})
                    g_type = geom.get("type", "Unknown")
                    geom_types.add(g_type)
                    if not sample_props and feat.get("properties"):
                        sample_props = list(feat["properties"].keys())
                    # Check bbox
                    coords = geom.get("coordinates", [])
                    def check_any_coord(c):
                        if isinstance(c, (list, tuple)) and len(c) >= 2:
                            if isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                                return is_point_in_study_area(c[1], c[0])
                            for sub in c:
                                if check_any_coord(sub):
                                    return True
                        return False
                    if check_any_coord(coords):
                        in_area += 1
                info["geometry_type"] = list(geom_types)
                info["columns"] = sample_props
                info["study_area_overlap_count"] = in_area
                if filename == "Emergency_services.geojson":
                    info["type"] = "Emergency Services (Hospitals & Clinics)"
                    info["summary"] = f"{len(features)} emergency facilities across Bengaluru; {in_area} within Bommanahalli–Marathahalli study area."
                elif filename == "Road_network.geojson":
                    info["type"] = "Road Network (OSM Centerlines)"
                    info["summary"] = f"{len(features)} total road/way elements; {in_area} intersect the Bommanahalli–Marathahalli corridor."
            except Exception as e:
                info["issues"].append(f"JSON parse error: {str(e)}")

        # 4. KML files
        elif ext == ".kml":
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
                placemarks = re.findall(r'<Placemark[\s\S]*?</Placemark>', text)
                info["feature_count"] = len(placemarks)
                
                # Check geometries
                has_points = bool(re.search(r'<Point>', text))
                has_lines = bool(re.search(r'<LineString>', text))
                has_polys = bool(re.search(r'<Polygon>', text))
                g_types = []
                if has_points: g_types.append("Point")
                if has_lines: g_types.append("LineString")
                if has_polys: g_types.append("Polygon")
                info["geometry_type"] = g_types or ["Unknown"]
                
                # Extract coordinates & check study area
                coord_blocks = re.findall(r'<coordinates>([\s\S]*?)</coordinates>', text)
                in_area = 0
                for block in coord_blocks:
                    block_in_area = False
                    for pair in block.strip().split():
                        parts = pair.split(',')
                        if len(parts) >= 2:
                            try:
                                lon, lat = float(parts[0]), float(parts[1])
                                if is_point_in_study_area(lat, lon):
                                    block_in_area = True
                                    break
                            except:
                                pass
                    if block_in_area:
                        in_area += 1
                info["study_area_overlap_count"] = in_area
                
                if "Drain" in filename:
                    info["type"] = "Drainage Network Infrastructure"
                    info["summary"] = f"{len(placemarks)} drainage features ({', '.join(g_types)}); {in_area} intersect the Bommanahalli–Marathahalli corridor."
                elif "Flood" in filename or "Lying" in filename or "vulnerable" in filename:
                    info["type"] = "Flood Risk / Vulnerability Locations"
                    info["summary"] = f"{len(placemarks)} flood vulnerability locations; {in_area} within study area."
                elif "Rain_Gauge" in filename:
                    info["type"] = "Telemetric Rain Gauge Stations"
                    info["summary"] = f"{len(placemarks)} rain gauge stations; {in_area} in/near study corridor."
            except Exception as e:
                info["issues"].append(f"KML parse error: {str(e)}")

        # 5. PDF files
        elif ext == ".pdf":
            info["type"] = "Drainage Engineering Report / Masterplan"
            info["summary"] = f"Official drainage engineering documentation for the study zone. Used for infrastructure cross-referencing and validation."
            info["geometry_type"] = "Unstructured Document (Text/Tables/Maps)"
            info["issues"].append("Requires OCR/text extraction; spatial data must be cross-referenced with KML layers.")

        inventory["datasets"][filename] = info

    return inventory

if __name__ == "__main__":
    data_dir = r"c:\Users\prana\OneDrive\Desktop\EL5\Datasets"
    res = audit_datasets(data_dir)
    out_path = r"c:\Users\prana\OneDrive\Desktop\EL5\CIVIX\data\processed\dataset_inventory.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
    print(f"Dataset audit complete! Saved to {out_path}")
    print(f"Total datasets analyzed: {len(res['datasets'])}")
    for name, d in res["datasets"].items():
        print(f"  [{d['format']:4}] {name:40} | Features: {d['feature_count']:5} | Corridor Overlap: {d['study_area_overlap_count']:5} | {d['type']}")

