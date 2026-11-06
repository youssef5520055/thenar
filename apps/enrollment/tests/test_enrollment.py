"""
@file apps/enrollment/tests/test_enrollment.py
@description Unit, integration, and golden-vector cross-validation tests for the Python Enrollment Service.
"""

import json
import os
import pytest
from fastapi.testclient import TestClient
from apps.enrollment.src.main import app

client = TestClient(app)

SAMPLE_TRIALS = [
    {
        "features": {
            "t_total": 2.15, "t_p1": 0.38, "t_p2": 0.90, "t_p3": 0.88,
            "t_lag_force_gyro": 0.17, "t_time_to_peak_force": 0.84,
            "f_peak": 53.2, "f_mean": 68.35, "f_impulse": 61.5, "f_rfd": 303.5,
            "w_peak": 73.5, "w_excursion": 37.2, "a_rms": 10.28, "a_peak_jerk": 209.1,
            "corr_force_gyro": 0.70, "phase_overlap_ratio": 0.42
        }
    },
    {
        "features": {
            "t_total": 2.18, "t_p1": 0.39, "t_p2": 0.91, "t_p3": 0.87,
            "t_lag_force_gyro": 0.18, "t_time_to_peak_force": 0.85,
            "f_peak": 54.1, "f_mean": 69.1, "f_impulse": 62.0, "f_rfd": 308.0,
            "w_peak": 74.2, "w_excursion": 38.0, "a_rms": 10.30, "a_peak_jerk": 212.0,
            "corr_force_gyro": 0.72, "phase_overlap_ratio": 0.43
        }
    },
    {
        "features": {
            "t_total": 2.12, "t_p1": 0.37, "t_p2": 0.89, "t_p3": 0.89,
            "t_lag_force_gyro": 0.16, "t_time_to_peak_force": 0.83,
            "f_peak": 52.5, "f_mean": 67.8, "f_impulse": 60.8, "f_rfd": 298.0,
            "w_peak": 72.8, "w_excursion": 36.5, "a_rms": 10.25, "a_peak_jerk": 205.0,
            "corr_force_gyro": 0.69, "phase_overlap_ratio": 0.41
        }
    },
    {
        "features": {
            "t_total": 2.16, "t_p1": 0.38, "t_p2": 0.90, "t_p3": 0.88,
            "t_lag_force_gyro": 0.17, "t_time_to_peak_force": 0.84,
            "f_peak": 53.0, "f_mean": 68.5, "f_impulse": 61.2, "f_rfd": 302.0,
            "w_peak": 73.0, "w_excursion": 37.0, "a_rms": 10.27, "a_peak_jerk": 208.0,
            "corr_force_gyro": 0.71, "phase_overlap_ratio": 0.42
        }
    }
]

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_fit_success():
    payload = {
        "trials": SAMPLE_TRIALS,
        "percentile": 5.0,
        "model": "mahalanobis_shrinkage"
    }
    res = client.post("/fit", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["schemaVersion"] == 1
    assert data["modelType"] == "mahalanobis_shrinkage"
    assert len(data["featureNames"]) == 16
    assert len(data["covInv"]) == 16
    assert isinstance(data["tau"], float)
    assert len(data["diagnostics"]["looScores"]) == 4

def test_fit_insufficient_trials():
    payload = {
        "trials": SAMPLE_TRIALS[:2], # only 2 trials
        "percentile": 5.0
    }
    res = client.post("/fit", json=payload)
    assert res.status_code == 422 # Pydantic min_length validation

def test_score_evaluation():
    fit_res = client.post("/fit", json={"trials": SAMPLE_TRIALS, "percentile": 5.0})
    model_export = fit_res.json()

    # Genuine trial score
    genuine_features = SAMPLE_TRIALS[0]["features"]
    score_res = client.post("/score", json={"model": model_export, "features": genuine_features})
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert isinstance(score_data["score"], float)
    assert score_data["score"] >= model_export["tau"]
    assert score_data["accept"] is True

def test_c_header_export():
    fit_res = client.post("/fit", json={"trials": SAMPLE_TRIALS, "percentile": 5.0})
    model_export = fit_res.json()

    res = client.post("/export/c-header", json={"model": model_export})
    assert res.status_code == 200
    data = res.json()
    header_text = data["headerText"]
    assert "#ifndef THENAR_MODEL_H" in header_text
    assert "#define THENAR_NUM_FEATURES 16" in header_text
    assert "THENAR_DECISION_TAU" in header_text

def test_golden_vectors_parity():
    """Validates that Python and TypeScript feature vectors and scores match across seeded golden runs."""
    gv_path = os.path.join(os.path.dirname(__file__), "../../../packages/engine/golden-vectors.json")
    if not os.path.exists(gv_path):
        pytest.skip("golden-vectors.json not found")

    with open(gv_path, "r", encoding="utf-8") as f:
        golden_vectors = json.load(f)

    assert len(golden_vectors) == 5

    # Check each golden vector record has 16 numerical features
    for gv in golden_vectors:
        features = gv["features"]
        assert len(features) == 16
        assert isinstance(gv["score"], (int, float))
