"""Run ML training pipeline to pre-train XGBoost and Random Forest models and save artifacts."""

import sys
from pathlib import Path

# Add backend directory to sys.path
script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent
backend_dir = project_root / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.api.gis import get_road_risk
from app.ml.train_pipeline import run_training_pipeline


def main():
    print("=" * 70)
    print("Urban Flood Risk and Emergency Accessibility System - ML Training")
    print("Corridor: Bommanahalli–Marathahalli, Bengaluru")
    print("=" * 70)

    print("\n1. Fetching corridor road network features with spatial proximity indicators...")
    roads_fc = get_road_risk(rainfall_1h_mm=0.0)
    print(f"Loaded {len(roads_fc.get('features', []))} road segments.")

    print("\n2. Executing training pipeline (Random Forest Benchmark & XGBoost Candidate)...")
    results = run_training_pipeline(roads_fc)

    print("\n3. Training Pipeline Results:")
    print(f"  • Model Version: {results['version']}")
    print(f"  • Active Model:  {results['active_model']}")
    print(f"  • Total Samples: {results['dataset']['total_samples']}")
    print(f"  • Train Samples: {results['dataset']['train_samples']}")
    print(f"  • Test Samples:  {results['dataset']['test_samples']}")

    rf_m = results["models"]["random_forest"]["metrics"]
    print(f"\n  [Random Forest Benchmark Classifier]")
    print(f"    - Precision: {rf_m['precision']}")
    print(f"    - Recall:    {rf_m['recall']}")
    print(f"    - F1-Score:  {rf_m['f1_score']}")
    print(f"    - ROC-AUC:   {rf_m['roc_auc']}")
    print(f"    - Confusion Matrix: {rf_m['confusion_matrix']}")

    xgb_m = results["models"]["xgboost"]["metrics"]
    print(f"\n  [XGBoost Candidate Classifier]")
    print(f"    - Precision: {xgb_m['precision']}")
    print(f"    - Recall:    {xgb_m['recall']}")
    print(f"    - F1-Score:  {xgb_m['f1_score']}")
    print(f"    - ROC-AUC:   {xgb_m['roc_auc']}")
    print(f"    - Confusion Matrix: {xgb_m['confusion_matrix']}")

    print("\n  Top Feature Importances:")
    for f in results["feature_importances"][:5]:
        print(f"    - {f['feature']}: {f['importance'] * 100:.1f}%")

    print("\n[SUCCESS] Model artifacts saved to backend/models/")


if __name__ == "__main__":
    main()
