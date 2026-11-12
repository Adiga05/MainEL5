"""Automated test suite verifying core endpoints and routing engine."""

import sys
import unittest
import json
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))

from app.gis.corridor_filter import is_in_study_area, haversine_distance, CORRIDOR_METADATA
from app.ml.risk_scorer import compute_road_risk
from app.api.gis import get_study_area_metadata, get_drainage, get_hospitals
from app.api.rainfall import get_latest_rainfall
from app.api.dashboard import get_dashboard_overview
from app.database.database import SessionLocal


class TestUrbanFloodRiskSystem(unittest.TestCase):

    def test_study_area_bounds(self):
        """Verify Bommanahalli–Marathahalli corridor bounding limits."""
        self.assertTrue(is_in_study_area(12.938, 77.675))  # Bellandur
        self.assertTrue(is_in_study_area(12.898, 77.625))  # Bommanahalli
        self.assertTrue(is_in_study_area(12.956, 77.705))  # Marathahalli
        self.assertFalse(is_in_study_area(13.175, 77.631)) # Chickjala (North Bengaluru, outside corridor)
        self.assertFalse(is_in_study_area(16.125, 74.651)) # Hidkal Dam (Belagavi outlier)

    def test_haversine_accuracy(self):
        """Verify spherical distance calculation."""
        # 1 degree of latitude is roughly 111 km
        dist = haversine_distance(12.0, 77.0, 13.0, 77.0)
        self.assertTrue(110000.0 < dist < 112000.0)

    def test_risk_scoring_logic(self):
        """Verify road disruption risk responds monotonically to rainfall intensity."""
        features = {
            "road_id": 101,
            "dist_flood_prone_m": 80.0,
            "dist_low_lying_m": 120.0,
            "dist_primary_drain_m": 45.0,
            "road_type_factor": 0.6
        }
        dry_risk = compute_road_risk(features, rainfall_1h_mm=0.0)
        rain_risk = compute_road_risk(features, rainfall_1h_mm=45.0)

        self.assertGreater(rain_risk["probability"], dry_risk["probability"])
        self.assertIn("rainfall_factor", rain_risk["factors"])
        self.assertIn(rain_risk["risk_category"], ["high", "very_high"])

    def test_gis_layers_loaded(self):
        """Verify drainage and hospital layers are present and non-empty."""
        drainage = get_drainage()
        self.assertGreater(len(drainage["features"]), 0)

        hospitals = get_hospitals()
        self.assertGreater(len(hospitals["features"]), 0)

    def test_scenario_simulation_with_origin_and_destination(self):
        """Verify what-if scenario simulation calculates routing comparison between endpoints."""
        from app.api.scenarios import run_scenario, ScenarioRunRequest
        req = ScenarioRunRequest(
            scenario_name="Monsoon Cloudburst Test",
            rainfall_1h_mm=40.0,
            origin_lon=77.625,
            origin_lat=12.898,
            dest_lon=77.688,
            dest_lat=12.933,
            origin_name="Bommanahalli Junction",
            dest_name="Sakra World Hospital"
        )
        res = run_scenario(req, db=None)
        self.assertEqual(res["status"], "success")
        self.assertTrue(res["is_simulated"])
        self.assertIsNotNone(res.get("simulated_route"))
        self.assertIsNotNone(res.get("baseline_route"))
        self.assertIsNotNone(res.get("route_comparison"))
        comp = res["route_comparison"]
        self.assertEqual(comp["origin_name"], "Bommanahalli Junction")
        self.assertEqual(comp["dest_name"], "Sakra World Hospital")
        self.assertGreater(comp["baseline_time_min"], 0)
        self.assertGreater(comp["scenario_time_min"], 0)


if __name__ == "__main__":
    unittest.main()

