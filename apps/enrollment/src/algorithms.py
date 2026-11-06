"""
@file apps/enrollment/src/algorithms.py
@description Core machine learning fitting routines: Ledoit-Wolf covariance shrinkage,
leave-one-out threshold calibration, and C-header synthesis.

WHY THIS EXISTS:
Performs numerically robust statistical model fitting on small enrollment trial sets (3-10 genuine trials),
preventing matrix singularity while guaranteeing calibrated decision thresholds (tau).
"""

import numpy as np
from sklearn.covariance import LedoitWolf
from sklearn.svm import OneClassSVM
from sklearn.neighbors import NearestNeighbors
from typing import Dict, List, Tuple
from .features import CANONICAL_FEATURE_NAMES
from .models import ModelExport, Diagnostics

def extract_matrix(trials_features: List[Dict[str, float]], feature_names: List[str]) -> np.ndarray:
    """Converts a list of feature dictionaries into an (N, D) float64 numpy array."""
    data = []
    for tf in trials_features:
        row = [float(tf.get(name, 0.0)) for name in feature_names]
        data.append(row)
    return np.array(data, dtype=np.float64)

def fit_mahalanobis_shrinkage(
    trials_features: List[Dict[str, float]],
    percentile: float = 5.0
) -> ModelExport:
    """
    Fits Ledoit-Wolf shrinkage covariance on genuine enrollment trials.
    Calibrates threshold tau using Leave-One-Out (LOO) genuine scoring.
    """
    feature_names = CANONICAL_FEATURE_NAMES
    X = extract_matrix(trials_features, feature_names)
    n_samples, n_features = X.shape

    # 1. Feature standardization
    scaling_mean = np.mean(X, axis=0)
    scaling_std = np.std(X, axis=0)
    # Prevent division by zero for low-variance features
    scaling_std = np.where(scaling_std < 1e-4, 1.0, scaling_std)

    X_scaled = (X - scaling_mean) / scaling_std
    mean_scaled = np.mean(X_scaled, axis=0)

    # 2. Ledoit-Wolf shrinkage estimation
    if n_samples >= 3:
        lw = LedoitWolf().fit(X_scaled)
        cov_inv = np.linalg.pinv(lw.covariance_)
    else:
        cov_inv = np.eye(n_features)

    # 3. Leave-One-Out Cross Validation for Tau Calibration
    loo_scores: List[float] = []
    for i in range(n_samples):
        # Fit on all except trial i
        mask = np.ones(n_samples, dtype=bool)
        mask[i] = False
        X_train = X_scaled[mask]
        x_val = X_scaled[i]

        mean_loo = np.mean(X_train, axis=0)
        if len(X_train) >= 3:
            lw_loo = LedoitWolf().fit(X_train)
            inv_loo = np.linalg.pinv(lw_loo.covariance_)
        else:
            inv_loo = np.eye(n_features)

        diff = x_val - mean_loo
        # Mahalanobis distance scaled by feature count
        dist_sq = float(diff.T @ inv_loo @ diff)
        d_m = np.sqrt(max(0.0, dist_sq / n_features)) * 2.5
        loo_scores.append(float(-d_m))

    # Calibrate tau at the requested percentile of leave-one-out genuine scores
    tau = float(np.percentile(loo_scores, percentile))

    # Compute genuine scores on the full model
    genuine_scores: List[float] = []
    for i in range(n_samples):
        diff = X_scaled[i] - mean_scaled
        dist_sq = float(diff.T @ cov_inv @ diff)
        d_m = np.sqrt(max(0.0, dist_sq / n_features)) * 2.5
        genuine_scores.append(float(-d_m))

    # Enrollment-size sweep diagnostics: measure stability vs trial count
    trial_counts: List[int] = []
    stability_scores: List[float] = []
    for k in range(3, n_samples + 1):
        sub_mean = np.mean(X_scaled[:k], axis=0)
        sub_lw = LedoitWolf().fit(X_scaled[:k])
        sub_inv = np.linalg.pinv(sub_lw.covariance_)
        diff_all = X_scaled - sub_mean
        dist_matrix = np.sqrt(np.maximum(0.0, np.sum((diff_all @ sub_inv) * diff_all, axis=1) / n_features)) * 2.5
        trial_counts.append(k)
        stability_scores.append(float(-np.mean(dist_matrix)))

    return ModelExport(
        schemaVersion=1,
        modelType="mahalanobis_shrinkage",
        featureNames=feature_names,
        mean=[float(x) for x in scaling_mean],
        covInv=[[float(c) for c in row] for row in cov_inv],
        scalingMean=[float(x) for x in scaling_mean],
        scalingStd=[float(x) for x in scaling_std],
        tau=float(np.round(tau, 3)),
        diagnostics=Diagnostics(
            genuineScores=[float(np.round(s, 2)) for s in genuine_scores],
            looScores=[float(np.round(s, 2)) for s in loo_scores],
            trialCounts=trial_counts,
            stabilityScores=[float(np.round(s, 2)) for s in stability_scores]
        )
    )

def compute_model_score(model: ModelExport, features: Dict[str, float]) -> Tuple[float, float, bool]:
    """Scores an incoming feature vector against a fitted ModelExport."""
    feature_names = model.featureNames
    x_raw = np.array([float(features.get(name, 0.0)) for name in feature_names], dtype=np.float64)

    scaling_mean = np.array(model.scalingMean)
    scaling_std = np.array(model.scalingStd)
    x_scaled = (x_raw - scaling_mean) / scaling_std

    cov_inv = np.array(model.covInv)
    diff = x_scaled # standardized feature deviation from mean
    n_features = len(feature_names)

    dist_sq = float(diff.T @ cov_inv @ diff)
    d_m = float(np.sqrt(max(0.0, dist_sq / n_features)) * 2.5)
    score = float(-d_m)
    accepted = bool(score >= model.tau)

    return score, d_m, accepted

def generate_c_header_string(model: ModelExport) -> str:
    """Generates thenar_model.h for compiling directly into ESP32 firmware."""
    n = len(model.featureNames)
    lines: List[str] = [
        "/* Auto-generated by Thenar Enrollment Toolchain (Python FastAPI) */",
        "/* Single Source of Truth - Do not edit manually */",
        "#ifndef THENAR_MODEL_H",
        "#define THENAR_MODEL_H",
        "",
        f"#define THENAR_MODEL_SCHEMA_VERSION {model.schemaVersion}",
        f"#define THENAR_NUM_FEATURES {n}",
        f"#define THENAR_DECISION_TAU {model.tau:.6f}f",
        "",
        "/* Feature Order:"
    ]
    for i, name in enumerate(model.featureNames):
        lines.append(f" * [{i}] {name}")
    lines.append(" */")
    lines.append("")

    lines.append("static const float THENAR_FEATURE_MEANS[THENAR_NUM_FEATURES] = {")
    lines.append("    " + ", ".join(f"{x:.6f}f" for x in model.mean))
    lines.append("};")
    lines.append("")

    lines.append("static const float THENAR_SCALING_MEAN[THENAR_NUM_FEATURES] = {")
    lines.append("    " + ", ".join(f"{x:.6f}f" for x in model.scalingMean))
    lines.append("};")
    lines.append("")

    lines.append("static const float THENAR_SCALING_STD[THENAR_NUM_FEATURES] = {")
    lines.append("    " + ", ".join(f"{x:.6f}f" for x in model.scalingStd))
    lines.append("};")
    lines.append("")

    lines.append("static const float THENAR_COV_INV[THENAR_NUM_FEATURES][THENAR_NUM_FEATURES] = {")
    for r in range(n):
        row_str = ", ".join(f"{v:.6f}f" for v in model.covInv[r])
        comma = "," if r < n - 1 else ""
        lines.append(f"    {{ {row_str} }}{comma}")
    lines.append("};")
    lines.append("")
    lines.append("#endif /* THENAR_MODEL_H */")

    return "\n".join(lines)
